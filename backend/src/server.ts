// Point d'entrée de l'API (Docker, et Vercel qui détecte ce fichier : il ne doit pas s'appeler src/app.ts ni src/index.ts).
// Vercel n'accepte comme point d'entrée qu'un fichier qui importe lui-même fastify : ne pas retirer cette ligne.
import 'fastify';
import { loadEnv } from './config/env.js';
import { buildApp } from './build-app.js';

const env = loadEnv();
const app = await buildApp(env);

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
