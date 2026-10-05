import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../utils/errors.js';
import { thumbPathOf } from '../services/media.js';

const mediaOut = (m: { storagePath: string } | null) =>
  m ? { url: `/uploads/${m.storagePath}`, thumbUrl: thumbPathOf(m.storagePath) ? `/uploads/${thumbPathOf(m.storagePath)}` : null } : null;

const paging = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

// Contenus visibles du public : publiés ET dont la date de publication est passée (publication programmable).
const publicContent: FastifyPluginAsync = async (app) => {
  const db = app.prisma;
  const visible = () => ({ status: 'PUBLISHED' as const, publishedAt: { lte: new Date() } });

  app.get('/pages/:slug', async (req) => {
    const { slug } = z.object({ slug: z.string().max(191) }).parse(req.params);
    const { locale } = z.object({ locale: z.string().regex(/^[a-z]{2}$/).default('fr') }).parse(req.query);
    const page = await db.page.findFirst({ where: { slug, locale, ...visible() } });
    if (!page) throw new HttpError(404, 'Page introuvable');
    const { title, excerpt, content, seoTitle, seoDescription, publishedAt, updatedAt } = page;
    return { page: { slug, locale, title, excerpt, content, seoTitle, seoDescription, publishedAt, updatedAt } };
  });

  app.get('/announcements', async () => {
    const now = new Date();
    const items = await db.announcement.findMany({
      where: { ...visible(), OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      take: 30,
    });
    return { items: items.map(({ id, title, content, pinned, publishedAt }) => ({ id, title, content, pinned, publishedAt })) };
  });

  app.get('/bulletins', async (req) => {
    const { page, pageSize } = paging.parse(req.query);
    const where = visible();
    const [total, items] = await Promise.all([
      db.bulletin.count({ where }),
      db.bulletin.findMany({ where, orderBy: { date: 'desc' }, include: { file: true }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { total, page, pageSize, items: items.map((b) => ({ id: b.id, title: b.title, date: b.date, file: mediaOut(b.file) })) };
  });

  app.get('/mass-schedules', async () => {
    const items = await db.massSchedule.findMany({ where: { active: true }, orderBy: [{ weekday: 'asc' }, { time: 'asc' }, { sortOrder: 'asc' }] });
    return { items: items.map(({ id, weekday, time, kind, language, location, notes }) => ({ id, weekday, time, kind, language, location, notes })) };
  });

  app.get('/staff', async () => {
    const items = await db.staffMember.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { fullName: 'asc' }], include: { photo: true } });
    return { items: items.map((s) => ({ id: s.id, fullName: s.fullName, function: s.function, bio: s.bio, photo: mediaOut(s.photo) })) };
  });

  app.get('/homilies', async (req) => {
    const { page, pageSize } = paging.parse(req.query);
    const where = visible();
    const [total, items] = await Promise.all([
      db.homily.count({ where }),
      db.homily.findMany({ where, orderBy: { date: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { total, page, pageSize, items: items.map(({ id, title, preacher, date, audioUrl, videoUrl }) => ({ id, title, preacher, date, audioUrl, videoUrl })) };
  });

  app.get('/homilies/:id', async (req) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const h = await db.homily.findFirst({ where: { id, ...visible() } });
    if (!h) throw new HttpError(404, 'Homélie introuvable');
    return { homily: { id: h.id, title: h.title, preacher: h.preacher, date: h.date, content: h.content, audioUrl: h.audioUrl, videoUrl: h.videoUrl } };
  });
};

export default publicContent;
