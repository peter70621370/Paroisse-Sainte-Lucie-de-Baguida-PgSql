import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { del, put } from '@vercel/blob';

declare module 'fastify' {
  interface FastifyInstance {
    storage: Storage;
  }
}

/**
 * Stockage des fichiers de la médiathèque : disque local (développement, Docker) ou Vercel Blob (déploiement sur Vercel,
 * dès que BLOB_READ_WRITE_TOKEN est défini). Les chemins enregistrés en base sont identiques : « 2026/10/<uuid>.webp ».
 */
export type Storage = {
  blob: boolean;
  save(storagePath: string, data: Buffer, contentType: string): Promise<void>;
  /** Contenu du fichier, ou null s'il n'existe pas. */
  read(storagePath: string): Promise<Buffer | null>;
  exists(storagePath: string): Promise<boolean>;
  remove(storagePaths: string[]): Promise<void>;
  /** Adresse publique d'un fichier Vercel Blob (null sur disque : servi par /uploads/…). */
  publicUrl(storagePath: string): string | null;
};

export function createStorage(opts: { uploadDir: string; blobToken?: string }): Storage {
  const token = opts.blobToken?.trim();
  if (token) return blobStorage(token);

  const root = path.resolve(opts.uploadDir);
  const file = (p: string) => path.join(root, p);
  return {
    blob: false,
    async save(p, data) {
      await mkdir(path.dirname(file(p)), { recursive: true });
      await writeFile(file(p), data);
    },
    read: (p) => readFile(file(p)).catch(() => null),
    exists: (p) => stat(file(p)).then(() => true, () => false),
    async remove(paths) {
      await Promise.all(paths.map((p) => unlink(file(p)).catch(() => undefined)));
    },
    publicUrl: () => null,
  };
}

function blobStorage(token: string): Storage {
  // Même construction que la bibliothèque @vercel/blob : l'identifiant du magasin est le 4e segment du jeton.
  const storeId = token.split('_')[3] ?? '';
  const url = (p: string) => `https://${storeId}.public.blob.vercel-storage.com/${p}`;
  return {
    blob: true,
    async save(p, data, contentType) {
      // Noms aléatoires : jamais modifiés, donc cache d'un an.
      await put(p, data, { access: 'public', token, contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31_536_000 });
    },
    async read(p) {
      const res = await fetch(url(p));
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    },
    async exists(p) {
      return (await fetch(url(p), { method: 'HEAD' })).ok;
    },
    async remove(paths) {
      if (paths.length) await del(paths.map(url), { token }).catch(() => undefined);
    },
    publicUrl: url,
  };
}
