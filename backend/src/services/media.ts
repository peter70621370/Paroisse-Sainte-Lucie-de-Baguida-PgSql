import { randomUUID } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { HttpError } from '../utils/errors.js';
import type { Storage } from './storage.js';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export type StoredFile = { storagePath: string; mimeType: string; size: number; filename: string };

export const thumbPathOf = (storagePath: string) =>
  storagePath.endsWith('.webp') ? storagePath.replace(/\.webp$/, '.thumb.webp') : null;

function cleanName(name: string, forceExt?: string) {
  const base = path.basename(name).replace(/[^\w.\- ()àâäéèêëîïôöùûüç]/gi, '_').slice(0, 200) || 'fichier';
  return forceExt ? base.replace(/\.[^.]*$/, '') + forceExt : base;
}

/**
 * Vérifie le vrai type du fichier (octets), optimise les images en WebP et l'enregistre (disque ou Vercel Blob).
 * `at` : emplacement d'un fichier déjà connu de la base, à réécrire à l'identique (fichier disparu du disque).
 */
export async function storeUpload(storage: Storage, buffer: Buffer, originalName: string, at?: string): Promise<StoredFile> {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || (!IMAGE_TYPES.has(type.mime) && type.mime !== 'application/pdf')) {
    throw new HttpError(415, 'Type de fichier non autorisé (images JPG, PNG, WebP, GIF ou PDF uniquement)');
  }

  const now = new Date();
  const dir = at ? path.posix.dirname(at) : `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const id = at ? path.posix.basename(at).replace(/\.[^.]*$/, '') : randomUUID();

  if (type.mime === 'application/pdf') {
    const storagePath = `${dir}/${id}.pdf`;
    await storage.save(storagePath, buffer, 'application/pdf');
    return { storagePath, mimeType: 'application/pdf', size: buffer.length, filename: cleanName(originalName) };
  }

  const animated = type.mime === 'image/gif';
  let main: Buffer;
  let thumb: Buffer;
  try {
    main = await sharp(buffer, { animated })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    thumb = await sharp(buffer)
      .rotate()
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
  } catch {
    throw new HttpError(422, 'Image illisible ou corrompue');
  }

  const storagePath = `${dir}/${id}.webp`;
  await storage.save(storagePath, main, 'image/webp');
  await storage.save(thumbPathOf(storagePath)!, thumb, 'image/webp');
  return { storagePath, mimeType: 'image/webp', size: main.length, filename: cleanName(originalName, '.webp') };
}

export async function removeStoredFiles(storage: Storage, storagePath: string) {
  await storage.remove([storagePath, thumbPathOf(storagePath)].filter((f): f is string => !!f));
}
