import { z } from 'zod';

// Définition des formulaires publics : schéma de validation + libellés (e-mails, back-office, export CSV).
const consent = z.literal(true, { errorMap: () => ({ message: 'Vous devez accepter le traitement de vos données pour envoyer ce formulaire' }) });
const name = z.string().trim().min(2, 'Nom trop court').max(150);
const email = z.string().trim().toLowerCase().email('Adresse e-mail invalide').max(191);
const phone = z.string().trim().min(6, 'Numéro trop court').max(40).regex(/^[0-9+()\s.-]+$/, 'Numéro de téléphone invalide');
const optional = <T extends z.ZodTypeAny>(s: T) => z.union([s, z.literal('')]).optional().transform((v) => (v === '' ? undefined : v)) as unknown as z.ZodOptional<T>;
const text = (min: number, max: number, msg?: string) => z.string().trim().min(min, msg ?? 'Texte trop court').max(max);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ');

const needContact = (d: { email?: string; phone?: string }, ctx: z.RefinementCtx) => {
  if (!d.email && !d.phone) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Indiquez un numéro de téléphone ou une adresse e-mail' });
};

export const CATECHISM_LEVELS = ['Éveil à la foi', 'Préparation au baptême', 'Première communion', 'Profession de foi', 'Confirmation', 'Adultes'] as const;
export const SACRAMENTS = { BAPTISM: 'Baptême', COMMUNION: 'Première communion', CONFIRMATION: 'Confirmation', MARRIAGE: 'Mariage', ANOINTING: 'Onction des malades', OTHER: 'Autre demande' } as const;
export const INTENTION_TYPES = { THANKSGIVING: 'Action de grâce', DECEASED: 'Défunt(s)', SPECIAL: 'Intention particulière' } as const;

type FormDef = { type: 'CONTACT' | 'MEMBERSHIP' | 'CATECHISM' | 'SACRAMENT' | 'MASS_INTENTION'; label: string; schema: z.ZodTypeAny; labels: Record<string, string>; nameKey: string };

export const FORMS: Record<string, FormDef> = {
  contact: {
    type: 'CONTACT', label: 'Message de contact', nameKey: 'fullName',
    schema: z.object({ fullName: name, email, phone: optional(phone), subject: optional(text(2, 150)), message: text(10, 3000, 'Message trop court (10 caractères minimum)'), consent }),
    labels: { fullName: 'Nom', email: 'E-mail', phone: 'Téléphone', subject: 'Objet', message: 'Message' },
  },
  membership: {
    type: 'MEMBERSHIP', label: 'Adhésion à la paroisse', nameKey: 'fullName',
    schema: z
      .object({ fullName: name, email: optional(email), phone: optional(phone), address: optional(text(2, 255)), neighborhood: optional(text(2, 150)), message: optional(text(1, 2000)), consent })
      .superRefine(needContact),
    labels: { fullName: 'Nom', email: 'E-mail', phone: 'Téléphone', address: 'Adresse', neighborhood: 'Quartier / zone', message: 'Message' },
  },
  catechism: {
    type: 'CATECHISM', label: 'Inscription au catéchisme', nameKey: 'parentName',
    schema: z.object({
      childName: name, birthDate: date, level: z.enum(CATECHISM_LEVELS, { errorMap: () => ({ message: 'Niveau invalide' }) }),
      parentName: name, phone, email: optional(email), message: optional(text(1, 2000)), consent,
    }),
    labels: { childName: 'Nom de l\'enfant / du catéchumène', birthDate: 'Date de naissance', level: 'Niveau', parentName: 'Parent / responsable', phone: 'Téléphone', email: 'E-mail', message: 'Message' },
  },
  sacrament: {
    type: 'SACRAMENT', label: 'Demande de sacrement', nameKey: 'fullName',
    schema: z
      .object({
        sacrament: z.enum(Object.keys(SACRAMENTS) as [keyof typeof SACRAMENTS], { errorMap: () => ({ message: 'Sacrement invalide' }) }),
        fullName: name, email: optional(email), phone: optional(phone), preferredDate: optional(text(2, 100)), message: optional(text(1, 3000)), consent,
      })
      .superRefine(needContact),
    labels: { sacrament: 'Sacrement demandé', fullName: 'Nom', email: 'E-mail', phone: 'Téléphone', preferredDate: 'Date souhaitée', message: 'Précisions' },
  },
  'mass-intention': {
    type: 'MASS_INTENTION', label: 'Intention de messe', nameKey: 'fullName',
    schema: z
      .object({
        fullName: name, email: optional(email), phone: optional(phone),
        intentionType: z.enum(Object.keys(INTENTION_TYPES) as [keyof typeof INTENTION_TYPES], { errorMap: () => ({ message: 'Type d\'intention invalide' }) }),
        intention: text(3, 500, 'Précisez l\'intention (3 caractères minimum)'), preferredDate: optional(date), consent,
      })
      .superRefine(needContact),
    labels: { fullName: 'Nom', email: 'E-mail', phone: 'Téléphone', intentionType: 'Type d\'intention', intention: 'Intention', preferredDate: 'Date souhaitée' },
  },
};

export const FORM_TYPE_LABEL: Record<string, string> = Object.fromEntries(Object.values(FORMS).map((f) => [f.type, f.label]));
export const LABELS_BY_TYPE: Record<string, Record<string, string>> = Object.fromEntries(Object.values(FORMS).map((f) => [f.type, f.labels]));

/** Valeur lisible d'un champ (traduit les codes de sacrement / d'intention). */
export function humanValue(key: string, value: unknown): string {
  if (key === 'sacrament') return SACRAMENTS[value as keyof typeof SACRAMENTS] ?? String(value);
  if (key === 'intentionType') return INTENTION_TYPES[value as keyof typeof INTENTION_TYPES] ?? String(value);
  return value == null ? '' : String(value);
}
