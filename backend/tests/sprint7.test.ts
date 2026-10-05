import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../src/config/env.js';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';

describe.skipIf(!process.env.RUN_DB_TESTS)('sprint 7 : statistiques, newsletter, galerie, SEO', () => {
  const prisma = new PrismaClient();
  const tag = `s7${Date.now()}`;
  const pw = 'Test-Password-123!';
  const PUBLIC = 'https://site.test';
  let app: FastifyInstance;
  const cookie: Record<string, string> = {};
  let n = 0;
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  let visitorsBefore: { views: number; visitors: number } | null = null;

  const call = (method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, payload?: object, o: { who?: string; headers?: Record<string, string> } = {}) =>
    app.inject({ method, url, payload, headers: { 'x-forwarded-for': `10.40.${Math.floor(++n / 250)}.${n % 250}`, ...(o.who ? { cookie: cookie[o.who]! } : {}), ...o.headers } });
  const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36' };
  const UA_MOBILE = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1' };

  beforeAll(async () => {
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test', PUBLIC_URL: PUBLIC, PAYMENT_MODE: 'mock' }));
    const hash = await hashPassword(pw);
    for (const [key, role] of [['admin', 'ADMIN'], ['editor', 'EDITOR'], ['contrib', 'CONTRIBUTOR']] as const) {
      await prisma.user.create({ data: { email: `${tag}-${key}@example.test`, passwordHash: hash, firstName: key, lastName: 'T', role } });
      const res = await call('POST', '/api/auth/login', { email: `${tag}-${key}@example.test`, password: pw });
      cookie[key] = `sid=${res.cookies.find((c) => c.name === 'sid')!.value}`;
    }
    const row = await prisma.dailyVisitors.findUnique({ where: { day: today } });
    visitorsBefore = row ? { views: row.views, visitors: row.visitors } : null;
  });

  afterAll(async () => {
    await prisma.pageView.deleteMany({ where: { path: { startsWith: `/${tag}` } } });
    // Les compteurs du jour sont partagés : on les remet dans l'état d'avant les tests.
    if (visitorsBefore) await prisma.dailyVisitors.update({ where: { day: today }, data: visitorsBefore });
    else await prisma.dailyVisitors.deleteMany({ where: { day: today } });
    await prisma.album.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.subscriber.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.newsletter.deleteMany({ where: { subject: { startsWith: tag } } });
    await prisma.page.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.media.deleteMany({ where: { filename: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('statistiques anonymes', () => {
    it('compte les pages vues, normalise le chemin, détecte l\'appareil et le référent', async () => {
      const hit = (path: string, extra: object = {}, h: Record<string, string> = UA) => call('POST', '/api/analytics/hit', { path, ...extra }, { headers: h });
      expect((await hit(`/${tag}-a/?utm=1#x`, { referrer: 'https://www.google.com/search?q=x' })).statusCode).toBe(204);
      await hit(`/${tag}-a`, { referrer: `${PUBLIC}/accueil` }, { ...UA, host: 'site.test' });
      await hit(`/${tag}-m`, {}, UA_MOBILE);

      const rows = await prisma.pageView.findMany({ where: { path: { startsWith: `/${tag}` } }, orderBy: { path: 'asc' } });
      const a = rows.filter((r) => r.path === `/${tag}-a`);
      expect(a.reduce((s, r) => s + r.views, 0)).toBe(2); // « ?utm=1#x » et « / » final retirés
      expect(a.find((r) => r.referrer === 'google.com')).toBeTruthy(); // « www. » retiré
      expect(a.some((r) => r.referrer === 'site.test')).toBe(false); // son propre site n'est pas un référent
      expect(rows.find((r) => r.path === `/${tag}-m`)!.device).toBe('mobile');
    });

    it('ignore robots, « Ne pas me suivre », pages privées et données invalides', async () => {
      const count = () => prisma.pageView.count({ where: { path: { startsWith: `/${tag}` } } });
      const before = await count();
      await call('POST', '/api/analytics/hit', { path: `/${tag}-bot` }, { headers: { 'user-agent': 'Googlebot/2.1' } });
      await call('POST', '/api/analytics/hit', { path: `/${tag}-dnt` }, { headers: { ...UA, dnt: '1' } });
      await call('POST', '/api/analytics/hit', { path: `/${tag}-noua` }, { headers: { 'user-agent': '' } });
      expect((await call('POST', '/api/analytics/hit', { path: '/admin/users' }, { headers: UA })).statusCode).toBe(204);
      await call('POST', '/api/analytics/hit', { path: '/api/settings' }, { headers: UA });
      await call('POST', '/api/analytics/hit', { path: '/dons/merci' }, { headers: UA });
      expect((await call('POST', '/api/analytics/hit', { nimporte: 'quoi' }, { headers: UA })).statusCode).toBe(204);
      expect(await count()).toBe(before);
      expect(await prisma.pageView.count({ where: { path: { in: ['/admin/users', '/api/settings', '/dons/merci'] }, views: { gt: 0 } } })).toBe(0);
    });

    it('un même visiteur n\'est compté qu\'une fois par jour, sans rien stocker de personnel', async () => {
      const before = (await prisma.dailyVisitors.findUnique({ where: { day: today } }))!;
      const same = { 'x-forwarded-for': '10.77.0.1', ...UA };
      await call('POST', '/api/analytics/hit', { path: `/${tag}-v` }, { headers: same });
      await call('POST', '/api/analytics/hit', { path: `/${tag}-v2` }, { headers: same });
      await call('POST', '/api/analytics/hit', { path: `/${tag}-v` }, { headers: { ...same, 'x-forwarded-for': '10.77.0.2' } });
      const after = (await prisma.dailyVisitors.findUnique({ where: { day: today } }))!;
      expect(after.views - before.views).toBe(3);
      expect(after.visitors - before.visitors).toBe(2);
      // aucune colonne ne peut contenir d'IP ni d'identifiant
      expect(Object.keys(after).sort()).toEqual(['day', 'views', 'visitors']);
    });

    it('le tableau de bord est réservé aux administrateurs et éditeurs', async () => {
      expect((await call('GET', '/api/admin/analytics')).statusCode).toBe(401);
      expect((await call('GET', '/api/admin/analytics', undefined, { who: 'contrib' })).statusCode).toBe(403);
      const res = await call('GET', '/api/admin/analytics?days=7', undefined, { who: 'editor' });
      expect(res.statusCode).toBe(200);
      const j = res.json();
      expect(j.series).toHaveLength(7);
      expect(j.series.at(-1).day).toBe(today.toISOString().slice(0, 10));
      expect(j.topPages.some((p: { path: string }) => p.path.startsWith(`/${tag}`))).toBe(true);
      expect(j.totals.views).toBeGreaterThan(0);
      expect((await call('GET', '/api/admin/analytics?days=9999', undefined, { who: 'editor' })).statusCode).toBe(400);
    });
  });

  describe('newsletter', () => {
    const mail = (k: string) => `${tag}-${k}@example.test`;
    const subscribe = (k: string, over: object = {}) => call('POST', '/api/newsletter/subscribe', { email: mail(k), consent: true, ...over });
    const tokenOf = async (k: string) => (await prisma.subscriber.findUnique({ where: { email: mail(k) } }))!.token!;
    const mailsTo = (k: string) => app.mailer.outbox.filter((m) => m.to === mail(k));

    it('inscription en deux temps : rien n\'est envoyé avant la confirmation', async () => {
      const res = await subscribe('a');
      expect(res.statusCode).toBe(201);
      const sub = await prisma.subscriber.findUnique({ where: { email: mail('a') } });
      expect(sub).toMatchObject({ confirmed: false, unsubscribedAt: null });
      const confirmation = mailsTo('a').at(-1)!;
      expect(confirmation.text).toContain(`${PUBLIC}/newsletter/confirmer?token=${sub!.token}`);

      expect((await call('POST', '/api/newsletter/confirm', { token: 'x'.repeat(48) })).statusCode).toBe(400);
      expect((await call('POST', '/api/newsletter/confirm', { token: 'f'.repeat(48) })).statusCode).toBe(404);
      expect((await call('POST', '/api/newsletter/confirm', { token: sub!.token })).statusCode).toBe(200);
      expect((await prisma.subscriber.findUnique({ where: { email: mail('a') } }))!.confirmed).toBe(true);
    });

    it('ne révèle pas si une adresse est déjà inscrite et n\'envoie rien de plus', async () => {
      const before = mailsTo('a').length;
      const again = await subscribe('a');
      expect(again.statusCode).toBe(201);
      expect(again.json()).toEqual({ ok: true });
      expect(mailsTo('a').length).toBe(before); // déjà confirmé : aucun nouvel e-mail
    });

    it('exige le consentement et une adresse valide ; champ piège ignoré', async () => {
      expect((await subscribe('c', { consent: false })).statusCode).toBe(400);
      expect((await subscribe('c', { email: 'pas-un-email' })).statusCode).toBe(400);
      expect((await subscribe('bot', { website: 'http://spam' })).statusCode).toBe(201);
      expect(await prisma.subscriber.count({ where: { email: mail('bot') } })).toBe(0);
    });

    it('désinscription en un clic (jeton dans l\'adresse), puis réinscription', async () => {
      const t = await tokenOf('a');
      expect((await call('POST', `/api/newsletter/unsubscribe?token=${t}`)).statusCode).toBe(200);
      expect(await prisma.subscriber.findUnique({ where: { email: mail('a') } })).toMatchObject({ confirmed: false });
      expect((await prisma.subscriber.findUnique({ where: { email: mail('a') } }))!.unsubscribedAt).toBeTruthy();
      expect((await call('POST', '/api/newsletter/unsubscribe', { token: 'bad' })).statusCode).toBe(400);

      const before = mailsTo('a').length;
      await subscribe('a'); // réinscription : nouvelle confirmation demandée
      expect(mailsTo('a').length).toBe(before + 1);
      await call('POST', '/api/newsletter/confirm', { token: await tokenOf('a') });
    });

    it('administration : réservée aux éditeurs, effacement par un administrateur', async () => {
      expect((await call('GET', '/api/admin/subscribers', undefined, { who: 'contrib' })).statusCode).toBe(403);
      await subscribe('p'); // en attente
      const list = await call('GET', `/api/admin/subscribers?q=${tag}`, undefined, { who: 'editor' });
      expect(list.json().items.length).toBeGreaterThanOrEqual(2);
      const summary = (await call('GET', '/api/admin/subscribers/summary', undefined, { who: 'editor' })).json();
      expect(summary.pending).toBeGreaterThan(0);

      const csv = await call('GET', `/api/admin/subscribers/export.csv?q=${tag}`, undefined, { who: 'editor' });
      expect(csv.body.startsWith('﻿"E-mail"')).toBe(true);
      expect(csv.body).toContain(mail('a'));

      const id = list.json().items.find((s: { email: string }) => s.email === mail('p')).id;
      expect((await call('DELETE', `/api/admin/subscribers/${id}`, undefined, { who: 'editor' })).statusCode).toBe(403);
      expect((await call('DELETE', `/api/admin/subscribers/${id}`, undefined, { who: 'admin' })).statusCode).toBe(200);
      expect(await prisma.subscriber.count({ where: { email: mail('p') } })).toBe(0);
    });

    it('envoie la lettre aux seuls abonnés confirmés, avec lien de désinscription, HTML nettoyé', async () => {
      // 1 confirmé de plus, 1 en attente, 1 désinscrit
      await subscribe('b'); await call('POST', '/api/newsletter/confirm', { token: await tokenOf('b') });
      await subscribe('pending');
      await subscribe('gone'); const tg = await tokenOf('gone'); await call('POST', '/api/newsletter/confirm', { token: tg }); await call('POST', '/api/newsletter/unsubscribe', { token: tg });

      expect((await call('POST', '/api/admin/newsletters', { subject: 'x', content: '<p>x</p>' }, { who: 'contrib' })).statusCode).toBe(403);

      const subject = `${tag} Lettre d'octobre`;
      const start = app.mailer.outbox.length;
      const res = await call('POST', '/api/admin/newsletters', { subject, content: '<p>Bonjour</p><script>alert(1)</script><img src="/uploads/2026/10/a.webp"><a href="/agenda">Agenda</a>' }, { who: 'editor' });
      expect(res.statusCode).toBe(202);

      let item;
      for (let i = 0; i < 50; i++) {
        item = (await call('GET', `/api/admin/newsletters/${res.json().item.id}`, undefined, { who: 'editor' })).json().item;
        if (item.status === 'SENT') break;
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(item.status).toBe('SENT');
      expect(item.content).not.toContain('<script');

      const sent = app.mailer.outbox.slice(start).filter((m) => m.subject === subject && m.to.includes(tag));
      expect(sent.map((m) => m.to).sort()).toEqual([mail('a'), mail('b')].sort()); // ni « pending » ni « gone »
      const first = sent[0]!;
      expect(first.html).toContain(`src="${PUBLIC}/uploads/2026/10/a.webp"`); // liens rendus absolus
      expect(first.html).toContain(`href="${PUBLIC}/agenda"`);
      expect(first.html).toContain('/newsletter/desinscription?token=');
      expect(first.headers!['List-Unsubscribe']).toContain(`${PUBLIC}/api/newsletter/unsubscribe?token=`);
      expect(first.text).not.toContain('<');
    });

    it('envoi d\'un test à une seule adresse', async () => {
      const start = app.mailer.outbox.length;
      const res = await call('POST', '/api/admin/newsletters/test', { subject: `${tag} essai`, content: '<p>Aperçu</p>', to: mail('test') }, { who: 'editor' });
      expect(res.statusCode).toBe(200);
      const m = app.mailer.outbox.slice(start);
      expect(m).toHaveLength(1);
      expect(m[0]!.subject).toBe(`[TEST] ${tag} essai`);
    });
  });

  describe('galerie', () => {
    let imgId = 0;
    let pdfId = 0;
    let albumId = 0;
    const slug = `${tag}-fete`;

    it('crée un album (éditeur) et refuse un contributeur pour les photos', async () => {
      imgId = (await prisma.media.create({ data: { filename: `${tag}.webp`, storagePath: `${tag}/a.webp`, mimeType: 'image/webp', size: 1 } })).id;
      pdfId = (await prisma.media.create({ data: { filename: `${tag}.pdf`, storagePath: `${tag}/a.pdf`, mimeType: 'application/pdf', size: 1 } })).id;
      const res = await call('POST', '/api/admin/albums', { title: `${tag} Fête`, slug, date: '2026-10-04', status: 'PUBLISHED' }, { who: 'editor' });
      expect(res.statusCode).toBe(201);
      albumId = res.json().item.id;
      expect((await call('POST', `/api/admin/albums/${albumId}/items`, { mediaId: imgId }, { who: 'contrib' })).statusCode).toBe(403);
      expect((await call('POST', '/api/admin/albums', { title: 'x', slug: 'Slug Invalide' }, { who: 'editor' })).statusCode).toBe(400);
      expect((await call('POST', '/api/admin/albums', { title: 'x', slug: `${tag}-c`, coverId: pdfId }, { who: 'editor' })).statusCode).toBe(400); // couverture = image
    });

    it('ajoute photos et vidéos avec validation, puis réordonne', async () => {
      const add = (body: object) => call('POST', `/api/admin/albums/${albumId}/items`, body, { who: 'editor' });
      expect((await add({ mediaId: pdfId })).statusCode).toBe(400); // pas une image
      expect((await add({ videoUrl: 'javascript:alert(1)' })).statusCode).toBe(400);
      expect((await add({})).statusCode).toBe(400);
      expect((await add({ mediaId: imgId, videoUrl: 'https://youtu.be/abcdefghijk' })).statusCode).toBe(400); // l'un ou l'autre
      const photo = await add({ mediaId: imgId, caption: 'Procession' });
      const video = await add({ videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk', caption: 'Messe' });
      expect(photo.statusCode).toBe(201);
      expect(photo.json().item).toMatchObject({ type: 'image', url: `/uploads/${tag}/a.webp`, caption: 'Procession' });
      expect(video.json().item.type).toBe('video');

      const ids = [video.json().item.id, photo.json().item.id];
      expect((await call('POST', `/api/admin/albums/${albumId}/items/reorder`, { ids }, { who: 'editor' })).statusCode).toBe(200);
      const detail = (await call('GET', `/api/admin/albums/${albumId}`, undefined, { who: 'editor' })).json().item;
      expect(detail.items.map((i: { id: number }) => i.id)).toEqual(ids);
      expect((await call('POST', `/api/admin/albums/${albumId}/items/reorder`, { ids: [999999] }, { who: 'editor' })).statusCode).toBe(400);
    });

    it('côté public : albums publiés seulement, couverture = première photo', async () => {
      await call('POST', '/api/admin/albums', { title: `${tag} Brouillon`, slug: `${tag}-brouillon` }, { who: 'editor' });
      const list = (await call('GET', '/api/albums')).json().items.filter((a: { slug: string }) => a.slug.startsWith(tag));
      expect(list.map((a: { slug: string }) => a.slug)).toEqual([slug]);
      expect(list[0]).toMatchObject({ count: 2, cover: { url: `/uploads/${tag}/a.webp` } });

      const one = (await call('GET', `/api/albums/${slug}`)).json().album;
      expect(one.items).toHaveLength(2);
      expect((await call('GET', `/api/albums/${tag}-brouillon`)).statusCode).toBe(404);
    });

    it('un fichier utilisé dans un album ne peut pas être supprimé ; légende modifiable ; suppression d\'élément', async () => {
      expect((await call('DELETE', `/api/admin/media/${imgId}`, undefined, { who: 'editor' })).statusCode).toBe(409);
      const item = (await call('GET', `/api/admin/albums/${albumId}`, undefined, { who: 'editor' })).json().item.items[0];
      expect((await call('PATCH', `/api/admin/albums/items/${item.id}`, { caption: 'Nouvelle légende' }, { who: 'editor' })).json().item.caption).toBe('Nouvelle légende');
      expect((await call('DELETE', `/api/admin/albums/items/${item.id}`, undefined, { who: 'editor' })).statusCode).toBe(200);
      expect((await call('DELETE', `/api/admin/albums/items/${item.id}`, undefined, { who: 'editor' })).statusCode).toBe(404);
    });
  });

  describe('SEO et messe en direct', () => {
    it('le sitemap liste les contenus publiés et pas les brouillons', async () => {
      await prisma.page.createMany({
        data: [
          { slug: `${tag}-pub`, locale: 'fr', title: 'P', content: '', status: 'PUBLISHED', publishedAt: new Date() },
          { slug: `${tag}-pub`, locale: 'ee', title: 'P', content: '', status: 'PUBLISHED', publishedAt: new Date() },
          { slug: `${tag}-draft`, locale: 'fr', title: 'D', content: '', status: 'DRAFT' },
          { slug: `${tag}-future`, locale: 'fr', title: 'F', content: '', status: 'PUBLISHED', publishedAt: new Date(Date.now() + 86_400_000) },
        ],
      });
      const sm = (await call('GET', '/api/sitemap')).json();
      const mine = sm.pages.filter((p: { slug: string }) => p.slug.startsWith(tag)).map((p: { slug: string; locale: string }) => `${p.slug}:${p.locale}`).sort();
      expect(mine).toEqual([`${tag}-pub:ee`, `${tag}-pub:fr`]);
      expect(sm).toHaveProperty('events');
      expect(sm).toHaveProperty('albums');
    });

    it('langues disponibles d\'une page', async () => {
      expect((await call('GET', `/api/pages/${tag}-pub/locales`)).json().locales).toEqual(['ee', 'fr']);
      expect((await call('GET', `/api/pages/${tag}-draft/locales`)).json().locales).toEqual([]);
    });

    it('lien de messe en direct : http(s) uniquement', async () => {
      const put = (v: string) => call('PUT', '/api/admin/settings', { 'live.url': v }, { who: 'editor' });
      expect((await put('javascript:alert(1)')).statusCode).toBe(400);
      expect((await put('ftp://x')).statusCode).toBe(400);
      expect((await put('https://www.youtube.com/watch?v=abcdefghijk')).statusCode).toBe(200);
      expect((await call('GET', '/api/settings')).json().settings['live.url']).toContain('youtube.com');
      expect((await put('')).statusCode).toBe(200); // remis à vide : pas de donnée de test dans la base
    });
  });
});
