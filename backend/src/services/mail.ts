import nodemailer, { type Transporter } from 'nodemailer';
import type { FastifyBaseLogger } from 'fastify';
import type { Env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    mailer: Mailer;
  }
}

export type Mail = { to: string; subject: string; text: string; replyTo?: string };
export type Mailer = {
  /** Envoie un e-mail sans jamais lever d'erreur : un échec d'envoi ne doit pas faire perdre une demande déjà enregistrée. */
  send(mail: Mail): Promise<void>;
  /** Mode test : e-mails « envoyés » conservés en mémoire. */
  outbox: Mail[];
};

// Supprime les retours à la ligne des valeurs saisies par le public (injection d'en-têtes e-mail).
export const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

export function createMailer(env: Env, log: FastifyBaseLogger): Mailer {
  const outbox: Mail[] = [];

  if (env.NODE_ENV === 'test') {
    return { outbox, send: async (m) => void outbox.push(m) };
  }
  if (!env.SMTP_HOST) {
    log.warn('SMTP_HOST non défini : aucun e-mail ne sera envoyé (les demandes restent enregistrées).');
    return { outbox, send: async () => undefined };
  }

  const transport: Transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  return {
    outbox,
    async send(mail) {
      try {
        await transport.sendMail({ from: env.MAIL_FROM, to: mail.to, subject: oneLine(mail.subject), text: mail.text, replyTo: mail.replyTo });
      } catch (err) {
        log.error({ err, to: mail.to }, 'Échec d\'envoi d\'e-mail');
      }
    },
  };
}
