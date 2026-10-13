import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { HttpError } from '../utils/errors.js';
import { removeStoredFiles, storeUpload, thumbPathOf } from '../services/media.js';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(24),
  type: z.enum(['image', 'pdf']).optional(),
  q: z.string().trim().max(100).optional(),
});
const idParam = z.object({ id: z.coerce.number().int().positive() });
const patchBody = z.object({ alt: z.string().trim().max(255).nullable() }).strict();

type MediaRow = { id: number; filename: string; storagePath: string; mimeType: string; size: number; alt: string | null; createdAt: Date };
const present = (m: MediaRow) => {
  const thumb = thumbPathOf(m.storagePath);
  return {
    id: m.id,
    filename: m.filename,
    url: `/uploads/${m.storagePath}`,
    thumbUrl: thumb ? `/uploads/${thumb}` : null,
    mimeType: m.mimeType,
    size: m.size,
    alt: m.alt,
    createdAt: m.createdAt,
  };
};

const adminMedia: FastifyPluginAsync<{ env: Env }> = async (app, { env }) => {
  const anyUser = app.requireAuth();
  const editors = app.requireAuth(['ADMIN', 'EDITOR']);

  app.get('/admin/media', { preHandler: anyUser }, async (req) => {
    const { page, pageSize, type, q } = listQuery.parse(req.query);
    const where: Prisma.MediaWhereInput = {
      ...(type === 'image' ? { mimeType: { startsWith: 'image/' } } : {}),
      ...(type === 'pdf' ? { mimeType: 'application/pdf' } : {}),
      ...(q ? { filename: { contains: q, mode: 'insensitive' as const } } : {}),
    };
    const [total, items] = await Promise.all([
      app.prisma.media.count({ where }),
      app.prisma.media.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { total, page, pageSize, items: items.map(present) };
  });

  app.post('/admin/media', { preHandler: anyUser }, async (req, reply) => {
    const file = await req.file();
    if (!file) throw new HttpError(400, 'Aucun fichier reçu');
    const buffer = await file.toBuffer(); // lève une erreur 413 si la taille maximale est dépassée
    const stored = await storeUpload(env.UPLOAD_DIR, buffer, file.filename);
    const media = await app.prisma.media.create({
      data: { ...stored, uploadedById: req.user!.id },
    });
    return reply.code(201).send({ media: present(media) });
  });

  app.patch('/admin/media/:id', { preHandler: editors }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { alt } = patchBody.parse(req.body);
    try {
      return { media: present(await app.prisma.media.update({ where: { id }, data: { alt: alt || null } })) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new HttpError(404, 'Fichier introuvable');
      throw e;
    }
  });

  app.delete('/admin/media/:id', { preHandler: editors }, async (req) => {
    const { id } = idParam.parse(req.params);
    const media = await app.prisma.media.findUnique({ where: { id } });
    if (!media) throw new HttpError(404, 'Fichier introuvable');
    try {
      await app.prisma.media.delete({ where: { id } });
    } catch (e) {
      // Clé étrangère : le fichier est utilisé (ex. par un bulletin).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new HttpError(409, 'Ce fichier est utilisé (bulletin…) et ne peut pas être supprimé');
      }
      throw e;
    }
    await removeStoredFiles(env.UPLOAD_DIR, media.storagePath);
    return { ok: true };
  });
};

export default adminMedia;
