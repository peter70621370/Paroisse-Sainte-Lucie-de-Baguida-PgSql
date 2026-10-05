import type { CheckInput, CheckResult, FetchLike, PaymentProvider, StartInput, StartResult } from './types.js';

type Cfg = { apiKey: string; siteId: string; baseUrl: string };

// Intégration CinetPay Checkout v2 (Mobile Money et carte, en FCFA).
// Endpoints : POST {base}/v2/payment (initialisation) et POST {base}/v2/payment/check (vérification).
export function createCinetPay(cfg: Cfg, fetchImpl: FetchLike): PaymentProvider {
  const post = async (path: string, body: object) => {
    const res = await fetchImpl(`${cfg.baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    return { httpOk: res.ok, json };
  };

  return {
    id: 'cinetpay',

    async start(i: StartInput): Promise<StartResult> {
      const [first, ...rest] = (i.donor.name ?? '').trim().split(/\s+/).filter(Boolean);
      const { httpOk, json } = await post('/v2/payment', {
        apikey: cfg.apiKey,
        site_id: cfg.siteId,
        transaction_id: i.reference,
        amount: i.amount,
        currency: i.currency,
        description: i.description.slice(0, 200),
        notify_url: i.notifyUrl,
        return_url: i.returnUrl,
        channels: i.method === 'CARD' ? 'CREDIT_CARD' : 'MOBILE_MONEY',
        lang: 'fr',
        metadata: i.reference,
        customer_id: i.reference,
        customer_name: first || 'Donateur',
        customer_surname: rest.join(' ') || 'Paroisse',
        customer_email: i.donor.email || 'donateur@paroissesaintelucie-baguida.org',
        customer_phone_number: i.donor.phone || '',
        // La carte exige une adresse : valeurs par défaut (la paroisse est au Togo).
        customer_address: 'Baguida',
        customer_city: 'Baguida',
        customer_country: 'TG',
        customer_state: 'TG',
        customer_zip_code: '00228',
      });
      const url = json?.data?.payment_url;
      if (!httpOk || String(json?.code) !== '201' || typeof url !== 'string') {
        throw new Error(`CinetPay : initialisation refusée (${json?.code ?? 'sans code'} ${json?.message ?? ''})`);
      }
      return { redirectUrl: url, providerRef: json?.data?.payment_token };
    },

    async check(i: CheckInput): Promise<CheckResult> {
      const { httpOk, json } = await post('/v2/payment/check', { apikey: cfg.apiKey, site_id: cfg.siteId, transaction_id: i.reference });
      if (!httpOk && !json?.code) throw new Error('CinetPay : vérification indisponible');

      const data = json?.data ?? {};
      const status = String(data.status ?? '').toUpperCase();
      if (status === 'ACCEPTED' && String(json.code) === '00') {
        // Le montant et la devise réellement payés doivent correspondre à ceux attendus.
        if (Number(data.amount) !== i.amount || String(data.currency).toUpperCase() !== i.currency) {
          return { status: 'FAILED', anomaly: `ANOMALIE : payé ${data.amount} ${data.currency}, attendu ${i.amount} ${i.currency}` };
        }
        return { status: 'SUCCEEDED' };
      }
      if (status === 'REFUSED') return { status: 'FAILED' };
      if (['627'].includes(String(json?.code))) return { status: 'CANCELLED' };
      return { status: 'PENDING' }; // WAITING_FOR_CUSTOMER, transaction inconnue (pas encore ouverte), etc.
    },
  };
}
