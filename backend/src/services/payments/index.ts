import type { Env } from '../../config/env.js';
import type { Method } from '../../config/donations.js';
import { createCinetPay } from './cinetpay.js';
import { createMock } from './mock.js';
import { createPayPal } from './paypal.js';
import type { FetchLike, PaymentProvider } from './types.js';

export type Payments = {
  /** Moyens de paiement réellement utilisables (clés configurées, ou simulation). */
  methods(): Method[];
  forMethod(method: Method): PaymentProvider | null;
  byId(id: string): PaymentProvider | null;
};

export function createPayments(env: Env, fetchImpl: FetchLike = fetch as unknown as FetchLike): Payments {
  const providers: PaymentProvider[] = [];

  if (env.PAYMENT_MODE === 'mock') {
    providers.push(createMock(env.PUBLIC_URL));
  } else {
    if (env.CINETPAY_API_KEY && env.CINETPAY_SITE_ID) {
      providers.push(createCinetPay({ apiKey: env.CINETPAY_API_KEY, siteId: env.CINETPAY_SITE_ID, baseUrl: env.CINETPAY_BASE_URL }, fetchImpl));
    }
    if (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) {
      providers.push(createPayPal({ clientId: env.PAYPAL_CLIENT_ID, secret: env.PAYPAL_CLIENT_SECRET, env: env.PAYPAL_ENV }, fetchImpl));
    }
  }

  const byId = (id: string) => providers.find((p) => p.id === id) ?? null;
  const forMethod = (m: Method) => (env.PAYMENT_MODE === 'mock' ? byId('mock') : m === 'PAYPAL' ? byId('paypal') : byId('cinetpay'));

  return {
    byId,
    forMethod,
    methods: () => (['MOBILE_MONEY', 'CARD', 'PAYPAL'] as Method[]).filter((m) => forMethod(m) !== null),
  };
}
