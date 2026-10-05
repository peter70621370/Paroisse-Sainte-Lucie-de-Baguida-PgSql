import type { FastifyPluginAsync } from 'fastify';

const health: FastifyPluginAsync = async (app) => {
  // Liveness : le processus répond.
  app.get('/health', async () => ({ status: 'ok' }));

  // Readiness : la base de données répond aussi.
  app.get('/health/ready', async (_req, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch (err) {
      app.log.error(err);
      return reply.code(503).send({ status: 'degraded', database: 'down' });
    }
  });
};

export default health;
