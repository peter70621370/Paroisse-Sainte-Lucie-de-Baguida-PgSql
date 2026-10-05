import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../utils/errors.js';
import { thumbPathOf } from '../services/media.js';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const url = z.string().trim().url().max(500).refine((u) => /^https?:\/\//i.test(u), 'URL http(s) attendue');
const caption = z.string().trim().max(255).nullish().transform((v) => v || null);

const mediaUrls = (m: { storagePath: string } | null) =>
  m ? { url: `/uploads/${m.storagePath}`, thumbUrl: thumbPathOf(m.storagePath) ? `/uploads/${thumbPathOf(m.storagePath)}` : null } : null;

type ItemRow = { id: number; mediaId: number | null; videoUrl: string | null; caption: string | null; sortOrder: number; media: { storagePath: string; alt: string | null } | null };
const itemOut = (i: ItemRow) => ({
  id: i.id, type: i.videoUrl ? ('video' as const) : ('image' as const), caption: i.caption, sortOrder: i.sortOrder, videoUrl: i.videoUrl,
  alt: i.media?.alt ?? null, ...(mediaUrls(i.media) ?? { url: null, thumbUrl: null }),
});

// Albums : le CRUD de l'album lui-même est dans admin-content (fabrique). Ici : photos/vidéos de l'album et vues publiques.
const albums: FastifyPluginAsync = async (app) => {
  const db = app.prisma;
  const guard = app.requireAuth(['ADMIN', 'EDITOR']);
  const itemInclude = { media: { select: { storagePath: true, alt: true } } } as const;

  app.post('/admin/albums/:id/items', { preHandler: guard }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const data = z.object({ mediaId: z.number().int().positive().optional(), videoUrl: url.optional(), caption }).refine((d) => !!d.mediaId !== !!d.videoUrl, 'Indiquez soit une image, soit un lien vidéo').parse(req.body);
    if (!(await db.album.findUnique({ where: { id } }))) throw new HttpError(404, 'Album introuvable');
    if (data.mediaId) {
      const m = await db.media.findUnique({ where: { id: data.mediaId } });
      if (!m?.mimeType.startsWith('image/')) throw new HttpError(400, 'Le fichier choisi doit être une image de la médiathèque');
    }
    const last = await db.albumItem.aggregate({ where: { albumId: id }, _max: { sortOrder: true } });
    const item = await db.albumItem.create({ data: { albumId: id, mediaId: data.mediaId, videoUrl: data.videoUrl, caption: data.caption, sortOrder: (last._max.sortOrder ?? 0) + 1 }, include: itemInclude });
    return reply.code(201).send({ item: itemOut(item) });
  });

  app.post('/admin/albums/:id/items/reorder', { preHandler: guard }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { ids } = z.object({ ids: z.array(z.number().int().positive()).max(500) }).parse(req.body);
    const own = await db.albumItem.findMany({ where: { albumId: id, id: { in: ids } }, select: { id: true } });
    if (own.length !== ids.length) throw new HttpError(400, 'Éléments invalides');
    await db.$transaction(ids.map((itemId, i) => db.albumItem.update({ where: { id: itemId }, data: { sortOrder: i + 1 } })));
    return { ok: true };
  });

  app.patch('/admin/albums/items/:id', { preHandler: guard }, async (req) => {
    const { id } = idParam.parse(req.params);
    const data = z.object({ caption }).strict().parse(req.body);
    try {
      return { item: itemOut(await db.albumItem.update({ where: { id }, data, include: itemInclude })) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new HttpError(404, 'Élément introuvable');
      throw e;
    }
  });

  app.delete('/admin/albums/items/:id', { preHandler: guard }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { count } = await db.albumItem.deleteMany({ where: { id } });
    if (!count) throw new HttpError(404, 'Élément introuvable');
    return { ok: true };
  });

  // ---------- Public ----------
  app.get('/albums', async () => {
    const list = await db.album.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: { cover: true, items: { orderBy: { sortOrder: 'asc' }, include: itemInclude } },
    });
    return {
      items: list.map((a) => {
        const firstImage = a.items.find((i) => i.media);
        const cover = mediaUrls(a.cover) ?? (firstImage ? mediaUrls(firstImage.media) : null);
        return { slug: a.slug, title: a.title, description: a.description, date: a.date, count: a.items.length, cover };
      }),
    };
  });

  app.get('/albums/:slug', async (req) => {
    const { slug } = z.object({ slug: z.string().max(191) }).parse(req.params);
    const a = await db.album.findFirst({ where: { slug, status: 'PUBLISHED' }, include: { items: { orderBy: { sortOrder: 'asc' }, include: itemInclude } } });
    if (!a) throw new HttpError(404, 'Album introuvable');
    return { album: { slug: a.slug, title: a.title, description: a.description, date: a.date, items: a.items.map(itemOut) } };
  });
};

export default albums;
