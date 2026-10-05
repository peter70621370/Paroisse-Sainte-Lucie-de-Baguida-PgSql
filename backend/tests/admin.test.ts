import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../src/config/env.js';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';

function multipart(filename: string, content: Buffer, contentType = 'application/octet-stream') {
  const boundary = '----test' + Math.random().toString(16).slice(2);
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
  const payload = Buffer.concat([Buffer.from(head), content, Buffer.from(`\r\n--${boundary}--\r\n`)]);
  return { payload, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

describe.skipIf(!process.env.RUN_DB_TESTS)('back-office : utilisateurs, médiathèque, paramètres', () => {
  const prisma = new PrismaClient();
  const tag = `adm-${Date.now()}`;
  const pw = 'Test-Password-123!';
  const emails = { admin: `${tag}-a@example.test`, editor: `${tag}-e@example.test`, contrib: `${tag}-c@example.test` };
  let app: FastifyInstance;
  let uploadDir: string;
  const cookies: Record<string, string> = {};
  const ids: Record<string, number> = {};

  const login = async (email: string, password = pw) => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
    return res.cookies.find((c) => c.name === 'sid') ? `sid=${res.cookies.find((c) => c.name === 'sid')!.value}` : '';
  };

  beforeAll(async () => {
    uploadDir = await mkdtemp(path.join(tmpdir(), 'uploads-'));
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test', UPLOAD_DIR: uploadDir }));
    const hash = await hashPassword(pw);
    for (const [key, role] of [['admin', 'ADMIN'], ['editor', 'EDITOR'], ['contrib', 'CONTRIBUTOR']] as const) {
      const u = await prisma.user.create({
        data: { email: emails[key], passwordHash: hash, firstName: key, lastName: 'Test', role },
      });
      ids[key] = u.id;
      cookies[key] = await login(emails[key]);
    }
  });

  afterAll(async () => {
    await prisma.media.deleteMany({ where: { uploadedBy: { email: { startsWith: tag } } } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
    await app.close();
    await rm(uploadDir, { recursive: true, force: true });
  });

  describe('utilisateurs', () => {
    it('crée un utilisateur (admin) et refuse aux autres rôles', async () => {
      const body = { email: `${tag}-new@example.test`, firstName: 'N', lastName: 'Nouveau', role: 'EDITOR', password: pw };
      const denied = await app.inject({ method: 'POST', url: '/api/admin/users', headers: { cookie: cookies.editor! }, payload: body });
      expect(denied.statusCode).toBe(403);

      const ok = await app.inject({ method: 'POST', url: '/api/admin/users', headers: { cookie: cookies.admin! }, payload: body });
      expect(ok.statusCode).toBe(201);
      expect(ok.json().user).not.toHaveProperty('passwordHash');

      const dup = await app.inject({ method: 'POST', url: '/api/admin/users', headers: { cookie: cookies.admin! }, payload: body });
      expect(dup.statusCode).toBe(409);
    });

    it('refuse un mot de passe trop court', async () => {
      const res = await app.inject({
        method: 'POST', url: '/api/admin/users', headers: { cookie: cookies.admin! },
        payload: { email: `${tag}-x@example.test`, firstName: 'X', lastName: 'X', role: 'EDITOR', password: 'court' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('empêche un admin de se rétrograder ou désactiver lui-même', async () => {
      const res = await app.inject({
        method: 'PATCH', url: `/api/admin/users/${ids.admin}`, headers: { cookie: cookies.admin! }, payload: { role: 'EDITOR' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('désactiver un utilisateur ferme ses sessions et bloque la connexion', async () => {
      const res = await app.inject({
        method: 'PATCH', url: `/api/admin/users/${ids.contrib}`, headers: { cookie: cookies.admin! }, payload: { active: false },
      });
      expect(res.statusCode).toBe(200);
      const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookies.contrib! } });
      expect(me.statusCode).toBe(401);
      expect(await login(emails.contrib)).toBe('');
    });
  });

  describe('mot de passe personnel', () => {
    it('exige le mot de passe actuel puis change le mot de passe', async () => {
      const bad = await app.inject({
        method: 'POST', url: '/api/auth/password', headers: { cookie: cookies.editor! },
        payload: { currentPassword: 'faux', newPassword: 'Nouveau-Mdp-456!' },
      });
      expect(bad.statusCode).toBe(400);

      const ok = await app.inject({
        method: 'POST', url: '/api/auth/password', headers: { cookie: cookies.editor! },
        payload: { currentPassword: pw, newPassword: 'Nouveau-Mdp-456!' },
      });
      expect(ok.statusCode).toBe(200);
      expect(await login(emails.editor, 'Nouveau-Mdp-456!')).not.toBe('');
      expect(await login(emails.editor, pw)).toBe('');
    });
  });

  describe('médiathèque', () => {
    it('refuse sans connexion', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/admin/media' });
      expect(res.statusCode).toBe(401);
    });

    it('envoie une image : conversion WebP, miniature, URL publique', async () => {
      const png = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#336699' } }).png().toBuffer();
      const { payload, headers } = multipart('Ma photo.png', png, 'image/png');
      const res = await app.inject({ method: 'POST', url: '/api/admin/media', headers: { ...headers, cookie: cookies.admin! }, payload });
      expect(res.statusCode).toBe(201);
      const { media } = res.json();
      expect(media.mimeType).toBe('image/webp');
      expect(media.filename).toBe('Ma photo.webp');
      expect(media.url).toMatch(/^\/uploads\/\d{4}\/\d{2}\/.+\.webp$/);

      const file = await app.inject({ method: 'GET', url: media.url });
      expect(file.statusCode).toBe(200);
      const meta = await sharp(file.rawPayload).metadata();
      expect(meta.width).toBe(2000); // redimensionnée
      const thumb = await app.inject({ method: 'GET', url: media.thumbUrl });
      expect(thumb.statusCode).toBe(200);

      const list = await app.inject({ method: 'GET', url: '/api/admin/media?type=image', headers: { cookie: cookies.editor! } });
      expect(list.statusCode).toBe(200);
      expect(list.json().items.some((m: { id: number }) => m.id === media.id)).toBe(true);

      // suppression par un éditeur : supprime aussi les fichiers sur disque
      const del = await app.inject({ method: 'DELETE', url: `/api/admin/media/${media.id}`, headers: { cookie: cookies.editor! } });
      expect(del.statusCode).toBe(200);
      await expect(stat(path.join(uploadDir, media.url.replace('/uploads/', '')))).rejects.toThrow();
    });

    it('accepte un PDF', async () => {
      const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
      const { payload, headers } = multipart('bulletin.pdf', pdf, 'application/pdf');
      const res = await app.inject({ method: 'POST', url: '/api/admin/media', headers: { ...headers, cookie: cookies.admin! }, payload });
      expect(res.statusCode).toBe(201);
      expect(res.json().media.mimeType).toBe('application/pdf');
      expect(res.json().media.thumbUrl).toBeNull();
    });

    it('rejette un faux fichier image (texte renommé en .png)', async () => {
      const { payload, headers } = multipart('faux.png', Buffer.from('ceci est du texte'), 'image/png');
      const res = await app.inject({ method: 'POST', url: '/api/admin/media', headers: { ...headers, cookie: cookies.admin! }, payload });
      expect(res.statusCode).toBe(415);
    });

    it('rejette un fichier exécutable / HTML', async () => {
      const { payload, headers } = multipart('page.html', Buffer.from('<script>alert(1)</script>'), 'text/html');
      const res = await app.inject({ method: 'POST', url: '/api/admin/media', headers: { ...headers, cookie: cookies.admin! }, payload });
      expect(res.statusCode).toBe(415);
    });
  });

  describe('paramètres du site', () => {
    it('lecture publique limitée, écriture réservée admin/éditeur', async () => {
      const pub = await app.inject({ method: 'GET', url: '/api/settings' });
      expect(pub.statusCode).toBe(200);
      expect(pub.json().settings).toHaveProperty('site.name');

      const anon = await app.inject({ method: 'PUT', url: '/api/admin/settings', payload: { 'site.phone': '1' } });
      expect(anon.statusCode).toBe(401);

      const before = (await prisma.setting.findUnique({ where: { key: 'site.phone' } }))?.value ?? '';
      const put = await app.inject({ method: 'PUT', url: '/api/admin/settings', headers: { cookie: cookies.admin! }, payload: { 'site.phone': '+228 90 00 00 00' } });
      expect(put.statusCode).toBe(200);
      expect(put.json().settings['site.phone']).toBe('+228 90 00 00 00');
      // ne pas laisser de donnée de test dans la base
      await prisma.setting.update({ where: { key: 'site.phone' }, data: { value: before } });
    });

    it('refuse une clé inconnue', async () => {
      const res = await app.inject({ method: 'PUT', url: '/api/admin/settings', headers: { cookie: cookies.admin! }, payload: { 'evil.key': 'x' } });
      expect(res.statusCode).toBe(400);
    });
  });
});
