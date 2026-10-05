import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../utils/errors.js';
import { cleanHtml } from '../utils/html.js';
import { thumbPathOf } from '../services/media.js';

// ---------- Schémas ----------
const dateTime = z.string().datetime({ offset: true }).transform((s) => new Date(s));
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ').transform((s) => new Date(`${s}T00:00:00Z`));
const status = z.enum(['DRAFT', 'PUBLISHED']);
const optText = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);
const html = (max: number) => z.string().max(max).transform(cleanHtml);
const url = z.string().trim().url().max(500).refine((u) => /^https?:\/\//i.test(u), 'URL http(s) attendue');
const optUrl = z.union([url, z.literal(''), z.null()]).optional().transform((v) => v || null);

const pageSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lettres minuscules, chiffres et tirets uniquement').max(191),
  locale: z.string().trim().regex(/^[a-z]{2}$/).default('fr'),
  title: z.string().trim().min(1).max(255),
  excerpt: optText(500),
  content: html(300_000),
  status: status.default('DRAFT'),
  seoTitle: optText(255),
  seoDescription: optText(320),
  publishedAt: dateTime.nullish(),
});

const announcementSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: html(100_000),
  pinned: z.boolean().default(false),
  status: status.default('DRAFT'),
  publishedAt: dateTime.nullish(),
  expiresAt: dateTime.nullish(),
});

const bulletinSchema = z.object({
  title: z.string().trim().min(1).max(255),
  date: dateOnly,
  fileId: z.number().int().positive(),
  status: status.default('DRAFT'),
});

const massScheduleSchema = z.object({
  weekday: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure attendue au format HH:MM'),
  kind: z.enum(['MASS', 'CONFESSION', 'ADORATION', 'OTHER']).default('MASS'),
  language: optText(50),
  location: optText(255),
  notes: optText(255),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const staffSchema = z.object({
  fullName: z.string().trim().min(1).max(150),
  function: z.string().trim().min(1).max(150),
  bio: optText(5000),
  photoId: z.number().int().positive().nullish(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const homilySchema = z.object({
  title: z.string().trim().min(1).max(255),
  preacher: optText(150),
  date: dateOnly,
  content: html(200_000).nullish(),
  audioUrl: optUrl,
  videoUrl: optUrl,
  status: status.default('DRAFT'),
  publishedAt: dateTime.nullish(),
});

const eventSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: optText(5000),
  location: optText(255),
  startsAt: dateTime,
  endsAt: dateTime.nullish(),
  allDay: z.boolean().default(false),
  categoryId: z.number().int().positive().nullish(),
  status: status.default('DRAFT'),
});

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lettres minuscules, chiffres et tirets uniquement').max(100),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur au format #RRGGBB').nullish().transform((v) => v || null),
});

const campaignSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lettres minuscules, chiffres et tirets uniquement').max(191),
  description: optText(5000),
  goalAmount: z.number().int().positive().max(1_000_000_000).nullish(),
  startsAt: dateTime.nullish(),
  endsAt: dateTime.nullish(),
  status: status.default('DRAFT'),
});

const albumSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lettres minuscules, chiffres et tirets uniquement').max(191),
  description: optText(5000),
  date: dateOnly.nullish(),
  coverId: z.number().int().positive().nullish(),
  status: status.default('DRAFT'),
});

// ---------- Fabrique CRUD ----------
type Row = Record<string, any>;
type Delegate = {
  findMany(a: object): Promise<Row[]>;
  count(a: object): Promise<number>;
  findUnique(a: object): Promise<Row | null>;
  create(a: object): Promise<Row>;
  update(a: object): Promise<Row>;
  delete(a: object): Promise<Row>;
};

type Resource = {
  path: string;
  delegate: Delegate;
  schema: z.ZodObject<any>;
  /** La ressource a un statut brouillon/publié : les contributeurs peuvent y écrire, mais seulement des brouillons. */
  hasStatus: boolean;
  /** Renseigne authorId à la création. */
  author?: boolean;
  searchField?: string;
  orderBy: object;
  include?: object;
  /** La ressource a une colonne publishedAt (sinon : statut seul). */
  publishDate?: boolean;
  prepare?: (data: Row, existing: Row | null) => Promise<void>;
  present?: (row: Row) => Row;
};

