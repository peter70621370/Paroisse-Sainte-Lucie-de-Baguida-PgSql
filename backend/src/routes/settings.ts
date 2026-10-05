import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { SETTINGS, SETTING_KEYS, settingType, type SettingKey } from '../config/settings.js';

async function readSettings(prisma: PrismaClient) {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(SETTING_KEYS.map((k) => [k, map.get(k) ?? ''])) as Record<SettingKey, string>;
}

// Une image de paramètre pointe forcément vers un fichier de la médiathèque (/uploads/…) ou est vide
// (= image provisoire par défaut).
const imageValue = z.string().trim().max(500).refine((v) => v === '' || (/^\/uploads\/[\w./-]+$/.test(v) && !v.includes('..')), 'Image de la médiathèque attendue');
const validators = Object.fromEntries(
  SETTING_KEYS.map((k) => [k, settingType(k) === 'image' ? imageValue : z.string().trim().max(settingType(k) === 'textarea' ? 1000 : 500)]),
) as Record<SettingKey, z.ZodString>;
const putBody = z.object(validators).partial().strict();

const settingsRoutes: FastifyPluginAsync = async (app) => {
  // Public : identité, accueil, coordonnées, réseaux sociaux.
  app.get('/settings', async () => ({ settings: await readSettings(app.prisma) }));

  app.get('/admin/settings', { preHandler: app.requireAuth(['ADMIN', 'EDITOR']) }, async () => ({
    settings: await readSettings(app.prisma),
    fields: SETTING_KEYS.map((key) => ({ key, ...SETTINGS[key] })),
  }));

  app.put('/admin/settings', { preHandler: app.requireAuth(['ADMIN', 'EDITOR']) }, async (req) => {
    const body = putBody.parse(req.body);
    await app.prisma.$transaction(
      Object.entries(body).map(([key, value]) =>
        app.prisma.setting.upsert({ where: { key }, update: { value: value! }, create: { key, value: value! } }),
      ),
    );
    return { settings: await readSettings(app.prisma) };
  });
};

export default settingsRoutes;
