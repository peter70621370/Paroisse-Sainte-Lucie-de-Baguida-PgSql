import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { SESSION_COOKIE, createSession, deleteOtherSessions, deleteSession } from '../auth/sessions.js';
import type { Env } from '../config/env.js';

const loginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(191),
  password: z.string().min(1).max(200),
});

const passwordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, 'Au moins 10 caractères').max(200),
});

// Hash factice : on vérifie toujours un mot de passe, même si l'e-mail est inconnu,
// pour que le temps de réponse ne révèle pas l'existence d'un compte.
let dummyHash: string | undefined;

const authRoutes: FastifyPluginAsync<{ env: Env }> = async (app, { env }) => {
  const secure = env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : env.NODE_ENV === 'production';

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const parsed = loginBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Identifiants invalides' });
      const { email, password } = parsed.data;

      const user = await app.prisma.user.findUnique({ where: { email } });
      dummyHash ??= await hashPassword('dummy-password');
      const ok = await verifyPassword(password, user?.passwordHash ?? dummyHash);
      if (!user || !user.active || !ok) {
        return reply.code(401).send({ error: 'E-mail ou mot de passe incorrect' });
      }

      const { token, expiresAt } = await createSession(app.prisma, user.id, env.SESSION_TTL_DAYS, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
      await app.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      reply.setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/',
        expires: expiresAt,
      });
      return {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      };
    },
  );

  app.post('/auth/logout', async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await deleteSession(app.prisma, token);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/auth/me', { preHandler: app.requireAuth() }, async (req) => ({ user: req.user }));

  // Changement de son propre mot de passe ; les autres sessions de l'utilisateur sont fermées.
  app.post(
    '/auth/password',
    { preHandler: app.requireAuth(), config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = passwordBody.parse(req.body);
      const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
      if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
        return reply.code(400).send({ error: 'Mot de passe actuel incorrect' });
      }
      await app.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword) } });
      await deleteOtherSessions(app.prisma, user.id, req.cookies[SESSION_COOKIE]!);
      return { ok: true };
    },
  );
};

export default authRoutes;
