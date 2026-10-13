import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { FORM_TYPE_LABEL, LABELS_BY_TYPE, humanValue } from '../config/forms.js';
import { HttpError } from '../utils/errors.js';

const filters = z.object({
  type: z.enum(['CONTACT', 'MEMBERSHIP', 'CATECHISM', 'SACRAMENT', 'MASS_INTENTION']).optional(),
  status: z.enum(['NEW', 'PROCESSED', 'ARCHIVED']).optional(),
});
const listQuery = filters.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
});
const idParam = z.object({ id: z.coerce.number().int().positive() });

/** Neutralise l'injection de formules (Excel/LibreOffice) et échappe pour le CSV. */
const csvCell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const detailsOf = (type: string, payload: unknown) => {
  const labels = LABELS_BY_TYPE[type] ?? {};
  const data = (payload ?? {}) as Record<string, unknown>;
  return Object.entries(labels)
    .filter(([k]) => data[k] !== undefined && data[k] !== '')
    .map(([k, label]) => ({ key: k, label, value: humanValue(k, data[k]) }));
};

// Les demandes contiennent des données personnelles : réservées aux administrateurs et éditeurs.
const adminSubmissions: FastifyPluginAsync = async (app) => {
  const guard = app.requireAuth(['ADMIN', 'EDITOR']);
  const db = app.prisma;

  const whereOf = (f: z.infer<typeof filters>, q?: string): Prisma.FormSubmissionWhereInput => ({
    ...(f.type ? { type: f.type } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }, { phone: { contains: q, mode: 'insensitive' as const } }] } : {}),
  });

  app.get('/admin/submissions', { preHandler: guard }, async (req) => {
    const { page, pageSize, q, ...f } = listQuery.parse(req.query);
    const where = whereOf(f, q);
    const [total, items] = await Promise.all([
      db.formSubmission.count({ where }),
      db.formSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return {
      total, page, pageSize,
      items: items.map((s) => ({ id: s.id, type: s.type, typeLabel: FORM_TYPE_LABEL[s.type], status: s.status, fullName: s.fullName, email: s.email, phone: s.phone, createdAt: s.createdAt })),
    };
  });

  app.get('/admin/submissions/summary', { preHandler: guard }, async () => {
    const rows = await db.formSubmission.groupBy({ by: ['type'], where: { status: 'NEW' }, _count: { _all: true } });
    const byType = Object.fromEntries(rows.map((r) => [r.type, r._count._all]));
    return { new: rows.reduce((n, r) => n + r._count._all, 0), byType };
  });

  app.get('/admin/submissions/export.csv', { preHandler: guard }, async (req, reply) => {
    const where = whereOf(filters.parse(req.query));
    const items = await db.formSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, take: 5000 });
    const header = ['Date', 'Type', 'Statut', 'Nom', 'E-mail', 'Téléphone', 'Détails'];
    const rows = items.map((s) => [
      s.createdAt.toISOString(), FORM_TYPE_LABEL[s.type], s.status, s.fullName, s.email, s.phone,
      detailsOf(s.type, s.payload).map((d) => `${d.label} : ${d.value}`).join(' | '),
    ]);
    const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="demandes-${new Date().toISOString().slice(0, 10)}.csv"`)
      .send(csv);
  });

  app.get('/admin/submissions/:id', { preHandler: guard }, async (req) => {
    const { id } = idParam.parse(req.params);
    const s = await db.formSubmission.findUnique({ where: { id }, include: { handledBy: { select: { firstName: true, lastName: true } } } });
    if (!s) throw new HttpError(404, 'Demande introuvable');
    return {
      item: {
        id: s.id, type: s.type, typeLabel: FORM_TYPE_LABEL[s.type], status: s.status, fullName: s.fullName, email: s.email, phone: s.phone,
        createdAt: s.createdAt, handledAt: s.handledAt, handledBy: s.handledBy ? `${s.handledBy.firstName} ${s.handledBy.lastName}` : null,
        details: detailsOf(s.type, s.payload),
      },
    };
  });

  app.patch('/admin/submissions/:id', { preHandler: guard }, async (req) => {
    const { id } = idParam.parse(req.params);
    const { status } = z.object({ status: z.enum(['NEW', 'PROCESSED', 'ARCHIVED']) }).strict().parse(req.body);
    try {
      await db.formSubmission.update({
        where: { id },
        data: status === 'NEW' ? { status, handledById: null, handledAt: null } : { status, handledById: req.user!.id, handledAt: new Date() },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new HttpError(404, 'Demande introuvable');
      throw e;
    }
    return { ok: true };
  });

  app.delete('/admin/submissions/:id', { preHandler: app.requireAuth(['ADMIN']) }, async (req) => {
    const { id } = idParam.parse(req.params);
    try {
      await db.formSubmission.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new HttpError(404, 'Demande introuvable');
      throw e;
    }
    return { ok: true };
  });
};

export default adminSubmissions;
