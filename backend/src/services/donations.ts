import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Donation } from '@prisma/client';
import { METHOD_LABEL, formatAmount, type Currency, type Method } from '../config/donations.js';
import { oneLine } from './mail.js';

declare module 'fastify' {
  interface FastifyInstance {
    env: import('../config/env.js').Env;
    payments: import('./payments/index.js').Payments;
  }
}

/** Référence publique d'un don : DON + date + 10 caractères aléatoires (alphanumérique, acceptée par les prestataires). */
export const newReference = () => `DON${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${randomBytes(5).toString('hex').toUpperCase()}`;
export const REFERENCE_RE = /^DON\d{8}[0-9A-F]{10}$/;

const isEmail = (s?: string | null): s is string => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * Interroge le prestataire et met à jour le don. Idempotent : seul un don EN ATTENTE peut changer d'état,
 * et les e-mails ne partent qu'au moment du passage à « réussi ».
 */
export async function applyCheck(app: FastifyInstance, donation: Donation): Promise<Donation> {
  if (donation.status !== 'PENDING') return donation;
  const provider = app.payments.byId(donation.provider);
  if (!provider) return donation;

  let result;
  try {
    result = await provider.check({ reference: donation.reference, providerRef: donation.providerRef, amount: donation.amount, currency: donation.currency as Currency });
  } catch (err) {
    app.log.error({ err, reference: donation.reference }, 'Vérification du paiement impossible');
    return donation; // reste en attente : une prochaine vérification réessaiera
  }

  if (result.status === 'PENDING') {
    if (result.providerRef && result.providerRef !== donation.providerRef) {
      return app.prisma.donation.update({ where: { id: donation.id }, data: { providerRef: result.providerRef } });
    }
    return donation;
  }

  const { count } = await app.prisma.donation.updateMany({
    where: { id: donation.id, status: 'PENDING' },
    data: {
      status: result.status,
      paidAt: result.status === 'SUCCEEDED' ? new Date() : null,
      ...(result.providerRef ? { providerRef: result.providerRef } : {}),
      ...(result.anomaly ? { note: result.anomaly.slice(0, 255) } : {}),
    },
  });
  const updated = await app.prisma.donation.findUniqueOrThrow({ where: { id: donation.id } });
  if (result.anomaly) app.log.error({ reference: donation.reference, anomaly: result.anomaly }, 'Anomalie de paiement');

  if (count === 1 && result.status === 'SUCCEEDED') await notifySuccess(app, updated);
  return updated;
}

async function notifySuccess(app: FastifyInstance, d: Donation) {
  const amount = formatAmount(d.amount, d.currency);
  const method = METHOD_LABEL[d.method as Method] ?? d.provider;

  if (isEmail(d.donorEmail)) {
    void app.mailer.send({
      to: d.donorEmail,
      subject: 'Merci pour votre don à la paroisse',
      text: `Bonjour ${oneLine(d.donorName ?? '')},\n\nNous avons bien reçu votre don de ${amount} (${method}). Merci de votre générosité !\n\nRéférence : ${d.reference}\n\nQue le Seigneur vous bénisse.\nParoisse Sainte Lucie de Baguida\n\nCe message est un accusé de réception ; il ne constitue pas un reçu fiscal.`,
    });
  }
  const setting = await app.prisma.setting.findUnique({ where: { key: 'site.contactEmail' } });
  const to = [setting?.value, app.env.NOTIFY_EMAIL].find(isEmail);
  if (to) {
    void app.mailer.send({ to, subject: `[Site] Nouveau don de ${amount}`, text: `Don de ${amount} reçu (${method}).\nDonateur : ${oneLine(d.donorName ?? 'anonyme')}\nRéférence : ${d.reference}\n\nDétails : Administration › Dons.` });
  }
}
