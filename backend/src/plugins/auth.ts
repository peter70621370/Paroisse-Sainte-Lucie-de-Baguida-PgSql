import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { Role } from '@prisma/client';
import { SESSION_COOKIE, findSessionUser, type SessionUser } from '../auth/sessions.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
  interface FastifyInstance {
    /** preHandler : exige une session valide, et éventuellement l'un des rôles donnés. */
    requireAuth: (roles?: Role[]) => preHandlerAsyncHookHandler;
  }
}

export default fp(async (app) => {
  await app.register(cookie);
  app.decorateRequest('user', null);

  // Charge l'utilisateur de la session (s'il y en a une) pour chaque requête.
  app.addHook('onRequest', async (req) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) req.user = await findSessionUser(app.prisma, token);
  });

  app.decorate('requireAuth', (roles?: Role[]) => async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Authentification requise' });
    if (roles && !roles.includes(req.user.role)) return reply.code(403).send({ error: 'Accès refusé' });
  });
});