const idParam = z.object({ id: z.coerce.number().int().positive() });
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: status.optional(),
  q: z.string().trim().max(100).optional(),
});

function register(app: FastifyInstance, r: Resource) {
  const staff = app.requireAuth(); // lecture : tout utilisateur connecté
  const present = r.present ?? ((x: Row) => x);

  // Règles d'écriture : admin/éditeur partout ; contributeur uniquement sur des brouillons.
  const assertCanWrite = (role: string, existing: Row | null, data: Row, userId: number) => {
    if (role === 'ADMIN' || role === 'EDITOR') return;
    if (!r.hasStatus) throw new HttpError(403, 'Accès refusé');
    if (data.status === 'PUBLISHED') throw new HttpError(403, 'Seul un éditeur peut publier');
    if (existing && (existing.status !== 'DRAFT' || (r.author && existing.authorId !== userId))) {
      throw new HttpError(403, 'Vous ne pouvez modifier que vos propres brouillons');
    }
  };

  // Publication : une date de publication est posée automatiquement (une date future = publication programmée).
  const applyPublish = (data: Row, existing: Row | null) => {
    if (r.publishDate !== false && data.status === 'PUBLISHED') {
      const at = data.publishedAt !== undefined ? data.publishedAt : existing?.publishedAt;
      if (!at) data.publishedAt = new Date();
    }
  };

  const wrap = async <T>(fn: () => Promise<T>) => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') throw new HttpError(409, 'Un élément identique existe déjà (même adresse / même langue)');
        if (e.code === 'P2025') throw new HttpError(404, 'Introuvable');
        if (e.code === 'P2003') throw new HttpError(400, 'Référence invalide');
      }
      throw e;
    }
  };

  app.get(`/admin/${r.path}`, { preHandler: staff }, async (req) => {
    const { page, pageSize, status: st, q } = listQuery.parse(req.query);
    const where: Row = { ...(st && r.hasStatus ? { status: st } : {}), ...(q && r.searchField ? { [r.searchField]: { contains: q } } : {}) };
    const [total, items] = await Promise.all([
      r.delegate.count({ where }),
      r.delegate.findMany({ where, orderBy: r.orderBy, include: r.include, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { total, page, pageSize, items: items.map(present) };
  });

  app.get(`/admin/${r.path}/:id`, { preHandler: staff }, async (req) => {
    const { id } = idParam.parse(req.params);
    const item = await r.delegate.findUnique({ where: { id }, include: r.include });
    if (!item) throw new HttpError(404, 'Introuvable');
    return { item: present(item) };
  });

  app.post(`/admin/${r.path}`, { preHandler: staff }, async (req, reply) => {
    const data: Row = r.schema.parse(req.body);
    assertCanWrite(req.user!.role, null, data, req.user!.id);
    await r.prepare?.(data, null);
    applyPublish(data, null);
    if (r.author) data.authorId = req.user!.id;
    const item = await wrap(() => r.delegate.create({ data, include: r.include }));
    return reply.code(201).send({ item: present(item) });
  });

  app.patch(`/admin/${r.path}/:id`, { preHandler: staff }, async (req) => {
    const { id } = idParam.parse(req.params);
    const data: Row = r.schema.partial().parse(req.body);
    const existing = await r.delegate.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Introuvable');
    assertCanWrite(req.user!.role, existing, data, req.user!.id);
    await r.prepare?.(data, existing);
    applyPublish(data, existing);
    const item = await wrap(() => r.delegate.update({ where: { id }, data, include: r.include }));
    return { item: present(item) };
  });

  app.delete(`/admin/${r.path}/:id`, { preHandler: app.requireAuth(['ADMIN', 'EDITOR']) }, async (req) => {
    const { id } = idParam.parse(req.params);
    await wrap(() => r.delegate.delete({ where: { id } }));
    return { ok: true };
  });
}

const mediaOut = (m: Row | null) =>
  m ? { id: m.id, filename: m.filename, url: `/uploads/${m.storagePath}`, thumbUrl: thumbPathOf(m.storagePath) ? `/uploads/${thumbPathOf(m.storagePath)}` : null } : null;

const adminContent: FastifyPluginAsync = async (app) => {
  const db = app.prisma;
  const asDelegate = (d: unknown) => d as Delegate;

  const requireMedia = async (id: number | null | undefined, kind: 'pdf' | 'image') => {
    if (id == null) return;
    const m = await db.media.findUnique({ where: { id } });
    const ok = m && (kind === 'pdf' ? m.mimeType === 'application/pdf' : m.mimeType.startsWith('image/'));
    if (!ok) throw new HttpError(400, kind === 'pdf' ? 'Le fichier choisi doit être un PDF de la médiathèque' : 'La photo choisie doit être une image de la médiathèque');
  };

  register(app, { path: 'pages', delegate: asDelegate(db.page), schema: pageSchema, hasStatus: true, author: true, searchField: 'title', orderBy: { updatedAt: 'desc' } });
  register(app, { path: 'announcements', delegate: asDelegate(db.announcement), schema: announcementSchema, hasStatus: true, author: true, searchField: 'title', orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] });
  register(app, {
    path: 'bulletins', delegate: asDelegate(db.bulletin), schema: bulletinSchema, hasStatus: true, searchField: 'title',
    orderBy: { date: 'desc' }, include: { file: true },
    prepare: async (d) => requireMedia(d.fileId, 'pdf'),
    present: (b) => ({ ...b, file: mediaOut(b.file) }),
  });
  register(app, { path: 'mass-schedules', delegate: asDelegate(db.massSchedule), schema: massScheduleSchema, hasStatus: false, orderBy: [{ weekday: 'asc' }, { time: 'asc' }] });
  register(app, {
    path: 'staff', delegate: asDelegate(db.staffMember), schema: staffSchema, hasStatus: false, searchField: 'fullName',
    orderBy: [{ sortOrder: 'asc' }, { fullName: 'asc' }], include: { photo: true },
    prepare: async (d) => requireMedia(d.photoId, 'image'),
    present: (s) => ({ ...s, photo: mediaOut(s.photo) }),
  });
  register(app, {
    path: 'events', delegate: asDelegate(db.event), schema: eventSchema, hasStatus: true, publishDate: false, searchField: 'title',
    orderBy: { startsAt: 'desc' }, include: { category: true },
    prepare: async (d, existing) => {
      const start = d.startsAt ?? existing?.startsAt;
      const end = d.endsAt !== undefined ? d.endsAt : existing?.endsAt;
      if (start && end && end < start) throw new HttpError(400, 'La fin doit être après le début');
      if (d.categoryId) {
        if (!(await db.eventCategory.findUnique({ where: { id: d.categoryId } }))) throw new HttpError(400, 'Catégorie inconnue');
      }
    },
  });
  register(app, {
    path: 'campaigns', delegate: asDelegate(db.campaign), schema: campaignSchema, hasStatus: true, publishDate: false, searchField: 'title', orderBy: { createdAt: 'desc' },
    prepare: async (d, existing) => {
      const s = d.startsAt !== undefined ? d.startsAt : existing?.startsAt;
      const e = d.endsAt !== undefined ? d.endsAt : existing?.endsAt;
      if (s && e && e < s) throw new HttpError(400, 'La fin doit être après le début');
    },
  });
  register(app, {
    path: 'albums', delegate: asDelegate(db.album), schema: albumSchema, hasStatus: true, publishDate: false, searchField: 'title', orderBy: { createdAt: 'desc' },
    include: { cover: true, items: { orderBy: { sortOrder: 'asc' }, include: { media: true } } },
    prepare: async (d) => requireMedia(d.coverId, 'image'),
    present: (a) => ({
      ...a,
      cover: mediaOut(a.cover),
      items: (a.items as Row[]).map((i) => ({ id: i.id, type: i.videoUrl ? 'video' : 'image', caption: i.caption, sortOrder: i.sortOrder, videoUrl: i.videoUrl, ...(i.media ? { url: `/uploads/${i.media.storagePath}`, thumbUrl: thumbPathOf(i.media.storagePath) ? `/uploads/${thumbPathOf(i.media.storagePath)}` : null } : { url: null, thumbUrl: null }) })),
    }),
  });
  register(app, { path: 'event-categories', delegate: asDelegate(db.eventCategory), schema: categorySchema, hasStatus: false, searchField: 'name', orderBy: { name: 'asc' } });
  register(app, { path: 'homilies', delegate: asDelegate(db.homily), schema: homilySchema, hasStatus: true, author: true, searchField: 'title', orderBy: { date: 'desc' } });
};

export default adminContent;
