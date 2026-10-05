/** « 10 000 FCFA » ou « 20 € » */
export const formatAmount = (amount: number, currency: string) =>
  currency === 'EUR' ? `${amount} €` : `${amount.toLocaleString('fr-FR').replace(/[  ]/g, ' ')} FCFA`;

export const METHOD_LABEL: Record<string, string> = { MOBILE_MONEY: 'Mobile Money', CARD: 'Carte bancaire', PAYPAL: 'PayPal' };
export const DONATION_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-amber-100 text-amber-800' },
  SUCCEEDED: { label: 'Réussi', cls: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Échoué', cls: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Annulé', cls: 'bg-slate-200 text-slate-700' },
};
