import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { ZodError } from 'zod';
import type { Env } from './config/env.js';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import health from './routes/health.js';
import authRoutes from './routes/auth.js';
import adminUsers from './routes/admin-users.js';
import adminMedia from './routes/admin-media.js';
import settingsRoutes from './routes/settings.js';
import adminContent from './routes/admin-content.js';
import publicContent from './routes/public-content.js';

export async function buildApp(env: Env, opts: { withDatabase?: boolean } = {}): Promise<FastifyInstance> {
  const { withDatabase = true } = opts;
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : env.NODE_ENV === 'development'
          ? { transport: { target: 'pino-pretty' } }
          : true,
    trustProxy: true,
  });

  // Réponses d'erreur homogènes : { error: "message" } (+ détails pour la validation).
  app.setErrorHandler((err, req, reply) => {
    const e = err as unknown;
    if (e instanceof ZodError) {
      return reply.code(400).send({ error: 'Données invalides', details: e.flatten().fieldErrors });
    }
    const { statusCode = 500, message } = e as { statusCode?: number; message: string };
    if (statusCode >= 500) {
      req.log.error(e);
      return reply.code(500).send({ error: 'Erreur interne' });
    }
    return reply.code(statusCode).send({ error: message });
  });

  await app.register(helmet);
  await app.register(cors, { origin: allowedOrigins, credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

  // Protection CSRF : une requête qui modifie des données, venant d'un navigateur
  // (en-tête Origin présent), doit provenir d'une origine autorisée.
  app.addHook('onRequest', async (req, reply) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      return reply.code(403).send({ error: 'Origine non autorisée' });
    }
  });

  if (withDatabase) {
    const uploadRoot = path.resolve(env.UPLOAD_DIR);
    await mkdir(uploadRoot, { recursive: true });

    await app.register(prismaPlugin);
    await app.register(authPlugin);
    await app.register(multipart, { limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 } });
    // Fichiers publics (noms aléatoires, donc cache long).
    await app.register(fastifyStatic, {
      root: uploadRoot,
      prefix: '/uploads/',
      index: false,
      list: false,
      setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'),
    });
  }

  await app.register(
    async (api) => {
      await api.register(health);
      if (withDatabase) {
        await api.register(authRoutes, { env });
        await api.register(adminUsers);
        await api.register(adminMedia, { env });
        await api.register(settingsRoutes);
        await api.register(adminContent);
        await api.register(publicContent);
      }
    },
    { prefix: '/api' },
  );

  return app;
}
