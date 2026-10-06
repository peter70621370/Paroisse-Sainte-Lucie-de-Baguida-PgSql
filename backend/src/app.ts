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
import { HttpError } from './utils/errors.js';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import health from './routes/health.js';
import authRoutes from './routes/auth.js';
import adminUsers from './routes/admin-users.js';
import adminMedia from './routes/admin-media.js';
import settingsRoutes from './routes/settings.js';
import adminContent from './routes/admin-content.js';
import publicContent from './routes/public-content.js';
import forms from './routes/forms.js';
import adminSubmissions from './routes/admin-submissions.js';
import { createMailer } from './services/mail.js';
import formbody from '@fastify/formbody';
import donations from './routes/donations.js';
import campaigns from './routes/campaigns.js';
import adminDonations from './routes/admin-donations.js';
import seo from './routes/seo.js';
import analytics from './routes/analytics.js';
import newsletter from './routes/newsletter.js';
import albums from './routes/albums.js';
import image from './routes/image.js';
import { createPayments } from './services/payments/index.js';
import type { FetchLike } from './services/payments/types.js';

export async function buildApp(env: Env, opts: { withDatabase?: boolean; fetchImpl?: FetchLike } = {}): Promise<FastifyInstance> {
  const { withDatabase = true, fetchImpl } = opts;
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : env.NODE_ENV === 'development'
          ? { transport: { target: 'pino-pretty' } }
          : true,
    // Plages d'adresses des proxys de confiance (pas « true » : sinon un client falsifie son adresse et contourne les limites).
    trustProxy: env.TRUST_PROXY.trim() || false,
  });

  app.decorate('mailer', createMailer(env, app.log));
  app.decorate('env', env);
  app.decorate('payments', createPayments(env, fetchImpl));

  // Réponses d'erreur homogènes : { error: "message" } (+ détails pour la validation).
  app.setErrorHandler((err, req, reply) => {
    const e = err as unknown;
    if (e instanceof ZodError) {
      return reply.code(400).send({ error: 'Données invalides', details: e.flatten().fieldErrors });
    }
    // Erreurs volontaires (400, 403, 409, 502, 503…) : message et code conservés tels quels.
    if (e instanceof HttpError) return reply.code(e.statusCode).send({ error: e.message });
    const { statusCode = 500, message } = e as { statusCode?: number; message: string };
    if (statusCode >= 500) {
      req.log.error(e);
      return reply.code(500).send({ error: 'Erreur interne' });
    }
    return reply.code(statusCode).send({ error: message });
  });

  await app.register(helmet);
  await app.register(formbody); // notifications des prestataires de paiement (formulaire encodé)
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
        await api.register(forms, { env });
        await api.register(adminSubmissions);
        await api.register(donations, { env });
        await api.register(campaigns);
        await api.register(adminDonations);
        await api.register(seo);
        await api.register(analytics);
        await api.register(newsletter, { env });
        await api.register(albums);
        await api.register(image, { env });
      }
    },
    { prefix: '/api' },
  );

  return app;
}
