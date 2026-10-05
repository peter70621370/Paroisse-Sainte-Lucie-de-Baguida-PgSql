import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { HttpError } from '../utils/errors.js';
import { cleanHtml } from '../utils/html.js';
import { oneLine } from '../services/mail.js';

const email = z.string().trim().toLowerCase().email('Adresse e-mail invalide').max(191);
const token = z.string().regex(/^[0-9a-f]{48}$/, 'Lien invalide');
const csvCell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const textOf = (html: string) => html.replace(/<(br|\/p|\/h[1-6]|\/li)\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();

function newsletterMail(env: Env, subject: string, content: string, subscriberToken: string) {
  // Les images et liens relatifs de l'éditeur deviennent absolus (un e-mail n'a pas de « site courant »).
  const body = content.replace(/(src|href)="\/(?!\/)/g, `$1="${env.PUBLIC_URL}/`);
  const unsubscribe = `${env.PUBLIC_URL}/newsletter/desinscription?token=${subscriberToken}`;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#FAF6EC;font-family:Georgia,serif;color:#1e293b">
<div style="max-width:620px;margin:0 auto;background:#fff">
<div style="background:#1F3A5F;color:#E9D8A6;padding:18px 24px;font-size:20px;font-weight:bold">Paroisse Sainte Lucie de Baguida</div>
<div style="padding:24px;line-height:1.6"><h1 style="font-size:22px;color:#1F3A5F;margin:0 0 16px">${subject.replace(/</g, '&lt;')}</h1>${body}</div>
<div style="padding:16px 24px;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0">Vous recevez ce message car vous êtes inscrit à la lettre d'information de la paroisse.<br><a href="${unsubscribe}" style="color:#1F3A5F">Se désinscrire</a></div>
</div></body></html>`;
  return {
    html,
    text: `${textOf(body)}\n\n--\nParoisse Sainte Lucie de Baguida\nPour vous désinscrire : ${unsubscribe}`,
    headers: { 'List-Unsubscribe': `<${env.PUBLIC_URL}/api/newsletter/unsubscribe?token=${subscriberToken}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

/** Envoi en arrière-plan à tous les abonnés confirmés, un par un (limite les refus des serveurs SMTP). */
async function deliver(app: FastifyInstance, env: Env, id: number) {
  const n = await app.prisma.newsletter.findUniqueOrThrow({ where: { id } });
  const subs = await app.prisma.subscriber.findMany({ where: { confirmed: true, unsubscribedAt: null, token: { not: null } }, select: { email: true, token: true } });
  await app.prisma.newsletter.update({ where: { id }, data: { recipients: subs.length } });
  let sent = 0;
  for (const s of subs) {
    const mail = newsletterMail(env, n.subject, n.content, s.token!);
    await app.mailer.send({ to: s.email, subject: n.subject, ...mail });
    if (++sent % 10 === 0) await app.prisma.newsletter.update({ where: { id }, data: { sentCount: sent } });
  }
  await app.prisma.newsletter.update({ where: { id }, data: { sentCount: sent, status: 'SENT', sentAt: new Date() } });
}

const newsletter: FastifyPluginAsync<{ env: Env }> = async (app, { env }) => {
  const db = app.prisma;
  const guard = app.requireAuth(['ADMIN', 'EDITOR']);

  // ---------- Public : inscription en deux temps (double confirmation) ----------
  app.post('/newsletter/subscribe', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    if (typeof raw.website === 'string' && raw.website.trim() !== '') return reply.code(201).send({ ok: true }); // robot
    const body = z.object({ email, consent: z.literal(true, { errorMap: () => ({ message: 'Vous devez accepter de recevoir la lettre d\'information' }) }) }).parse(raw);

    // Réponse identique dans tous les cas : on ne révèle pas si une adresse est déjà inscrite.
    const existing = await db.subscriber.findUnique({ where: { email: body.email } });
    if (!existing || !existing.confirmed || existing.unsubscribedAt) {
      const tokenValue = existing?.token ?? randomBytes(24).toString('hex');
      await db.subscriber.upsert({
        where: { email: body.email },
        create: { email: body.email, token: tokenValue },
        update: { token: tokenValue, confirmed: false, unsubscribedAt: null },
      });
      void app.mailer.send({
        to: body.email,
        subject: 'Confirmez votre inscription à la lettre d\'information',
        text: `Bonjour,\n\nPour confirmer votre inscription à la lettre d'information de la paroisse Sainte Lucie de Baguida, ouvrez ce lien :\n${env.PUBLIC_URL}/newsletter/confirmer?token=${tokenValue}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message : vous ne recevrez rien.`,
      });
    }
    return reply.code(201).send({ ok: true });
  });

  app.post('/newsletter/confirm', { config: { rateLimit: { max: 20, timeWindow: '10 minutes' } } }, async (req) => {
    const { token: t } = z.object({ token }).parse(req.body);
    const { count } = await db.subscriber.updateMany({ where: { token: t }, data: { confirmed: true, unsubscribedAt: null } });
    if (!count) throw new HttpError(404, 'Lien invalide ou expiré');
    return { ok: true };
  });

  // Désinscription : accepte le jeton en JSON, ou en paramètre d'adresse (désinscription en un clic des messageries).
  app.post('/newsletter/unsubscribe', { config: { rateLimit: { max: 20, timeWindow: '10 minutes' } } }, async (req) => {
    const t = token.parse((req.query as { token?: string }).token ?? (req.body as { token?: string } | undefined)?.token);
    const { count } = await db.subscriber.updateMany({ where: { token: t }, data: { confirmed: false, unsubscribedAt: new Date() } });
    if (!count) throw new HttpError(404, 'Lien invalide');
    return { ok: true };
  });

  // ---------- Administration ----------
  app.get('/admin/subscribers/summary', { preHandler: guard }, async () => {
    const [confirmed, pending, unsubscribed] = await Promise.all([
      db.subscriber.count({ where: { confirmed: true, unsubscribedAt: null } }),
      db.subscriber.count({ where: { confirmed: false, unsubscribedAt: null } }),
      db.subscriber.count({ where: { unsubscribedAt: { not: null } } }),
    ]);
    return { confirmed, pending, unsubscribed };
  });

  const listQuery = z.object({
    status: z.enum(['confirmed', 'pending', 'unsubscribed']).optional(),
    q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  });
  const whereOf = (status?: string, q?: string) => ({
    ...(status === 'confirmed' ? { confirmed: true, unsubscribedAt: null } : status === 'pending' ? { confirmed: false, unsubscribedAt: null } : status === 'unsubscribed' ? { unsubscribedAt: { not: null } } : {}),
    ...(q ? { email: { contains: q } } : {}),
  });

  app.get('/admin/subscribers', { preHandler: guard }, async (req) => {
    const { status, q, page, pageSize } = listQuery.parse(req.query);
    const where = whereOf(status, q);
    const [total, items] = await Promise.all([
      db.subscriber.count({ where }),
      db.subscriber.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, email: true, confirmed: true, unsubscribedAt: true, createdAt: true } }),
    ]);
    return { total, page, pageSize, items };
  });

  app.get('/admin/subscribers/export.csv', { preHandler: guard }, async (req, reply) => {
    const { status, q } = listQuery.parse(req.query);
    const items = await db.subscriber.findMany({ where: whereOf(status, q), orderBy: { createdAt: 'desc' }, take: 20_000 });
    const csv = '﻿' + [['E-mail', 'Statut', 'Inscrit le'], ...items.map((s) => [s.email, s.unsubscribedAt ? 'Désinscrit' : s.confirmed ? 'Confirmé' : 'En attente de confirmation', s.createdAt.toISOString()])].map((r) => r.map(csvCell).join(';')).join('\r\n');
    return reply.header('Content-Type', 'text/csv; charset=utf-8').header('Content-Disposition', 'attachment; filename="abonnes.csv"').send(csv);
  });

  // Effacement d'un abonné (droit à l'effacement) : administrateur uniquement.
  app.delete('/admin/subscribers/:id', { preHandler: app.requireAuth(['ADMIN']) }, async (req) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const { count } = await db.subscriber.deleteMany({ where: { id } });
    if (!count) throw new HttpError(404, 'Abonné introuvable');
    return { ok: true };
  });

  const composeBody = z.object({ subject: z.string().trim().min(1).max(255), content: z.string().min(1).max(200_000).transform(cleanHtml) });

  app.get('/admin/newsletters', { preHandler: guard }, async () => ({
    items: await db.newsletter.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, subject: true, status: true, recipients: true, sentCount: true, createdAt: true, sentAt: true } }),
  }));

  app.get('/admin/newsletters/:id', { preHandler: guard }, async (req) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const item = await db.newsletter.findUnique({ where: { id } });
    if (!item) throw new HttpError(404, 'Introuvable');
    return { item };
  });

  // Envoi d'un test à une seule adresse (aperçu réel dans la boîte de réception).
  app.post('/admin/newsletters/test', { preHandler: guard }, async (req) => {
    const { to, ...c } = composeBody.extend({ to: email }).parse(req.body);
    const mail = newsletterMail(env, `[TEST] ${oneLine(c.subject)}`, c.content, '0'.repeat(48));
    await app.mailer.send({ to, subject: `[TEST] ${c.subject}`, ...mail });
    return { ok: true };
  });

  // Envoi à tous les abonnés confirmés (en arrière-plan : la réponse est immédiate).
  app.post('/admin/newsletters', { preHandler: guard, config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const c = composeBody.parse(req.body);
    const n = await db.newsletter.create({ data: { ...c, createdById: req.user!.id } });
    void deliver(app, env, n.id).catch((err) => app.log.error({ err, id: n.id }, 'Échec de l\'envoi de la newsletter'));
    return reply.code(202).send({ item: { id: n.id, status: n.status } });
  });
};

export default newsletter;
