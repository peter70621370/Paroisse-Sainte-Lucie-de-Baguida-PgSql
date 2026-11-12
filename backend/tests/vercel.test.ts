import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../src/config/env.js';
import { buildApp } from '../src/build-app.js';

// Déploiement sur Vercel : l'API est derrière le relais du site (secret partagé) et ses fichiers sont dans Vercel Blob.
describe.skipIf(!process.env.RUN_DB_TESTS)('déploiement Vercel : relais et Vercel Blob', () => {
  const secret = 'secret-du-relais-de-test';
  const file = '2026/10/0b5d8e6f-17f5-4660-80d7-52ff1bbedbfc.webp';
  let app: FastifyInstance;
  let n = 0;

  const login = (headers: Record<string, string>) =>
    app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'personne@example.test', password: 'mauvais-mot-de-passe' }, headers });
  const freshIp = () => `198.51.${Math.floor(++n / 250)}.${n % 250}`;

  beforeAll(async () => {
    app = await buildApp(
      loadEnv({ ...process.env, NODE_ENV: 'test', RELAY_SECRET: secret, BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_TestStore123_abcdef' }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("avec le secret, l'adresse transmise par le site sert aux limites", async () => {
    // Même adresse de relais, visiteurs différents : personne n'est bloqué.
    const distinct: number[] = [];
    for (let i = 0; i < 8; i++) distinct.push((await login({ 'x-relay-secret': secret, 'x-client-ip': freshIp() })).statusCode);
    expect(distinct).not.toContain(429);

    // Un même visiteur : bloqué après 5 essais.
    const ip = freshIp();
    const same: number[] = [];
    for (let i = 0; i < 7; i++) same.push((await login({ 'x-relay-secret': secret, 'x-client-ip': ip })).statusCode);
    expect(same).toContain(429);
  });

  it("sans le bon secret, l'adresse annoncée est ignorée", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) {
      codes.push((await login({ 'x-relay-secret': 'faux-secret', 'x-client-ip': freshIp(), 'x-forwarded-for': '10.99.0.1' })).statusCode);
    }
    expect(codes).toContain(429);
  });

  it('les adresses /uploads/… redirigent vers Vercel Blob, et seulement pour un fichier de la médiathèque', async () => {
    const res = await app.inject({ method: 'GET', url: `/uploads/${file}` });
    expect(res.statusCode).toBe(308);
    expect(res.headers.location).toBe(`https://TestStore123.public.blob.vercel-storage.com/${file}`);
    expect(res.headers['cache-control']).toContain('s-maxage');

    expect((await app.inject({ method: 'GET', url: '/uploads/2026/10/..%2F..%2Fsecret.webp' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/uploads/autre/fichier.txt' })).statusCode).toBe(404);
  });
});
