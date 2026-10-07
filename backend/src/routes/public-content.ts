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

  // Langue demandée par le site (« en » = version anglaise si elle est renseignée, sinon français).
  const localeOf = (query: unknown) => z.object({ locale: z.string().regex(/^[a-z]{2}$/).default('fr') }).passthrough().parse(query).locale;

  app.get('/announcements', async (req) => {
    const en = localeOf(req.query) === 'en';
    const now = new Date();
    const items = await db.announcement.findMany({
      where: { ...visible(), OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      take: 30,
    });
    return { items: items.map((a) => ({ id: a.id, title: (en && a.titleEn) || a.title, content: (en && a.contentEn) || a.content, pinned: a.pinned, publishedAt: a.publishedAt })) };
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

  // ---- Agenda ----
  const dayParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const eventOut = (e: { id: number; title: string; description: string | null; location: string | null; titleEn: string | null; descriptionEn: string | null; locationEn: string | null; startsAt: Date; endsAt: Date | null; allDay: boolean; category: { name: string; slug: string; color: string | null } | null }, en = false) => ({
    id: e.id, title: (en && e.titleEn) || e.title, description: (en && e.descriptionEn) || e.description, location: (en && e.locationEn) || e.location, startsAt: e.startsAt, endsAt: e.endsAt, allDay: e.allDay,
    category: e.category ? { name: e.category.name, slug: e.category.slug, color: e.category.color } : null,
  });

  app.get('/event-categories', async () => ({
    items: (await db.eventCategory.findMany({ orderBy: { name: 'asc' } })).map(({ id, name, slug, color }) => ({ id, name, slug, color })),
  }));

  // Événements publiés d'une période (défaut : 90 jours à partir d'aujourd'hui). Inclut ceux qui ont commencé avant et se terminent dans la période.
  app.get('/events', async (req) => {
    const q = z.object({ from: dayParam.optional(), to: dayParam.optional(), category: z.string().max(100).optional(), locale: z.string().regex(/^[a-z]{2}$/).optional() }).parse(req.query);
    const from = new Date(`${q.from ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const to = q.to ? new Date(`${q.to}T00:00:00Z`) : new Date(from.getTime() + 90 * 86_400_000);
    if (to < from || to.getTime() - from.getTime() > 400 * 86_400_000) throw new HttpError(400, 'Période invalide (400 jours maximum)');
    const end = new Date(to.getTime() + 86_400_000); // fin de journée incluse
    const items = await db.event.findMany({
      where: {
        status: 'PUBLISHED',
        startsAt: { lt: end },
        OR: [{ startsAt: { gte: from } }, { endsAt: { gte: from } }],
        ...(q.category ? { category: { slug: q.category } } : {}),
      },
      include: { category: true },
      orderBy: { startsAt: 'asc' },
      take: 500,
    });
    return { items: items.map((e) => eventOut(e, q.locale === 'en')) };
  });

  app.get('/events/:id', async (req) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const e = await db.event.findFirst({ where: { id, status: 'PUBLISHED' }, include: { category: true } });
    if (!e) throw new HttpError(404, 'Événement introuvable');
    return { event: eventOut(e, localeOf(req.query) === 'en') };
  });

  app.get('/homilies/:id', async (req) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
    const h = await db.homily.findFirst({ where: { id, ...visible() } });
    if (!h) throw new HttpError(404, 'Homélie introuvable');
    return { homily: { id: h.id, title: h.title, preacher: h.preacher, date: h.date, content: h.content, audioUrl: h.audioUrl, videoUrl: h.videoUrl } };
  });
};

export default publicContent;
