import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// Données publiques pour le référencement : liste des adresses du sitemap et langues disponibles d'une page.
const seo: FastifyPluginAsync = async (app) => {
  const db = app.prisma;
  const now = () => new Date();

  app.get('/sitemap', async () => {
    const [pages, homilies, events, albums] = await Promise.all([
      db.page.findMany({ where: { status: 'PUBLISHED', publishedAt: { lte: now() } }, select: { slug: true, locale: true, updatedAt: true } }),
      db.homily.findMany({ where: { status: 'PUBLISHED', publishedAt: { lte: now() } }, select: { id: true, updatedAt: true } }),
      db.event.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, updatedAt: true }, orderBy: { startsAt: 'desc' }, take: 500 }),
      db.album.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
    ]);
    return { pages, homilies, events, albums };
  });

  // Langues dans lesquelles une page publiée existe (sélecteur de langue).
  app.get('/pages/:slug/locales', async (req) => {
    const { slug } = z.object({ slug: z.string().max(191) }).parse(req.params);
    const rows = await db.page.findMany({ where: { slug, status: 'PUBLISHED', publishedAt: { lte: now() } }, select: { locale: true } });
    return { locales: rows.map((r) => r.locale).sort() };
  });
};

export default seo;
