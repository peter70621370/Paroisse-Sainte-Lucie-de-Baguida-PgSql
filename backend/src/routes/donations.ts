import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { LIMITS, METHOD_CURRENCY, METHOD_LABEL, type Method } from '../config/donations.js';
import { HttpError } from '../utils/errors.js';
import { REFERENCE_RE, applyCheck, newReference } from '../services/donations.js';

const text = (max: number) => z.string().trim().max(max);
const body = z
  .object({
    amount: z.number({ invalid_type_error: 'Montant invalide' }).int('Montant entier uniquement'),
    method: z.enum(['MOBILE_MONEY', 'CARD', 'PAYPAL'], { errorMap: () => ({ message: 'Moyen de paiement invalide' }) }),
    donorName: z.union([text(150), z.literal('')]).optional(),
    donorEmail: z.union([z.string().trim().toLowerCase().email('Adresse e-mail invalide').max(191), z.literal('')]).optional(),
    donorPhone: z.union([z.string().trim().min(6, 'Numéro trop court').max(40).regex(/^[0-9+()\s.-]+$/, 'Numéro de téléphone invalide'), z.literal('')]).optional(),
    message: z.union([text(500), z.literal('')]).optional(),
    campaign: z.union([text(191), z.literal('')]).optional(),
    consent: z.literal(true, { errorMap: () => ({ message: 'Vous devez accepter le traitement de vos données pour donner' }) }),
    website: z.string().max(200).optional(), // champ piège
  })
  .superRefine((d, ctx) => {
    const currency = METHOD_CURRENCY[d.method];
    const lim = LIMITS[currency];
    const fmt = (n: number) => (currency === 'EUR' ? `${n} €` : `${n.toLocaleString('fr-FR')} FCFA`);
    if (d.amount < lim.min) ctx.addIssue({ code: 'custom', path: ['amount'], message: `Montant minimum : ${fmt(lim.min)}` });
    else if (d.amount > lim.max) ctx.addIssue({ code: 'custom', path: ['amount'], message: `Montant maximum : ${fmt(lim.max)}` });
    else if (d.amount % lim.multipleOf !== 0) ctx.addIssue({ code: 'custom', path: ['amount'], message: `Le montant doit être un multiple de ${lim.multipleOf}` });
    // Mobile Money et carte (CinetPay) exigent l'identité du payeur.
    if (currency === 'XOF') {
      if (!d.donorName || d.donorName.length < 2) ctx.addIssue({ code: 'custom', path: ['donorName'], message: 'Nom requis pour ce moyen de paiement' });
      if (!d.donorPhone) ctx.addIssue({ code: 'custom', path: ['donorPhone'], message: 'Téléphone requis pour ce moyen de paiement' });
    }
  });

const refParam = z.object({ ref: z.string().regex(REFERENCE_RE) });

const publicView = (d: { reference: string; status: string; amount: number; currency: string; method: string | null }, campaign?: string | null) => ({
  reference: d.reference, status: d.status, amount: d.amount, currency: d.currency, method: d.method, campaign: campaign ?? null,
});

