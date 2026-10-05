import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../src/config/env.js';
import { buildApp } from '../src/app.js';
import { hashPassword, verifyPassword } from '../src/auth/password.js';

describe('mots de passe', () => {
  it('hache puis vérifie', async () => {
    const h = await hashPassword('Secret-1234!');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('Secret-1234!', h)).toBe(true);
    expect(await verifyPassword('autre', h)).toBe(false);
  });
});

// Tests d'intégration : nécessitent MySQL. Lancer avec RUN_DB_TESTS=1 (dans le conteneur backend).
describe.skipIf(!process.env.RUN_DB_TESTS)('authentification et rôles', () => {
  const prisma = new PrismaClient();
  const tag = `test-${Date.now()}`;
  const admin = { email: `${tag}-admin@example.test`, password: 'Admin-Pass-123!' };
  const editor = { email: `${tag}-editor@example.test`, password: 'Editor-Pass-123!' };
  let app: FastifyInstance;

  const login = (c: { email: string; password: string }) =>
    app.inject({ method: 'POST', url: '/api/auth/login', payload: c });
  const cookieOf = (res: { cookies: { name: string; value: string }[] }) =>
    `sid=${res.cookies.find((c) => c.name === 'sid')?.value}`;

  beforeAll(async () => {
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test' }));
    await prisma.user.createMany({
      data: [
        { email: admin.email, passwordHash: await hashPassword(admin.password), firstName: 'A', lastName: 'Admin', role: 'ADMIN' },
        { email: editor.email, passwordHash: await hashPassword(editor.password), firstName: 'E', lastName: 'Editor', role: 'EDITOR' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('refuse un mot de passe incorrect', async () => {
    const res = await login({ email: admin.email, password: 'mauvais' });
    expect(res.statusCode).toBe(401);
  });

  it('refuse /auth/me sans session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('connecte, renvoie le profil, puis déconnecte', async () => {
    const res = await login(admin);
    expect(res.statusCode).toBe(200);
    const sid = res.cookies.find((c) => c.name === 'sid');
    expect(sid?.httpOnly).toBe(true);

    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookieOf(res) } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe(admin.email);
    expect(me.json().user).not.toHaveProperty('passwordHash');

    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: cookieOf(res) } });
    const after = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookieOf(res) } });
    expect(after.statusCode).toBe(401);
  });

  it('réserve /admin/users aux administrateurs', async () => {
    const ed = await login(editor);
    const denied = await app.inject({ method: 'GET', url: '/api/admin/users', headers: { cookie: cookieOf(ed) } });
    expect(denied.statusCode).toBe(403);

    const ad = await login(admin);
    const ok = await app.inject({ method: 'GET', url: '/api/admin/users', headers: { cookie: cookieOf(ad) } });
    expect(ok.statusCode).toBe(200);
    expect(JSON.stringify(ok.json())).not.toContain('passwordHash');
  });

  it('rejette une requête POST venant d\'une origine non autorisée', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: 'https://evil.example' },
      payload: admin,
    });
    expect(res.statusCode).toBe(403);
  });
});
