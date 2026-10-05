import type { Currency, Method } from '../../config/donations.js';

export type StartInput = {
  reference: string;
  amount: number;
  currency: Currency;
  method: Method;
  donor: { name?: string | null; email?: string | null; phone?: string | null };
  description: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
};
export type StartResult = { redirectUrl: string; providerRef?: string };

export type CheckInput = { reference: string; providerRef: string | null; amount: number; currency: Currency };
export type CheckResult = {
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING' | 'CANCELLED';
  providerRef?: string;
  /** Anomalie à signaler à l'administrateur (ex. montant payé différent du montant attendu). */
  anomaly?: string;
};

/**
 * Un prestataire de paiement. RÈGLE DE SÉCURITÉ : le statut d'un don ne vient JAMAIS d'un message reçu
 * (webhook, adresse de retour) mais uniquement de `check`, qui interroge directement le prestataire.
 */
export interface PaymentProvider {
  id: 'cinetpay' | 'paypal' | 'mock';
  start(input: StartInput): Promise<StartResult>;
  check(input: CheckInput): Promise<CheckResult>;
}

export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json(): Promise<any>; text(): Promise<string> }>;