const donations: FastifyPluginAsync<{ env: Env }> = async (app, { env }) => {
  const db = app.prisma;

  // Moyens de paiement disponibles (selon les clés configurées).
  app.get('/donations/methods', async () => ({
    mode: env.PAYMENT_MODE,
    methods: app.payments.methods().map((m) => ({ method: m, label: METHOD_LABEL[m], currency: METHOD_CURRENCY[m], limits: LIMITS[METHOD_CURRENCY[m]] })),
  }));

  // Création d'un don : enregistre « en attente » puis renvoie l'adresse de paiement du prestataire.
  app.post('/donations', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const raw = (req.body ?? {}) as Record<string, unknown>;
    if (typeof raw.website === 'string' && raw.website.trim() !== '') return reply.code(201).send({ reference: 'DON00000000000000000', redirectUrl: env.PUBLIC_URL }); // robot : faux succès, rien d'enregistré
    const d = body.parse(raw);

    const method = d.method as Method;
    const provider = app.payments.forMethod(method);
    if (!provider) throw new HttpError(503, 'Ce moyen de paiement n\'est pas encore disponible');

    let campaignId: number | null = null;
    let campaignTitle: string | null = null;
    if (d.campaign) {
      const now = new Date();
      const c = await db.campaign.findFirst({
        where: { slug: d.campaign, status: 'PUBLISHED', AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      });
      if (!c) throw new HttpError(400, 'Campagne introuvable ou terminée');
      campaignId = c.id;
      campaignTitle = c.title;
    }

    const currency = METHOD_CURRENCY[method];
    const reference = newReference();
    const donation = await db.donation.create({
      data: {
        reference, amount: d.amount, currency, method, provider: provider.id,
        donorName: d.donorName || null, donorEmail: d.donorEmail || null, donorPhone: d.donorPhone || null,
        message: d.message || null, campaignId,
      },
    });

    try {
      const started = await provider.start({
        reference, amount: d.amount, currency, method,
        donor: { name: donation.donorName, email: donation.donorEmail, phone: donation.donorPhone },
        description: campaignTitle ? `Don – ${campaignTitle}` : 'Don à la paroisse Sainte Lucie de Baguida',
        returnUrl: `${env.PUBLIC_URL}/dons/merci?ref=${reference}`,
        cancelUrl: `${env.PUBLIC_URL}/dons/merci?ref=${reference}&cancel=1`,
        notifyUrl: `${env.PUBLIC_URL}/api/donations/webhook/${provider.id}`,
      });
      if (started.providerRef) await db.donation.update({ where: { id: donation.id }, data: { providerRef: started.providerRef } });
      return reply.code(201).send({ reference, redirectUrl: started.redirectUrl });
    } catch (err) {
      app.log.error({ err, reference }, 'Initialisation du paiement impossible');
      await db.donation.update({ where: { id: donation.id }, data: { status: 'FAILED', note: 'Échec d\'initialisation du paiement' } });
      throw new HttpError(502, 'Le service de paiement est momentanément indisponible. Réessayez dans un instant.');
    }
  });

  // Appelée par la page de retour : vérifie le paiement auprès du prestataire. Ne renvoie aucune donnée personnelle.
  app.post('/donations/:ref/confirm', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req) => {
    const { ref } = refParam.parse(req.params);
    const found = await db.donation.findUnique({ where: { reference: ref }, include: { campaign: { select: { title: true } } } });
    if (!found) throw new HttpError(404, 'Don introuvable');
    const updated = await applyCheck(app, found);
    return publicView(updated, found.campaign?.title);
  });

  // Webhooks : un message reçu ne sert JAMAIS de preuve de paiement. Il déclenche seulement une vérification directe
  // auprès du prestataire ; un faux webhook est donc sans effet.
  const webhookLimit = { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } };

  // CinetPay teste aussi l'adresse de notification en GET.
  app.get('/donations/webhook/cinetpay', async () => ({ ok: true }));
  app.post('/donations/webhook/cinetpay', webhookLimit, async (req) => {
    const ref = String((req.body as Record<string, unknown> | undefined)?.cpm_trans_id ?? '');
    if (REFERENCE_RE.test(ref)) {
      const d = await db.donation.findUnique({ where: { reference: ref } });
      if (d?.provider === 'cinetpay') await applyCheck(app, d);
    }
    return { ok: true };
  });

  app.post('/donations/webhook/paypal', webhookLimit, async (req) => {
    const event = (req.body ?? {}) as { event_type?: string; resource?: { id?: string; supplementary_data?: { related_ids?: { order_id?: string } } } };
    const orderId = event.resource?.supplementary_data?.related_ids?.order_id ?? (event.event_type?.startsWith('CHECKOUT.ORDER') ? event.resource?.id : undefined);
    if (orderId) {
      const d = await db.donation.findFirst({ where: { provider: 'paypal', providerRef: orderId } });
      if (d) await applyCheck(app, d);
    }
    return { ok: true };
  });

  // Simulation (développement uniquement) : choisir l'issue d'un paiement fictif.
  if (env.PAYMENT_MODE === 'mock') {
    app.post('/donations/mock/:ref/:action', async (req) => {
      const { ref, action } = z.object({ ref: z.string().regex(REFERENCE_RE), action: z.enum(['pay', 'fail', 'cancel']) }).parse(req.params);
      const d = await db.donation.findUnique({ where: { reference: ref } });
      if (!d || d.provider !== 'mock') throw new HttpError(404, 'Don introuvable');
      await db.donation.update({ where: { id: d.id }, data: { providerRef: { pay: 'mock:paid', fail: 'mock:failed', cancel: 'mock:cancelled' }[action] } });
      return { ok: true };
    });
  }
};

export default donations;
