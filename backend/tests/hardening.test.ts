import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../src/config/env.js';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';

// Adresse du client : un visiteur ne doit pas pouvoir la falsifier pour contourner les limites de débit.
// (Verrouillage par compte, garde-fous de production et purge des sessions : retirés pour l'instant, voir docs/SECURITE.md.)
describe.skipIf(!process.env.RUN_DB_TESTS)('adresse IP et limite de connexion', () => {
  const prisma = new PrismaClient();
  const tag = `hd${Date.now()}`;
  const pw = 'Test-Password-123!';
  let app: FastifyInstance;
  let n = 0;

  const login = (email: string, password: string, ip: string) =>
    app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password }, headers: { 'x-forwarded-for': ip } });
  const freshIp = () => `10.60.${Math.floor(++n / 250)}.${n % 250}`;

  beforeAll(async () => {
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test' }));
    await prisma.user.create({ data: { email: `${tag}-a@example.test`, passwordHash: await hashPassword(pw), firstName: 'a', lastName: 'T', role: 'EDITOR' } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('un en-tête X-Forwarded-For falsifié ne contourne pas la limite par IP', async () => {
    // Le proxy (Nginx) AJOUTE la vraie adresse à droite ; ce qui est à gauche est choisi par l'attaquant.
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) codes.push((await login(`${tag}-a@example.test`, 'faux', `${freshIp()}, 203.0.113.50`)).statusCode);
    expect(codes).toContain(429);
  });

  it('des adresses réellement différentes ne se bloquent pas entre elles', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) codes.push((await login(`${tag}-a@example.test`, 'faux', freshIp())).statusCode);
    expect(codes).toEqual([401, 401, 401, 401]);
    expect((await login(`${tag}-a@example.test`, pw, freshIp())).statusCode).toBe(200);
  });
});
