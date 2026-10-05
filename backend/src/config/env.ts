import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  // Par défaut : cookie « secure » uniquement en production (HTTPS).
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
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
