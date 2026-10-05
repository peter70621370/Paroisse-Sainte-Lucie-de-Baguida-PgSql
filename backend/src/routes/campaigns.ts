import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { toXof } from '../config/donations.js';
import { HttpError } from '../utils/errors.js';

// Campagnes de collecte (construction, œuvres caritatives…) : liste publique avec progression.
const campaigns: FastifyPluginAsync = async (app) => {
  const db = app.prisma;

  const active = () => {
    const now = new Date();
    return { status: 'PUBLISHED' as const, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] };
  };

  async function withProgress<T extends { id: number }>(items: T[]) {
    if (!items.length) return [];
    const sums = await db.donation.groupBy({
      by: ['campaignId', 'currency'],
      where: { status: 'SUCCEEDED', campaignId: { in: items.map((c) => c.id) } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    return items.map((c) => {
      const mine = sums.filter((s) => s.campaignId === c.id);
      // Les dons PayPal (EUR) sont convertis au taux fixe du franc CFA pour la progression.
      const raised = mine.reduce((n, s) => n + toXof(s._sum.amount ?? 0, s.currency), 0);
      return { ...c, raised, donors: mine.reduce((n, s) => n + s._count._all, 0) };
    });
  }

  const out = (c: { slug: string; title: string; description: string | null; goalAmount: number | null; currency: string; endsAt: Date | null; raised: number; donors: number }) => ({
    slug: c.slug, title: c.title, description: c.description, goalAmount: c.goalAmount, currency: c.currency, endsAt: c.endsAt,
    raised: c.raised, donors: c.donors,
    percent: c.goalAmount ? Math.min(100, Math.floor((c.raised / c.goalAmount) * 100)) : null,
  });

  app.get('/campaigns', async () => {
    const items = await db.campaign.findMany({ where: active(), orderBy: { createdAt: 'desc' } });
    return { items: (await withProgress(items)).map(out) };
  });

  app.get('/campaigns/:slug', async (req) => {
    const { slug } = z.object({ slug: z.string().max(191) }).parse(req.params);
    const c = await db.campaign.findFirst({ where: { slug, ...active() } });
    if (!c) throw new HttpError(404, 'Campagne introuvable');
    return { campaign: out((await withProgress([c]))[0]!) };
  });
};

export default campaigns;
