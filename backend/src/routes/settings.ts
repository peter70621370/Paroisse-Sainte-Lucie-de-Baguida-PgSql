import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PUBLIC_SETTING_KEYS, SETTINGS, SETTING_KEYS, type SettingKey } from '../config/settings.js';

async function readSettings(prisma: import('@prisma/client').PrismaClient, keys: readonly SettingKey[]) {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...keys] } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(keys.map((k) => [k, map.get(k) ?? ''])) as Record<SettingKey, string>;
}

const putBody = z
  .object(Object.fromEntries(SETTING_KEYS.map((k) => [k, z.string().trim().max(500)])) as Record<SettingKey, z.ZodString>)
  .partial()
  .strict();

const settingsRoutes: FastifyPluginAsync = async (app) => {
  // Public : coordonnées et réseaux sociaux (pied de page, page contact).
  app.get('/settings', async () => ({ settings: await readSettings(app.prisma, PUBLIC_SETTING_KEYS) }));

  app.get('/admin/settings', { preHandler: app.requireAuth(['ADMIN', 'EDITOR']) }, async () => ({
    settings: await readSettings(app.prisma, SETTING_KEYS),
    labels: Object.fromEntries(SETTING_KEYS.map((k) => [k, SETTINGS[k].label])),
  }));

  app.put('/admin/settings', { preHandler: app.requireAuth(['ADMIN', 'EDITOR']) }, async (req) => {
    const body = putBody.parse(req.body);
    await app.prisma.$transaction(
      Object.entries(body).map(([key, value]) =>
        app.prisma.setting.upsert({ where: { key }, update: { value: value! }, create: { key, value: value! } }),
      ),
    );
    return { settings: await readSettings(app.prisma, SETTING_KEYS) };
  });
};

export default settingsRoutes;
