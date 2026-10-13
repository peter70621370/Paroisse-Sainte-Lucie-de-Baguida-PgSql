import { createHash, randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// Mesure d'audience maison, respectueuse de la vie privée : aucun cookie, aucune adresse IP ni identifiant conservé.
// On ne stocke que des compteurs (vues par jour, page, site d'origine, type d'appareil).
// Les visiteurs uniques du jour sont comptés avec une empreinte (IP + navigateur + sel du jour) gardée UNIQUEMENT en mémoire
// et détruite à minuit : elle n'est jamais écrite en base.
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|python|headless/i;
const EXCLUDED = /^\/(admin|api|dons\/merci|dons\/simulation|newsletter)(\/|$)/;

const hitBody = z.object({ path: z.string().max(400), referrer: z.string().max(500).optional() });

const analytics: FastifyPluginAsync = async (app) => {
  const db = app.prisma;
  let today = '';
  let salt = '';
  let seen = new Set<string>();
  const rotate = (day: string) => {
    if (day !== today) { today = day; salt = randomBytes(16).toString('hex'); seen = new Set(); }
  };

  app.post('/analytics/hit', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (req, reply) => {
    const ua = String(req.headers['user-agent'] ?? '');
    // « Ne pas me suivre » activé, robots, requêtes sans navigateur : on ne compte pas.
    if (req.headers.dnt === '1' || !ua || BOT.test(ua)) return reply.code(204).send();

    const parsed = hitBody.safeParse(req.body);
    if (!parsed.success) return reply.code(204).send();
    const path = (parsed.data.path.split(/[?#]/)[0] ?? '/').replace(/\/+$/, '') || '/';
    if (!path.startsWith('/') || path.length > 255 || EXCLUDED.test(path)) return reply.code(204).send();

    let referrer = '';
    try {
      const host = new URL(parsed.data.referrer || '').hostname.replace(/^www\./, '');
      // Derrière un relais (Nuxt sur Render), l'en-tête Host est celui du réseau interne : on compare aussi à l'adresse publique.
      const own = [String(req.headers.host ?? '').split(':')[0]!, new URL(app.env.PUBLIC_URL).hostname].map((h) => h.replace(/^www\./, ''));
      if (host && !own.includes(host) && !/^localhost$/.test(host)) referrer = host.slice(0, 191);
    } catch { /* pas de référent */ }

    const device = /mobi|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop';
    const day = new Date().toISOString().slice(0, 10);
    rotate(day);
    const fingerprint = createHash('sha256').update(`${salt}|${req.ip}|${ua}`).digest('hex');
    const isNew = !seen.has(fingerprint);
    seen.add(fingerprint);

    const date = new Date(`${day}T00:00:00Z`);
    await db.pageView.upsert({
      where: { day_path_referrer_device: { day: date, path, referrer, device } },
      create: { day: date, path, referrer, device, views: 1 },
      update: { views: { increment: 1 } },
    });
    await db.dailyVisitors.upsert({
      where: { day: date },
      create: { day: date, views: 1, visitors: 1 },
      update: { views: { increment: 1 }, ...(isNew ? { visitors: { increment: 1 } } : {}) },
    });
    return reply.code(204).send();
  });

  app.get('/admin/analytics', { preHandler: app.requireAuth(['ADMIN', 'EDITOR']) }, async (req) => {
    const { days } = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }).parse(req.query);
    const to = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const from = new Date(to.getTime() - (days - 1) * 86_400_000);

    const [daily, pages, referrers, devices] = await Promise.all([
      db.dailyVisitors.findMany({ where: { day: { gte: from } }, orderBy: { day: 'asc' } }),
      db.pageView.groupBy({ by: ['path'], where: { day: { gte: from } }, _sum: { views: true }, orderBy: { _sum: { views: 'desc' } }, take: 10 }),
      db.pageView.groupBy({ by: ['referrer'], where: { day: { gte: from }, referrer: { not: '' } }, _sum: { views: true }, orderBy: { _sum: { views: 'desc' } }, take: 10 }),
      db.pageView.groupBy({ by: ['device'], where: { day: { gte: from } }, _sum: { views: true } }),
    ]);

    const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d]));
    const series = Array.from({ length: days }, (_, i) => {
      const key = new Date(from.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      const d = byDay.get(key);
      return { day: key, views: d?.views ?? 0, visitors: d?.visitors ?? 0 };
    });
    return {
      days,
      totals: { views: series.reduce((n, d) => n + d.views, 0), visitors: series.reduce((n, d) => n + d.visitors, 0) },
      series,
      topPages: pages.map((p) => ({ path: p.path, views: p._sum.views ?? 0 })),
      referrers: referrers.map((r) => ({ referrer: r.referrer, views: r._sum.views ?? 0 })),
      devices: devices.map((d) => ({ device: d.device, views: d._sum.views ?? 0 })),
    };
  });
};

export default analytics;
