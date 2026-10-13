import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  // Origines autorisées (séparées par des virgules). Par défaut : PUBLIC_URL.
  CORS_ORIGIN: z.string().optional(),
  // Par défaut : cookie « secure » uniquement en production (HTTPS).
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  // Proxys de confiance devant l'API : leurs adresses (plages réseau). Par défaut : réseaux privés / Docker interne, où seul Nginx est joignable.
  // L'adresse du client est la première NON fiable en remontant X-Forwarded-For depuis la droite : ce que le client y écrit lui-même est ignoré.
  // Vide = aucun proxy (X-Forwarded-For ignoré).
  TRUST_PROXY: z.string().default('loopback,linklocal,uniquelocal'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  // E-mails (formulaires). Sans SMTP_HOST, aucun e-mail n'est envoyé (les demandes restent enregistrées).
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.enum(['true', 'false']).optional(),
  MAIL_FROM: z.string().default('Paroisse Sainte Lucie de Baguida <no-reply@paroissesaintelucie-baguida.org>'),
  // Destinataire des notifications si « E-mail de contact » n'est pas renseigné dans les paramètres.
  NOTIFY_EMAIL: z.string().optional(),
  // Adresse publique du site (liens de retour des paiements, webhooks).
  PUBLIC_URL: z.string().default('http://localhost:3000'),
  // Dons en ligne. mock = simulation locale (développement) ; live = vrais prestataires (clés ci-dessous).
  PAYMENT_MODE: z.enum(['live', 'mock']).default('live'),
  CINETPAY_API_KEY: z.string().optional(),
  CINETPAY_SITE_ID: z.string().optional(),
  CINETPAY_BASE_URL: z.string().default('https://api-checkout.cinetpay.com'),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_ENV: z.enum(['sandbox', 'live']).default('sandbox'),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    console.error('Configuration invalide :', parsed.error.flatten().fieldErrors);
    throw new Error('Variables d\'environnement invalides');
  }
  return parsed.data;
}

