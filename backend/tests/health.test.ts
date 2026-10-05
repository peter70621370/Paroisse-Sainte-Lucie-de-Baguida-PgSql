import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { buildApp } from '../src/app.js';

describe('GET /api/health', () => {
  it('répond ok sans base de données', async () => {
    const env = loadEnv({ NODE_ENV: 'test', DATABASE_URL: 'mysql://x:x@localhost:3306/x' });
    const app = await buildApp(env, { withDatabase: false });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
