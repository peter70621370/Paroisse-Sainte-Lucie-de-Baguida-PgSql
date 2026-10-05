import type { CheckInput, CheckResult, FetchLike, PaymentProvider, StartInput, StartResult } from './types.js';

type Cfg = { clientId: string; secret: string; env: 'sandbox' | 'live' };

// Intégration PayPal Orders v2 (euros uniquement : PayPal ne gère pas le FCFA).
// Parcours : création de la commande -> le donateur approuve sur PayPal -> le serveur CAPTURE le paiement.
export function createPayPal(cfg: Cfg, fetchImpl: FetchLike): PaymentProvider {
  const base = cfg.env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  let token: { value: string; expiresAt: number } | null = null;

  const accessToken = async () => {
    if (token && token.expiresAt > Date.now() + 30_000) return token.value;
    const res = await fetchImpl(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) throw new Error('PayPal : authentification refusée');
    token = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) || 300) * 1000 };
    return token.value;
  };

  const api = async (path: string, init: { method?: string; body?: object; requestId?: string } = {}) => {
    const res = await fetchImpl(`${base}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        'Content-Type': 'application/json',
        ...(init.requestId ? { 'PayPal-Request-Id': init.requestId } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
  };

  const evaluate = (order: any, i: CheckInput): CheckResult => {
    const unit = order?.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    if (order?.status === 'COMPLETED' && capture?.status === 'COMPLETED') {
      if (Number(capture.amount?.value) !== i.amount || capture.amount?.currency_code !== i.currency) {
        return { status: 'FAILED', anomaly: `ANOMALIE : payé ${capture.amount?.value} ${capture.amount?.currency_code}, attendu ${i.amount} ${i.currency}` };
      }
      return { status: 'SUCCEEDED' };
    }
    if (order?.status === 'VOIDED') return { status: 'CANCELLED' };
    return { status: 'PENDING' };
  };

  return {
    id: 'paypal',

    async start(i: StartInput): Promise<StartResult> {
      const { ok, json } = await api('/v2/checkout/orders', {
        method: 'POST',
        requestId: `order-${i.reference}`,
        body: {
          intent: 'CAPTURE',
          purchase_units: [
            { reference_id: i.reference, custom_id: i.reference, description: i.description.slice(0, 120), amount: { currency_code: i.currency, value: i.amount.toFixed(2) } },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: 'Paroisse Sainte Lucie de Baguida',
                locale: 'fr-FR',
                user_action: 'PAY_NOW',
                shipping_preference: 'NO_SHIPPING',
                return_url: i.returnUrl,
                cancel_url: i.cancelUrl,
              },
            },
          },
        },
      });
      const link = (json.links as { rel: string; href: string }[] | undefined)?.find((l) => l.rel === 'payer-action' || l.rel === 'approve');
      if (!ok || !json.id || !link) throw new Error(`PayPal : création de commande refusée (${json?.name ?? ''})`);
      return { redirectUrl: link.href, providerRef: json.id };
    },

    async check(i: CheckInput): Promise<CheckResult> {
      if (!i.providerRef) return { status: 'PENDING' };
      const got = await api(`/v2/checkout/orders/${encodeURIComponent(i.providerRef)}`);
      if (!got.ok) throw new Error('PayPal : commande introuvable ou service indisponible');

      // Le donateur a approuvé : on capture le paiement côté serveur (idempotent grâce à PayPal-Request-Id).
      if (got.json.status === 'APPROVED') {
        const cap = await api(`/v2/checkout/orders/${encodeURIComponent(i.providerRef)}/capture`, { method: 'POST', body: {}, requestId: `capture-${i.reference}` });
        if (!cap.ok) {
          const again = await api(`/v2/checkout/orders/${encodeURIComponent(i.providerRef)}`);
          return again.ok ? evaluate(again.json, i) : { status: 'PENDING' };
        }
        return evaluate(cap.json, i);
      }
      return evaluate(got.json, i);
    },
  };
}
