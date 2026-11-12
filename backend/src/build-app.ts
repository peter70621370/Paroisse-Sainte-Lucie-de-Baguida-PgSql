import { timingSafeEqual } from 'node:crypto';
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
import { createStorage } from './services/storage.js';
import type { FetchLike } from './services/payments/types.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Adresse IP du visiteur ; vide pour un appel interne du site (rendu serveur des pages), exempté des limites. */
    clientIp: string;
  }
}

/** Comparaison en temps constant : le secret du relais ne doit pas pouvoir être deviné caractère par caractère. */
const sameSecret = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function buildApp(env: Env, opts: { withDatabase?: boolean; fetchImpl?: FetchLike } = {}): Promise<FastifyInstance> {
  const { withDatabase = true, fetchImpl } = opts;
  const allowedOrigins = (env.CORS_ORIGIN || env.PUBLIC_URL).split(',').map((o) => o.trim());

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
  app.decorate('storage', createStorage({ uploadDir: env.UPLOAD_DIR, blobToken: env.BLOB_READ_WRITE_TOKEN }));

  // Adresse du visiteur. Derrière le relais du site sur Internet (Vercel), l'API ne voit que l'adresse du site :
  // le site transmet alors la vraie adresse (x-client-ip), crue seulement avec le secret partagé.
  const relaySecret = env.RELAY_SECRET?.trim() ?? '';
  app.decorateRequest('clientIp', '');
  app.addHook('onRequest', async (req) => {
    const secret = req.headers['x-relay-secret'];
    if (relaySecret && typeof secret === 'string' && sameSecret(secret, relaySecret)) {
      const ip = req.headers['x-client-ip'];
      req.clientIp = typeof ip === 'string' ? ip.trim().slice(0, 64) : '';
    } else {
      req.clientIp = req.ip;
    }
  });

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
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.clientIp,
    allowList: (req) => req.clientIp === '', // appels internes du site (rendu des pages)
  });

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
    await app.register(prismaPlugin);
    await app.register(authPlugin);
    // Avec Vercel Blob (déploiement sur Vercel), une requête ne peut dépasser 4,5 Mo.
    const maxUploadMb = app.storage.blob ? Math.min(env.MAX_UPLOAD_MB, 4) : env.MAX_UPLOAD_MB;
    await app.register(multipart, { limits: { fileSize: maxUploadMb * 1024 * 1024, files: 1 } });
    if (app.storage.blob) {
      // Fichiers dans Vercel Blob : les adresses /uploads/… restent valables et redirigent vers le fichier,
      // que le navigateur télécharge directement chez Vercel. La redirection elle-même est mise en cache.
      app.get('/uploads/*', async (req, reply) => {
        const rel = (req.params as { '*': string })['*'];
        if (!/^\d{4}\/\d{2}\/[0-9a-f-]{36}(\.thumb)?\.(webp|pdf)$/.test(rel)) return reply.code(404).send({ error: 'Fichier introuvable' });
        return reply
          .header('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
          .redirect(app.storage.publicUrl(rel)!, 308);
      });
    } else {
      const uploadRoot = path.resolve(env.UPLOAD_DIR);
      await mkdir(uploadRoot, { recursive: true });
      // Fichiers publics (noms aléatoires, donc cache long).
      await app.register(fastifyStatic, {
        root: uploadRoot,
        prefix: '/uploads/',
        index: false,
        list: false,
        setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'),
      });
    }
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
