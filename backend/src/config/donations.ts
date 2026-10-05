// Règles des dons en ligne.
export type Method = 'MOBILE_MONEY' | 'CARD' | 'PAYPAL';
export type Currency = 'XOF' | 'EUR';

// Mobile Money et carte : FCFA (via CinetPay). PayPal ne gère pas le FCFA : les dons PayPal sont en euros.
export const METHOD_CURRENCY: Record<Method, Currency> = { MOBILE_MONEY: 'XOF', CARD: 'XOF', PAYPAL: 'EUR' };
export const METHOD_LABEL: Record<Method, string> = { MOBILE_MONEY: 'Mobile Money', CARD: 'Carte bancaire', PAYPAL: 'PayPal' };

export const LIMITS = {
  XOF: { min: 500, max: 2_000_000, multipleOf: 5 }, // CinetPay exige des montants multiples de 5
  EUR: { min: 1, max: 5_000, multipleOf: 1 },
} as const;

/** Parité fixe officielle du franc CFA (BCEAO) : 1 EUR = 655,957 XOF. Sert aux totaux et à la progression des campagnes. */
export const EUR_TO_XOF = 655.957;
export const toXof = (amount: number, currency: string) => (currency === 'EUR' ? Math.round(amount * EUR_TO_XOF) : amount);

export const DONATION_STATUS_LABEL = { PENDING: 'En attente', SUCCEEDED: 'Réussi', FAILED: 'Échoué', CANCELLED: 'Annulé' } as const;

export const formatAmount = (amount: number, currency: string) =>
  currency === 'EUR' ? `${amount} €` : `${amount.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
