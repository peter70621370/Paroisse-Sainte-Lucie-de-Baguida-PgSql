import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../src/config/env.js';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';
import { cleanHtml } from '../src/utils/html.js';

describe('cleanHtml', () => {
  it('retire scripts, attributs d\'événement et liens javascript:', () => {
    const out = cleanHtml('<p onclick="x()">ok</p><script>alert(1)</script><img src="/uploads/a.webp" onerror="x()"><a href="javascript:alert(1)">l</a><iframe src="https://evil"></iframe>');
    expect(out).toContain('<p>ok</p>');
    expect(out).toContain('src="/uploads/a.webp"');
    expect(out).not.toMatch(/script|onclick|onerror|javascript:|iframe/i);
  });
  it('force rel sur les liens externes', () => {
    expect(cleanHtml('<a href="https://x.org" target="_blank">x</a>')).toContain('rel="noopener noreferrer nofollow"');
  });
});

describe.skipIf(!process.env.RUN_DB_TESTS)('contenus paroissiaux', () => {
  const prisma = new PrismaClient();
  const tag = `ct${Date.now()}`;
  const pw = 'Test-Password-123!';
  let app: FastifyInstance;
  const cookie: Record<string, string> = {};
  const userIds: Record<string, number> = {};
  let pdfId = 0;
  let imgId = 0;

  const req = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT', url: string, who?: string, payload?: object) =>
    app.inject({ method, url, headers: who ? { cookie: cookie[who]! } : {}, payload });

  beforeAll(async () => {
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test' }));
    const hash = await hashPassword(pw);
    for (const [key, role] of [['editor', 'EDITOR'], ['contrib', 'CONTRIBUTOR'], ['contrib2', 'CONTRIBUTOR']] as const) {
      const u = await prisma.user.create({ data: { email: `${tag}-${key}@example.test`, passwordHash: hash, firstName: key, lastName: 'T', role } });
      userIds[key] = u.id;
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: u.email, password: pw } });
      cookie[key] = `sid=${res.cookies.find((c) => c.name === 'sid')!.value}`;
    }
    pdfId = (await prisma.media.create({ data: { filename: `${tag}.pdf`, storagePath: `${tag}/a.pdf`, mimeType: 'application/pdf', size: 1 } })).id;
    imgId = (await prisma.media.create({ data: { filename: `${tag}.webp`, storagePath: `${tag}/a.webp`, mimeType: 'image/webp', size: 1 } })).id;
  });

  afterAll(async () => {
    await prisma.page.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.announcement.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.bulletin.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.homily.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.massSchedule.deleteMany({ where: { notes: { startsWith: tag } } });
    await prisma.staffMember.deleteMany({ where: { fullName: { startsWith: tag } } });
    await prisma.media.deleteMany({ where: { filename: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('pages', () => {
    it('refuse sans connexion', async () => {
      expect((await req('GET', '/api/admin/pages')).statusCode).toBe(401);
    });

    it('nettoie le HTML à l\'enregistrement', async () => {
      const res = await req('POST', '/api/admin/pages', 'editor', {
        slug: `${tag}-xss`, title: `${tag} xss`, content: '<p>Bonjour</p><script>alert(1)</script>',
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().item.content).toBe('<p>Bonjour</p>');
      expect(res.json().item.status).toBe('DRAFT');
    });

    it('valide le slug et refuse un doublon', async () => {
      expect((await req('POST', '/api/admin/pages', 'editor', { slug: 'Slug Invalide!', title: 'x', content: '' })).statusCode).toBe(400);
      const body = { slug: `${tag}-dup`, title: 'Dup', content: '<p>a</p>' };
      expect((await req('POST', '/api/admin/pages', 'editor', body)).statusCode).toBe(201);
      expect((await req('POST', '/api/admin/pages', 'editor', body)).statusCode).toBe(409);
      // même slug mais autre langue : autorisé
      expect((await req('POST', '/api/admin/pages', 'editor', { ...body, locale: 'ee' })).statusCode).toBe(201);
    });

    it('publication, brouillon et publication programmée côté public', async () => {
      const base = { content: '<p>x</p>' };
      await req('POST', '/api/admin/pages', 'editor', { ...base, slug: `${tag}-draft`, title: 'Brouillon' });
      const pub = await req('POST', '/api/admin/pages', 'editor', { ...base, slug: `${tag}-pub`, title: 'Publiée', status: 'PUBLISHED' });
      expect(pub.json().item.publishedAt).toBeTruthy(); // date posée automatiquement
      const future = new Date(Date.now() + 86_400_000).toISOString();
      await req('POST', '/api/admin/pages', 'editor', { ...base, slug: `${tag}-future`, title: 'Future', status: 'PUBLISHED', publishedAt: future });

      expect((await req('GET', `/api/pages/${tag}-pub`)).statusCode).toBe(200);
      expect((await req('GET', `/api/pages/${tag}-draft`)).statusCode).toBe(404);
      expect((await req('GET', `/api/pages/${tag}-future`)).statusCode).toBe(404);
    });
  });

  describe('droits des contributeurs', () => {
    let draftId = 0;

    it('peut créer un brouillon mais pas publier', async () => {
      const ok = await req('POST', '/api/admin/announcements', 'contrib', { title: `${tag} annonce`, content: '<p>a</p>' });
      expect(ok.statusCode).toBe(201);
      draftId = ok.json().item.id;
      expect(ok.json().item.authorId).toBe(userIds.contrib);

      const bad = await req('POST', '/api/admin/announcements', 'contrib', { title: `${tag} annonce2`, content: '', status: 'PUBLISHED' });
      expect(bad.statusCode).toBe(403);
      expect((await req('PATCH', `/api/admin/announcements/${draftId}`, 'contrib', { status: 'PUBLISHED' })).statusCode).toBe(403);
    });

    it('ne peut pas modifier le brouillon d\'un autre, ni supprimer', async () => {
      expect((await req('PATCH', `/api/admin/announcements/${draftId}`, 'contrib2', { title: `${tag} piraté` })).statusCode).toBe(403);
      expect((await req('PATCH', `/api/admin/announcements/${draftId}`, 'contrib', { title: `${tag} modifié` })).statusCode).toBe(200);
      expect((await req('DELETE', `/api/admin/announcements/${draftId}`, 'contrib')).statusCode).toBe(403);
    });

    it('ne peut pas gérer horaires ni personnel', async () => {
      expect((await req('POST', '/api/admin/mass-schedules', 'contrib', { weekday: 'SUNDAY', time: '09:00' })).statusCode).toBe(403);
      expect((await req('POST', '/api/admin/staff', 'contrib', { fullName: `${tag} x`, function: 'Curé' })).statusCode).toBe(403);
    });

    it('un éditeur peut publier ce brouillon, puis le contributeur ne peut plus le modifier', async () => {
      const res = await req('PATCH', `/api/admin/announcements/${draftId}`, 'editor', { status: 'PUBLISHED' });
      expect(res.statusCode).toBe(200);
      expect(res.json().item.publishedAt).toBeTruthy();
      expect((await req('PATCH', `/api/admin/announcements/${draftId}`, 'contrib', { title: `${tag} encore` })).statusCode).toBe(403);
    });
  });

  describe('annonces publiques', () => {
    it('masque les annonces expirées et place les épinglées en premier', async () => {
      const past = new Date(Date.now() - 86_400_000).toISOString();
      await req('POST', '/api/admin/announcements', 'editor', { title: `${tag} expirée`, content: '', status: 'PUBLISHED', expiresAt: past });
      await req('POST', '/api/admin/announcements', 'editor', { title: `${tag} épinglée`, content: '', status: 'PUBLISHED', pinned: true });
      const res = await req('GET', '/api/announcements');
      const titles: string[] = res.json().items.map((a: { title: string }) => a.title).filter((t: string) => t.startsWith(tag));
      expect(titles).not.toContain(`${tag} expirée`);
      expect(titles[0]).toBe(`${tag} épinglée`);
    });
  });

  describe('bulletins', () => {
    it('exige un PDF de la médiathèque', async () => {
      const bad = await req('POST', '/api/admin/bulletins', 'editor', { title: `${tag} b`, date: '2026-10-04', fileId: imgId });
      expect(bad.statusCode).toBe(400);
      const none = await req('POST', '/api/admin/bulletins', 'editor', { title: `${tag} b`, date: '2026-10-04', fileId: 999999 });
      expect(none.statusCode).toBe(400);
    });

    it('publie un bulletin visible avec son lien, et protège le fichier utilisé', async () => {
      const ok = await req('POST', '/api/admin/bulletins', 'editor', { title: `${tag} bulletin`, date: '2026-10-04', fileId: pdfId, status: 'PUBLISHED' });
      expect(ok.statusCode).toBe(201);
      expect(ok.json().item.file.url).toBe(`/uploads/${tag}/a.pdf`);

      const list = await req('GET', '/api/bulletins');
      const mine = list.json().items.find((b: { title: string }) => b.title === `${tag} bulletin`);
      expect(mine.file.url).toBe(`/uploads/${tag}/a.pdf`);

      const del = await req('DELETE', `/api/admin/media/${pdfId}`, 'editor');
      expect(del.statusCode).toBe(409);
    });

    it('refuse une date mal formée', async () => {
      const res = await req('POST', '/api/admin/bulletins', 'editor', { title: `${tag} b`, date: '04/10/2026', fileId: pdfId });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('horaires des messes', () => {
    it('valide l\'heure, liste les actifs dans l\'ordre de la semaine', async () => {
      expect((await req('POST', '/api/admin/mass-schedules', 'editor', { weekday: 'SUNDAY', time: '25:00' })).statusCode).toBe(400);
      expect((await req('POST', '/api/admin/mass-schedules', 'editor', { weekday: 'SUNDAY', time: '9h' })).statusCode).toBe(400);

      await req('POST', '/api/admin/mass-schedules', 'editor', { weekday: 'SUNDAY', time: '08:00', notes: `${tag} dim` });
      await req('POST', '/api/admin/mass-schedules', 'editor', { weekday: 'MONDAY', time: '18:30', notes: `${tag} lun` });
      await req('POST', '/api/admin/mass-schedules', 'editor', { weekday: 'TUESDAY', time: '18:30', notes: `${tag} mar`, active: false });

      const items = (await req('GET', '/api/mass-schedules')).json().items.filter((i: { notes: string | null }) => i.notes?.startsWith(tag));
      expect(items.map((i: { notes: string }) => i.notes)).toEqual([`${tag} lun`, `${tag} dim`]); // lundi avant dimanche, mardi inactif exclu
    });
  });

  describe('personnel pastoral', () => {
    it('la photo doit être une image', async () => {
      expect((await req('POST', '/api/admin/staff', 'editor', { fullName: `${tag} abbé`, function: 'Curé', photoId: pdfId })).statusCode).toBe(400);
      const ok = await req('POST', '/api/admin/staff', 'editor', { fullName: `${tag} abbé`, function: 'Curé', photoId: imgId });
      expect(ok.statusCode).toBe(201);
      const pub = (await req('GET', '/api/staff')).json().items.find((s: { fullName: string }) => s.fullName === `${tag} abbé`);
      expect(pub.photo.url).toBe(`/uploads/${tag}/a.webp`);
      expect(pub).not.toHaveProperty('sortOrder');
    });
  });

  describe('homélies', () => {
    it('refuse une URL non http(s)', async () => {
      const res = await req('POST', '/api/admin/homilies', 'editor', { title: `${tag} h`, date: '2026-10-04', videoUrl: 'javascript:alert(1)' });
      expect(res.statusCode).toBe(400);
    });

    it('publie une homélie et la sert au public', async () => {
      const ok = await req('POST', '/api/admin/homilies', 'editor', {
        title: `${tag} homélie`, date: '2026-10-04', preacher: 'Abbé X', content: '<p>Texte</p>', videoUrl: 'https://www.youtube.com/watch?v=abc', status: 'PUBLISHED',
      });
      expect(ok.statusCode).toBe(201);
      const one = await req('GET', `/api/homilies/${ok.json().item.id}`);
      expect(one.statusCode).toBe(200);
      expect(one.json().homily.videoUrl).toBe('https://www.youtube.com/watch?v=abc');
    });
  });
});
