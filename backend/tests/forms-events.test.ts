import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../src/config/env.js';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';

describe.skipIf(!process.env.RUN_DB_TESTS)('formulaires et agenda', () => {
  const prisma = new PrismaClient();
  const tag = `fe${Date.now()}`;
  const pw = 'Test-Password-123!';
  let app: FastifyInstance;
  const cookie: Record<string, string> = {};
  const created = { submissions: [] as number[] };

  // Chaque appel vient d'une IP distincte (X-Forwarded-For) : la limitation de débit est par IP, partagée par tous les formulaires.
  let n = 0;
  const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, who?: string, payload?: object, ip = `10.20.${Math.floor(++n / 250)}.${n % 250}`) =>
    app.inject({ method, url, headers: { 'x-forwarded-for': ip, ...(who ? { cookie: cookie[who]! } : {}) }, payload });

  const contact = (over: object = {}) => ({
    fullName: `${tag} Marie`, email: `${tag}@example.test`, message: 'Bonjour, une question sur la catéchèse.', consent: true, ...over,
  });

  beforeAll(async () => {
    // NOTIFY_EMAIL pour que les notifications partent vers l'outbox de test
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test', NOTIFY_EMAIL: 'secretariat@example.test' }));
    const hash = await hashPassword(pw);
    for (const [key, role] of [['admin', 'ADMIN'], ['editor', 'EDITOR'], ['contrib', 'CONTRIBUTOR']] as const) {
      await prisma.user.create({ data: { email: `${tag}-${key}@example.test`, passwordHash: hash, firstName: key, lastName: 'T', role } });
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: `${tag}-${key}@example.test`, password: pw } });
      cookie[key] = `sid=${res.cookies.find((c) => c.name === 'sid')!.value}`;
    }
  });

  afterAll(async () => {
    await prisma.formSubmission.deleteMany({ where: { OR: [{ fullName: { startsWith: tag } }, { email: { startsWith: tag } }] } });
    await prisma.event.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.eventCategory.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('formulaires publics', () => {
    it('enregistre une demande de contact, prévient le secrétariat et accuse réception', async () => {
      const before = app.mailer.outbox.length;
      const res = await call('POST', '/api/forms/contact', undefined, contact());
      expect(res.statusCode).toBe(201);
      const row = await prisma.formSubmission.findFirst({ where: { email: `${tag}@example.test` } });
      expect(row?.type).toBe('CONTACT');
      expect(row?.status).toBe('NEW');
      expect((row?.payload as Record<string, unknown>).consent).toBeUndefined(); // le consentement n'est pas stocké comme donnée métier

      const mails = app.mailer.outbox.slice(before);
      expect(mails.map((m) => m.to).sort()).toEqual([`${tag}@example.test`, 'secretariat@example.test'].sort());
      const notif = mails.find((m) => m.to === 'secretariat@example.test')!;
      expect(notif.replyTo).toBe(`${tag}@example.test`);
      expect(notif.text).toContain('catéchèse');
    });

    it('refuse sans consentement, e-mail invalide ou message trop court', async () => {
      expect((await call('POST', '/api/forms/contact', undefined, contact({ consent: false }))).statusCode).toBe(400);
      expect((await call('POST', '/api/forms/contact', undefined, contact({ email: 'pas-un-email' }))).statusCode).toBe(400);
      const short = await call('POST', '/api/forms/contact', undefined, contact({ message: 'court' }));
      expect(short.statusCode).toBe(400);
      expect(short.json().details.message).toBeTruthy();
    });

    it('champ piège : réponse « succès » mais rien d\'enregistré ni envoyé', async () => {
      const before = app.mailer.outbox.length;
      const res = await call('POST', '/api/forms/contact', undefined, contact({ fullName: `${tag} Robot`, website: 'http://spam.example' }));
      expect(res.statusCode).toBe(201);
      expect(await prisma.formSubmission.count({ where: { fullName: `${tag} Robot` } })).toBe(0);
      expect(app.mailer.outbox.length).toBe(before);
    });

    it('neutralise l\'injection d\'en-têtes e-mail dans le nom', async () => {
      await call('POST', '/api/forms/contact', undefined, contact({ fullName: `${tag} Eve\r\nBcc: pirate@example.test` }));
      const notif = app.mailer.outbox.filter((m) => m.subject.includes(tag) && m.subject.includes('Eve')).at(-1)!;
      expect(notif.subject).not.toMatch(/[\r\n]/);
    });

    it('adhésion / intention / sacrement : e-mail ou téléphone obligatoire', async () => {
      const base = { fullName: `${tag} Paul`, consent: true };
      expect((await call('POST', '/api/forms/membership', undefined, base)).statusCode).toBe(400);
      expect((await call('POST', '/api/forms/membership', undefined, { ...base, phone: '+228 90 00 00 00' })).statusCode).toBe(201);
      expect((await call('POST', '/api/forms/mass-intention', undefined, { ...base, phone: '90000000', intentionType: 'DECEASED', intention: 'Pour Jean' })).statusCode).toBe(201);
      expect((await call('POST', '/api/forms/mass-intention', undefined, { ...base, phone: '90000000', intentionType: 'AUTRE', intention: 'x y z' })).statusCode).toBe(400);
      expect((await call('POST', '/api/forms/sacrament', undefined, { ...base, phone: '90000000', sacrament: 'MARRIAGE' })).statusCode).toBe(201);
    });

    it('inscription au catéchisme et formulaire inconnu', async () => {
      const ok = await call('POST', '/api/forms/catechism', undefined, {
        childName: `${tag} Enfant`, birthDate: '2016-05-04', level: 'Première communion', parentName: `${tag} Parent`, phone: '90000000', consent: true,
      });
      expect(ok.statusCode).toBe(201);
      expect((await call('POST', '/api/forms/catechism', undefined, { childName: 'x' })).statusCode).toBe(400);
      expect((await call('POST', '/api/forms/inconnu', undefined, {})).statusCode).toBe(404);
    });

    it('limite le nombre d\'envois par adresse IP', async () => {
      const codes: number[] = [];
      for (let i = 0; i < 7; i++) codes.push((await call('POST', '/api/forms/mass-intention', undefined, { fullName: 'x' }, '10.99.99.99')).statusCode);
      expect(codes.slice(0, 5)).toEqual([400, 400, 400, 400, 400]); // validées (donc comptées), puis bloquées
      expect(codes.slice(5)).toEqual([429, 429]);
    });
  });

  describe('demandes reçues (back-office)', () => {
    let id = 0;

    it('est interdit aux contributeurs et aux visiteurs', async () => {
      expect((await call('GET', '/api/admin/submissions')).statusCode).toBe(401);
      expect((await call('GET', '/api/admin/submissions', 'contrib')).statusCode).toBe(403);
      expect((await call('GET', '/api/admin/submissions/export.csv', 'contrib')).statusCode).toBe(403);
    });

    it('liste, détaille et traite une demande', async () => {
      const list = await call('GET', `/api/admin/submissions?type=CONTACT&q=${tag}`, 'editor');
      expect(list.statusCode).toBe(200);
      const mine = list.json().items.find((s: { email: string }) => s.email === `${tag}@example.test`);
      id = mine.id;
      expect(mine.typeLabel).toBe('Message de contact');

      const detail = await call('GET', `/api/admin/submissions/${id}`, 'editor');
      expect(detail.json().item.details.find((d: { key: string }) => d.key === 'message').value).toContain('catéchèse');

      const summary = (await call('GET', '/api/admin/submissions/summary', 'editor')).json();
      expect(summary.new).toBeGreaterThan(0);

      expect((await call('PATCH', `/api/admin/submissions/${id}`, 'editor', { status: 'PROCESSED' })).statusCode).toBe(200);
      const after = (await call('GET', `/api/admin/submissions/${id}`, 'editor')).json().item;
      expect(after.status).toBe('PROCESSED');
      expect(after.handledBy).toBe('editor T');
      expect((await call('PATCH', `/api/admin/submissions/${id}`, 'editor', { status: 'BIDON' })).statusCode).toBe(400);
    });

    it('exporte en CSV en neutralisant les formules', async () => {
      await call('POST', '/api/forms/contact', undefined, contact({ fullName: '=HYPERLINK("http://evil")', email: `${tag}b@example.test` }));
      const res = await call('GET', '/api/admin/submissions/export.csv?type=CONTACT', 'editor');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.body.startsWith('﻿"Date";"Type"')).toBe(true);
      expect(res.body).toContain(`"'=HYPERLINK(`); // préfixe apostrophe : la cellule reste du texte
      expect(res.body).not.toMatch(/(^|;)"=HYPERLINK/m); // jamais de cellule commençant par =
    });

    it('seul un administrateur supprime', async () => {
      expect((await call('DELETE', `/api/admin/submissions/${id}`, 'editor')).statusCode).toBe(403);
      expect((await call('DELETE', `/api/admin/submissions/${id}`, 'admin')).statusCode).toBe(200);
      expect((await call('GET', `/api/admin/submissions/${id}`, 'admin')).statusCode).toBe(404);
    });
  });

  describe('agenda', () => {
    let catId = 0;
    const d = (days: number, h = 10) => new Date(Date.UTC(2031, 5, 10 + days, h)).toISOString();

    it('catégories : réservées aux éditeurs', async () => {
      expect((await call('POST', '/api/admin/event-categories', 'contrib', { name: 'x', slug: `${tag}-x` })).statusCode).toBe(403);
      const ok = await call('POST', '/api/admin/event-categories', 'editor', { name: `${tag} Fête`, slug: `${tag}-fete`, color: '#112233' });
      expect(ok.statusCode).toBe(201);
      catId = ok.json().item.id;
      expect((await call('POST', '/api/admin/event-categories', 'editor', { name: 'x', slug: `${tag}-y`, color: 'rouge' })).statusCode).toBe(400);
    });

    it('refuse une fin avant le début et une catégorie inconnue', async () => {
      const bad = await call('POST', '/api/admin/events', 'editor', { title: `${tag} X`, startsAt: d(0), endsAt: d(-1) });
      expect(bad.statusCode).toBe(400);
      const badCat = await call('POST', '/api/admin/events', 'editor', { title: `${tag} X`, startsAt: d(0), categoryId: 999999 });
      expect(badCat.statusCode).toBe(400);
    });

    it('un brouillon est invisible, un événement publié apparaît dans sa période', async () => {
      await call('POST', '/api/admin/events', 'editor', { title: `${tag} Brouillon`, startsAt: d(1) });
      const pub = await call('POST', '/api/admin/events', 'editor', { title: `${tag} Fête patronale`, startsAt: d(2), endsAt: d(3), categoryId: catId, status: 'PUBLISHED', location: 'Église' });
      expect(pub.statusCode).toBe(201);
      await call('POST', '/api/admin/events', 'editor', { title: `${tag} Hors période`, startsAt: d(60), status: 'PUBLISHED' });

      const range = await call('GET', '/api/events?from=2031-06-01&to=2031-06-30');
      const titles = range.json().items.map((e: { title: string }) => e.title).filter((t: string) => t.startsWith(tag));
      expect(titles).toEqual([`${tag} Fête patronale`]);
      expect(range.json().items[0].category.slug).toBe(`${tag}-fete`);

      const byCat = await call('GET', `/api/events?from=2031-06-01&to=2031-06-30&category=${tag}-fete`);
      expect(byCat.json().items).toHaveLength(1);
      const other = await call('GET', '/api/events?from=2031-06-01&to=2031-06-30&category=inexistante');
      expect(other.json().items).toHaveLength(0);

      expect((await call('GET', `/api/events/${pub.json().item.id}`)).statusCode).toBe(200);
    });

    it('un événement qui chevauche le début de la période est inclus', async () => {
      await call('POST', '/api/admin/events', 'editor', { title: `${tag} Camp`, startsAt: d(-5), endsAt: d(5), status: 'PUBLISHED' });
      const res = await call('GET', '/api/events?from=2031-06-12&to=2031-06-13');
      expect(res.json().items.some((e: { title: string }) => e.title === `${tag} Camp`)).toBe(true);
    });

    it('refuse une période invalide', async () => {
      expect((await call('GET', '/api/events?from=2031-06-10&to=2031-06-01')).statusCode).toBe(400);
      expect((await call('GET', '/api/events?from=2030-01-01&to=2032-12-31')).statusCode).toBe(400);
      expect((await call('GET', '/api/events?from=hier')).statusCode).toBe(400);
    });
  });
});
