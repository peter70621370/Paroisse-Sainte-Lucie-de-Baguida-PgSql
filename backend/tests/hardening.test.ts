import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { loadEnv, assertProductionSafe } from '../src/config/env.js';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';
import { purgeExpiredSessions } from '../src/auth/sessions.js';

const good = {
  NODE_ENV: 'production', DATABASE_URL: 'mysql://u:Sup3rS3cret@mysql:3306/db', PUBLIC_URL: 'https://www.paroissesaintelucie-baguida.org',
  PAYMENT_MODE: 'live', COOKIE_SECURE: 'true', CORS_ORIGIN: 'https://www.paroissesaintelucie-baguida.org',
};

describe('garde-fous de production', () => {
  const check = (over: Record<string, string | undefined>) => () => assertProductionSafe(loadEnv({ ...good, ...over } as NodeJS.ProcessEnv));

  it('accepte une configuration saine', () => {
    expect(check({})).not.toThrow();
  });
  it('refuse les mots de passe d\'exemple', () => {
    expect(check({ DATABASE_URL: 'mysql://u:change-me-db@mysql:3306/db' })).toThrow(/change-me/);
  });
  it('refuse la simulation de paiement (un clic = don « payé »)', () => {
    expect(check({ PAYMENT_MODE: 'mock' })).toThrow(/simulation/i);
  });
  it('refuse un cookie de session non sécurisé et un site non HTTPS', () => {
    expect(check({ COOKIE_SECURE: 'false' })).toThrow(/cookie/i);
    expect(check({ PUBLIC_URL: 'http://www.exemple.org', CORS_ORIGIN: 'http://www.exemple.org' })).toThrow(/https/i);
  });
  it('ALLOW_INSECURE_PROD permet une répétition locale (jamais en vrai)', () => {
    expect(check({ PAYMENT_MODE: 'mock', COOKIE_SECURE: 'false', PUBLIC_URL: 'http://localhost', ALLOW_INSECURE_PROD: 'true' })).not.toThrow();
  });
  it('ne contrôle rien hors production', () => {
    expect(() => assertProductionSafe(loadEnv({ NODE_ENV: 'development', DATABASE_URL: 'mysql://u:change-me@x/db', PAYMENT_MODE: 'mock' } as NodeJS.ProcessEnv))).not.toThrow();
  });
});

describe.skipIf(!process.env.RUN_DB_TESTS)('protection contre la force brute et sessions', () => {
  const prisma = new PrismaClient();
  const tag = `hd${Date.now()}`;
  const pw = 'Test-Password-123!';
  let app: FastifyInstance;
  const email = (k: string) => `${tag}-${k}@example.test`;
  let n = 0;

  const login = (e: string, password: string, ip: string) =>
    app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: e, password }, headers: { 'x-forwarded-for': ip } });
  const freshIp = () => `10.60.${Math.floor(++n / 250)}.${n % 250}`;

  beforeAll(async () => {
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test' }));
    const hash = await hashPassword(pw);
    for (const k of ['a', 'b', 'c', 'old']) {
      await prisma.user.create({ data: { email: email(k), passwordHash: hash, firstName: k, lastName: 'T', role: 'EDITOR' } });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('un en-tête X-Forwarded-For falsifié ne contourne pas la limite par IP', async () => {
    // Le proxy (Nginx) AJOUTE la vraie adresse à droite ; ce qui est à gauche est choisi par l'attaquant.
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) codes.push((await login(email('a'), 'faux', `${freshIp()}, 203.0.113.50`)).statusCode);
    expect(codes).toContain(429);
  });

  it('verrouille un compte ciblé depuis de nombreuses adresses, puis le débloque après une connexion réussie ailleurs', async () => {
    const results: number[] = [];
    for (let i = 0; i < 10; i++) results.push((await login(email('b'), 'faux', freshIp())).statusCode);
    expect(results.every((c) => c === 401)).toBe(true);

    const locked = await login(email('b'), pw, freshIp()); // même avec le bon mot de passe
    expect(locked.statusCode).toBe(429);
    expect(locked.json().error).toContain('Trop de tentatives');
  });

  it('un compte inconnu est limité de la même façon (pas d\'énumération)', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await login(`${tag}-inconnu@example.test`, 'faux', freshIp())).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codes[10]).toBe(429);
  });

  it('une connexion réussie remet le compteur à zéro', async () => {
    for (let i = 0; i < 6; i++) await login(email('c'), 'faux', freshIp());
    expect((await login(email('c'), pw, freshIp())).statusCode).toBe(200);
    for (let i = 0; i < 6; i++) await login(email('c'), 'faux', freshIp()); // repartent de zéro : pas de verrouillage
    expect((await login(email('c'), pw, freshIp())).statusCode).toBe(200);
  });

  it('purge les sessions expirées et garde les valides', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: email('old') } });
    await prisma.session.createMany({
      data: [
        { tokenHash: `${tag}`.padEnd(64, 'a'), userId: user.id, expiresAt: new Date(Date.now() - 1000) },
        { tokenHash: `${tag}`.padEnd(64, 'b'), userId: user.id, expiresAt: new Date(Date.now() + 3_600_000) },
      ],
    });
    const removed = await purgeExpiredSessions(prisma);
    expect(removed).toBeGreaterThanOrEqual(1);
    const left = await prisma.session.findMany({ where: { userId: user.id } });
    expect(left.map((s) => s.tokenHash.slice(-1))).toEqual(['b']);
  });
});
