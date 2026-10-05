import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Env } from './config/env.js';
import prismaPlugin from './plugins/prisma.js';
import health from './routes/health.js';

export async function buildApp(env: Env, opts: { withDatabase?: boolean } = {}): Promise<FastifyInstance> {
  const { withDatabase = true } = opts;

  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : env.NODE_ENV === 'development'
          ? { transport: { target: 'pino-pretty' } }
          : true,
    trustProxy: true,
  });

  await app.register(helmet);
  await app.register(cors, { origin: env.CORS_ORIGIN.split(','), credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

  if (withDatabase) await app.register(prismaPlugin);

  await app.register(health, { prefix: '/api' });

  return app;
}
