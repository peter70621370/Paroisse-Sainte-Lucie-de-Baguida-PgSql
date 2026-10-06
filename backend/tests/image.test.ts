import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../src/config/env.js';
import { buildApp } from '../src/app.js';

// Images adaptées à l'écran : la route ne doit servir QUE des WebP de la médiathèque, en largeurs prédéfinies.
describe.skipIf(!process.env.RUN_DB_TESTS)('versions réduites des images', () => {
  let app: FastifyInstance;
  let dir: string;
  const id = '0b8f7c52-3d4e-4a6b-9c1d-2e3f4a5b6c7d';
  const src = `/uploads/2026/10/${id}.webp`;
  const get = (q: string) => app.inject({ method: 'GET', url: `/api/image?${q}`, headers: { 'x-forwarded-for': '10.80.0.1' } });

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'img-'));
    await mkdir(path.join(dir, '2026/10'), { recursive: true });
    await writeFile(path.join(dir, `2026/10/${id}.webp`), await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#2C5282' } }).webp().toBuffer());
    // un fichier secret HORS de la médiathèque : il ne doit jamais être accessible
    await writeFile(path.join(dir, '..', `secret-${id}.txt`), 'secret');
    app = await buildApp(loadEnv({ ...process.env, NODE_ENV: 'test', UPLOAD_DIR: dir }));
  });

  afterAll(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
    await rm(path.join(dir, '..', `secret-${id}.txt`), { force: true });
  });

  it('réduit l\'image à la largeur demandée et la garde en cache', async () => {
    const res = await get(`src=${src}&w=640`);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['cache-control']).toContain('immutable');
    expect((await sharp(res.rawPayload).metadata()).width).toBe(640);
    expect(res.rawPayload.length).toBeLessThan((await stat(path.join(dir, `2026/10/${id}.webp`))).size + 1);

    await stat(path.join(dir, '.cache/640/2026/10', `${id}.webp`)); // écrite sur le disque
    expect((await get(`src=${src}&w=640`)).statusCode).toBe(200); // 2e appel : depuis le cache
  });

  it('n\'agrandit jamais une petite image', async () => {
    const small = '0b8f7c52-3d4e-4a6b-9c1d-2e3f4a5b6c7e';
    await writeFile(path.join(dir, `2026/10/${small}.webp`), await sharp({ create: { width: 300, height: 200, channels: 3, background: '#fff' } }).webp().toBuffer());
    const res = await get(`src=/uploads/2026/10/${small}.webp&w=1280`);
    expect((await sharp(res.rawPayload).metadata()).width).toBe(300);
  });

  it('refuse les largeurs hors liste (pas de saturation du disque)', async () => {
    for (const w of ['123', '4000', '0', '-5', 'abc', '640.5']) expect((await get(`src=${src}&w=${w}`)).statusCode, w).toBe(400);
    expect(await readdir(path.join(dir, '.cache')).then((d) => d.sort())).toEqual(['640', '1280'].sort()); // seules les largeurs valides ont été créées
  });

  it('refuse tout chemin autre qu\'un WebP de la médiathèque (traversée de dossier, autres types)', async () => {
    const bad = [
      '/uploads/../../etc/passwd',
      `/uploads/2026/10/../../../secret-${id}.txt`,
      `/uploads/2026/10/${id}.webp/../../../x`,
      `/uploads/%2e%2e/%2e%2e/etc/passwd`,
      `/etc/passwd`,
      `/uploads/2026/10/${id}.png`,
      `/uploads/2026/10/${id}.svg`,
      `https://evil.example/${id}.webp`,
      `/uploads/.cache/640/2026/10/${id}.webp`,
      `/uploads/2026/10/${id}.webp%00.png`,
    ];
    for (const s of bad) expect((await get(`src=${encodeURIComponent(s)}&w=640`)).statusCode, s).toBe(400);
  });

  it('une image absente donne 404, sans révéler de chemin', async () => {
    const res = await get(`src=/uploads/2026/10/00000000-0000-4000-8000-000000000000.webp&w=640`);
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain(dir);
  });
});
