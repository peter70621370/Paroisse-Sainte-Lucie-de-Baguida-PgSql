import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { FORMS, humanValue } from '../config/forms.js';
import type { Env } from '../config/env.js';
import { HttpError } from '../utils/errors.js';
import { oneLine } from '../services/mail.js';

const isEmail = (s: string | undefined | null): s is string => !!s && z.string().email().safeParse(s).success;

// Formulaires publics : validation stricte, anti-spam (champ piège + limitation de débit), consentement obligatoire.
const forms: FastifyPluginAsync<{ env: Env }> = async (app, { env }) => {
  app.post(
    '/forms/:slug',
    { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } },
    async (req, reply) => {
      const { slug } = z.object({ slug: z.string().max(40) }).parse(req.params);
      const def = FORMS[slug];
      if (!def) throw new HttpError(404, 'Formulaire inconnu');

      const raw = (req.body ?? {}) as Record<string, unknown>;
      // Champ piège (invisible pour les humains) : un robot le remplit. On répond « succès » sans rien enregistrer.
      if (typeof raw.website === 'string' && raw.website.trim() !== '') return reply.code(201).send({ ok: true });
      delete raw.website;

      const { consent: _consent, ...data } = def.schema.parse(raw) as Record<string, unknown> & { consent: true };
      const fullName = (data[def.nameKey] as string | undefined) ?? null;
      const email = (data.email as string | undefined) ?? null;
      const phone = (data.phone as string | undefined) ?? null;

      const submission = await app.prisma.formSubmission.create({
        data: { type: def.type, fullName, email, phone, payload: data as object, ip: req.ip },
      });

      // Notification au secrétariat + accusé de réception : en arrière-plan, sans jamais bloquer ni faire échouer la demande.
      const setting = await app.prisma.setting.findUnique({ where: { key: 'site.contactEmail' } });
      const recipient = [setting?.value, env.NOTIFY_EMAIL].find(isEmail);
      if (recipient) {
        const lines = Object.entries(def.labels)
          .filter(([k]) => data[k] !== undefined && data[k] !== '')
          .map(([k, label]) => `${label} : ${humanValue(k, data[k])}`);
        void app.mailer.send({
          to: recipient,
          subject: `[Site] ${def.label} – ${oneLine(fullName ?? 'anonyme')}`,
          replyTo: email ?? undefined,
          text: `Nouvelle demande reçue sur le site (n° ${submission.id}).\n\n${lines.join('\n')}\n\nÀ traiter dans Administration › Demandes reçues.`,
        });
      }
      if (email) {
        void app.mailer.send({
          to: email,
          subject: 'Nous avons bien reçu votre demande',
          text: `Bonjour ${oneLine(fullName ?? '')},\n\nNous avons bien reçu votre demande (${def.label.toLowerCase()}). Le secrétariat paroissial vous répondra dès que possible.\n\nQue le Seigneur vous bénisse.\nParoisse Sainte Lucie de Baguida`,
        });
      }

      return reply.code(201).send({ ok: true });
    },
  );
};

export default forms;
