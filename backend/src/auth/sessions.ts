import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient, Role } from '@prisma/client';

export type SessionUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
};

export const SESSION_COOKIE = 'sid';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(
  prisma: PrismaClient,
  userId: number,
  ttlDays: number,
  meta: { userAgent?: string; ip?: string },
) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip?.slice(0, 64),
    },
  });
  return { token, expiresAt };
}

export async function findSessionUser(prisma: PrismaClient, token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  const { id, email, firstName, lastName, role } = session.user;
  return { id, email, firstName, lastName, role };
}

export async function deleteSession(prisma: PrismaClient, token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Ferme toutes les sessions d'un utilisateur sauf celle dont on donne le jeton. */
export async function deleteOtherSessions(prisma: PrismaClient, userId: number, keepToken: string) {
  await prisma.session.deleteMany({ where: { userId, tokenHash: { not: hashToken(keepToken) } } });
}

/** Supprime les sessions expirées (appelé au démarrage puis toutes les heures). Renvoie le nombre supprimé. */
export async function purgeExpiredSessions(prisma: PrismaClient): Promise<number> {
  const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return count;
}
