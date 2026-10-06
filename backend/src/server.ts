import { loadEnv, assertProductionSafe } from './config/env.js';
import { buildApp } from './app.js';
import { purgeExpiredSessions } from './auth/sessions.js';

const env = loadEnv();
assertProductionSafe(env);
const app = await buildApp(env);

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Ménage des sessions expirées : au démarrage, puis toutes les heures.
const purge = () => purgeExpiredSessions(app.prisma).then((n) => n && app.log.info(`${n} session(s) expirée(s) supprimée(s)`)).catch((err) => app.log.error(err));
void purge();
setInterval(purge, 60 * 60 * 1000).unref();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
