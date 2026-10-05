import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { hashPassword } from '../auth/password.js';
import { HttpError } from '../utils/errors.js';

const role = z.enum(['ADMIN', 'EDITOR', 'CONTRIBUTOR']);
const password = z.string().min(10, 'Au moins 10 caractères').max(200);
const idParam = z.object({ id: z.coerce.number().int().positive() });

const createBody = z.object({
  email: z.string().trim().toLowerCase().email().max(191),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role,
  password,
});
const patchBody = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    role,
    active: z.boolean(),
    password,
  })
  .partial()
  .strict();

const select = {
  id: true, email: true, firstName: true, lastName: true, role: true, active: true, lastLoginAt: true, createdAt: true,
} as const;

const adminUsers: FastifyPluginAsync = async (app) => {
  const guard = app.requireAuth(['ADMIN']);

  app.get('/admin/users', { preHandler: guard }, async () => ({
    users: await app.prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select }),
  }));

  app.post('/admin/users', { preHandler: guard }, async (req, reply) => {
    const { password: pw, ...data } = createBody.parse(req.body);
    try {
      const user = await app.prisma.user.create({ data: { ...data, passwordHash: await hashPassword(pw) }, select });
      return reply.code(201).send({ user });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new HttpError(409, 'Un compte existe déjà avec cet e-mail');
      }
      throw e;
    }
  });

  app.patch('/admin/users/:id', { preHandler: guard }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { password: newPassword, ...data } = patchBody.parse(req.body);

    const target = await app.prisma.user.findUnique({ where: { id } });
    if (!target) throw new HttpError(404, 'Utilisateur introuvable');

    if (req.user!.id === id && ((data.role && data.role !== target.role) || data.active === false)) {
      throw new HttpError(400, 'Vous ne pouvez pas modifier votre propre rôle ni désactiver votre compte');
    }
    const losesAdmin = target.role === 'ADMIN' && target.active && ((data.role && data.role !== 'ADMIN') || data.active === false);
    if (losesAdmin) {
      const others = await app.prisma.user.count({ where: { role: 'ADMIN', active: true, id: { not: id } } });
      if (others === 0) throw new HttpError(400, 'Il doit rester au moins un administrateur actif');
    }

    const user = await app.prisma.user.update({
      where: { id },
      data: { ...data, ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {}) },
      select,
    });
    // Désactivation ou changement de mot de passe : toutes les sessions de cet utilisateur sont fermées.
    if (data.active === false || newPassword) await app.prisma.session.deleteMany({ where: { userId: id } });
    return { user };
  });
};

export default adminUsers;
