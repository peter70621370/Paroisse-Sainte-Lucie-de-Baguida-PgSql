import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { DONATION_STATUS_LABEL, METHOD_LABEL, toXof, type Method } from '../config/donations.js';
import { HttpError } from '../utils/errors.js';
import { applyCheck } from '../services/donations.js';

const filters = z.object({
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED']).optional(),
  method: z.enum(['MOBILE_MONEY', 'CARD', 'PAYPAL']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().trim().max(100).optional(),
});
const listQuery = filters.extend({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });
const idParam = z.object({ id: z.coerce.number().int().positive() });

const csvCell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const view = (d: Prisma.DonationGetPayload<{ include: { campaign: { select: { title: true } } } }>) => ({
  id: d.id, reference: d.reference, amount: d.amount, currency: d.currency, status: d.status, statusLabel: DONATION_STATUS_LABEL[d.status],
  method: d.method, methodLabel: METHOD_LABEL[d.method as Method] ?? d.provider, provider: d.provider,
  donorName: d.donorName, donorEmail: d.donorEmail, donorPhone: d.donorPhone, message: d.message, note: d.note,
  campaign: d.campaign?.title ?? null, paidAt: d.paidAt, createdAt: d.createdAt,
});

// Données financières et personnelles : réservées aux administrateurs et éditeurs.
const adminDonations: FastifyPluginAsync = async (app) => {
  const guard = app.requireAuth(['ADMIN', 'EDITOR']);
  const db = app.prisma;

  const whereOf = (f: z.infer<typeof filters>): Prisma.DonationWhereInput => ({
    ...(f.status ? { status: f.status } : {}),
    ...(f.method ? { method: f.method } : {}),
    ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: new Date(`${f.from}T00:00:00Z`) } : {}), ...(f.to ? { lt: new Date(new Date(`${f.to}T00:00:00Z`).getTime() + 86_400_000) } : {}) } } : {}),
    ...(f.q ? { OR: [{ donorName: { contains: f.q, mode: 'insensitive' as const } }, { donorEmail: { contains: f.q, mode: 'insensitive' as const } }, { reference: { contains: f.q, mode: 'insensitive' as const } }] } : {}),
  });
  const include = { campaign: { select: { title: true } } } as const;

  app.get('/admin/donations', { preHandler: guard }, async (req) => {
    const { page, pageSize, ...f } = listQuery.parse(req.query);
    const where = whereOf(f);
    const [total, items] = await Promise.all([
      db.donation.count({ where }),
      db.donation.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { total, page, pageSize, items: items.map(view) };
  });

  app.get('/admin/donations/summary', { preHandler: guard }, async () => {
    const rows = await db.donation.groupBy({ by: ['status', 'currency'], _sum: { amount: true }, _count: { _all: true } });
    const succeeded = rows.filter((r) => r.status === 'SUCCEEDED');
    const byCurrency = Object.fromEntries(succeeded.map((r) => [r.currency, { count: r._count._all, total: r._sum.amount ?? 0 }]));
    const stale = await db.donation.count({ where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } });
    return {
      byCurrency,
      totalXof: succeeded.reduce((n, r) => n + toXof(r._sum.amount ?? 0, r.currency), 0),
      count: succeeded.reduce((n, r) => n + r._count._all, 0),
      pending: rows.filter((r) => r.status === 'PENDING').reduce((n, r) => n + r._count._all, 0),
      stalePending: stale,
    };
  });

  app.get('/admin/donations/export.csv', { preHandler: guard }, async (req, reply) => {
    const items = await db.donation.findMany({ where: whereOf(filters.parse(req.query)), include, orderBy: { createdAt: 'desc' }, take: 10_000 });
    const header = ['Date', 'Référence', 'Statut', 'Montant', 'Devise', 'Moyen', 'Donateur', 'E-mail', 'Téléphone', 'Campagne', 'Message', 'Note'];
    const rows = items.map((d) => [d.createdAt.toISOString(), d.reference, DONATION_STATUS_LABEL[d.status], d.amount, d.currency, METHOD_LABEL[d.method as Method] ?? d.provider, d.donorName, d.donorEmail, d.donorPhone, d.campaign?.title, d.message, d.note]);
    const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="dons-${new Date().toISOString().slice(0, 10)}.csv"`)
      .send(csv);
  });

  app.get('/admin/donations/:id', { preHandler: guard }, async (req) => {
    const { id } = idParam.parse(req.params);
    const d = await db.donation.findUnique({ where: { id }, include });
    if (!d) throw new HttpError(404, 'Don introuvable');
    return { item: view(d) };
  });

  // Relance la vérification auprès du prestataire (don resté « en attente »).
  app.post('/admin/donations/:id/recheck', { preHandler: guard }, async (req) => {
    const { id } = idParam.parse(req.params);
    const d = await db.donation.findUnique({ where: { id } });
    if (!d) throw new HttpError(404, 'Don introuvable');
    await applyCheck(app, d);
    return { item: view((await db.donation.findUniqueOrThrow({ where: { id }, include }))) };
  });
};

export default adminDonations;
