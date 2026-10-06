import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import sharp from 'sharp';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { HttpError } from '../utils/errors.js';

// Largeurs autorisées (liste fermée : impossible de saturer le disque ou le processeur avec des tailles arbitraires).
export const IMAGE_WIDTHS = [320, 480, 640, 800, 1024, 1280, 1600] as const;

const query = z.object({
  // Uniquement un fichier WebP de la médiathèque : pas de « .. », pas d'autre dossier.
  src: z.string().regex(/^\/uploads\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/, 'Image de la médiathèque attendue'),
  w: z.coerce.number().refine((n) => (IMAGE_WIDTHS as readonly number[]).includes(n), 'Largeur non autorisée'),
});

/**
 * Versions réduites à la demande d'une image de la médiathèque (pour les écrans de téléphone).
 * Créées une fois, puis servies depuis le disque avec un cache d'un an (les noms de fichiers sont uniques).
 */
const image: FastifyPluginAsync<{ env: Env }> = async (app, { env }) => {
  const root = path.resolve(env.UPLOAD_DIR);

  app.get('/image', async (req, reply) => {
    const { src, w } = query.parse(req.query);
    const rel = src.replace(/^\/uploads\//, '');
    const original = path.join(root, rel);
    const cached = path.join(root, '.cache', String(w), rel);
    if (!original.startsWith(root + path.sep)) throw new HttpError(400, 'Chemin invalide'); // ceinture et bretelles

    let data: Buffer;
    try {
      data = await readFile(cached);
    } catch {
      let source: Buffer;
      try {
        await stat(original);
        source = await readFile(original);
      } catch {
        throw new HttpError(404, 'Image introuvable');
      }
      data = await sharp(source).resize({ width: w, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
      await mkdir(path.dirname(cached), { recursive: true });
      await writeFile(cached, data);
    }
    return reply
      .header('Content-Type', 'image/webp')
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(data);
  });
};

export default image;
