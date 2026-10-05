import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../src/config/env.js';
import { buildApp } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';
import type { FetchLike } from '../src/services/payments/types.js';

type Call = { url: string; method: string; headers: Record<string, string>; body: any };

describe.skipIf(!process.env.RUN_DB_TESTS)('dons en ligne', () => {
  const prisma = new PrismaClient();
  const tag = `dn${Date.now()}`;
  const pw = 'Test-Password-123!';
  const PUBLIC = 'https://site.test';

  // Faux prestataires : on enregistre les requêtes et on répond selon `state`.
  const calls: Call[] = [];
  const allCalls: Call[] = []; // jamais vidé (le jeton PayPal est mis en cache entre les tests)
  const state = {
    cinetpay: { code: '00', data: { status: 'ACCEPTED', amount: '1000', currency: 'XOF' } } as any,
    paypalOrder: { id: 'ORDER1', status: 'CREATED' } as any,
    paypalCapture: { id: 'ORDER1', status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ status: 'COMPLETED', amount: { value: '10.00', currency_code: 'EUR' } }] } }] } as any,
    paypalOrderId: 'ORDER1',
  };
  const fakeFetch: FetchLike = async (url, init = {}) => {
    const body = init.body ? (init.headers?.['Content-Type']?.includes('json') ? JSON.parse(init.body) : init.body) : undefined;
    const rec = { url, method: init.method ?? 'GET', headers: init.headers ?? {}, body };
    calls.push(rec);
    allCalls.push(rec);
    const reply = (json: object, status = 200) => ({ ok: status < 300, status, json: async () => json, text: async () => JSON.stringify(json) });
    if (url.endsWith('/v2/payment')) return reply({ code: '201', message: 'CREATED', data: { payment_token: 'tok123', payment_url: 'https://checkout.cinetpay.test/pay/tok123' } });
    if (url.endsWith('/v2/payment/check')) return reply(state.cinetpay);
    if (url.endsWith('/v1/oauth2/token')) return reply({ access_token: 'AT', expires_in: 3600 });
    if (url.endsWith('/v2/checkout/orders') && init.method === 'POST') return reply({ id: state.paypalOrderId, status: 'CREATED', links: [{ rel: 'self', href: 'x' }, { rel: 'payer-action', href: 'https://paypal.test/approve?token=ORDER1' }] });
    if (url.endsWith('/capture')) return reply(state.paypalCapture);
    if (url.includes('/v2/checkout/orders/')) return reply(state.paypalOrder);
    return reply({ error: 'inconnu' }, 404);
  };

  let live: FastifyInstance; // vrais prestataires (HTTP simulé)
  let mock: FastifyInstance; // mode simulation
  const cookie: Record<string, string> = {};
  let n = 0;

  const call = (app: FastifyInstance, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object | string, extra: { who?: string; headers?: Record<string, string> } = {}) =>
    app.inject({ method, url, payload, headers: { 'x-forwarded-for': `10.30.${Math.floor(++n / 250)}.${n % 250}`, ...(extra.who ? { cookie: cookie[extra.who]! } : {}), ...extra.headers } });

  const donate = (app: FastifyInstance, over: object = {}) =>
    call(app, 'POST', '/api/donations', { amount: 1000, method: 'MOBILE_MONEY', donorName: `${tag} Marie`, donorPhone: '+22890000000', donorEmail: `${tag}@example.test`, consent: true, ...over });

  const baseEnv = { ...process.env, NODE_ENV: 'test', PUBLIC_URL: PUBLIC, NOTIFY_EMAIL: 'secretariat@example.test' };

  beforeAll(async () => {
    live = await buildApp(loadEnv({ ...baseEnv, PAYMENT_MODE: 'live', CINETPAY_API_KEY: 'KEY', CINETPAY_SITE_ID: 'SITE', PAYPAL_CLIENT_ID: 'PID', PAYPAL_CLIENT_SECRET: 'PSECRET', PAYPAL_ENV: 'sandbox' }), { fetchImpl: fakeFetch });
    mock = await buildApp(loadEnv({ ...baseEnv, PAYMENT_MODE: 'mock' }));
    const hash = await hashPassword(pw);
    for (const [key, role] of [['editor', 'EDITOR'], ['contrib', 'CONTRIBUTOR']] as const) {
      await prisma.user.create({ data: { email: `${tag}-${key}@example.test`, passwordHash: hash, firstName: key, lastName: 'T', role } });
      const res = await call(live, 'POST', '/api/auth/login', { email: `${tag}-${key}@example.test`, password: pw });
      cookie[key] = `sid=${res.cookies.find((c) => c.name === 'sid')!.value}`;
    }
  });

  afterAll(async () => {
    await prisma.donation.deleteMany({ where: { OR: [{ donorName: { contains: tag } }, { donorEmail: { startsWith: tag } }] } });
    await prisma.campaign.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
    await prisma.$disconnect();
    await live.close();
    await mock.close();
  });

  describe('moyens de paiement et validation', () => {
    it('liste les trois moyens quand les clés sont configurées', async () => {
      const res = await call(live, 'GET', '/api/donations/methods');
      expect(res.json().methods.map((m: { method: string }) => m.method)).toEqual(['MOBILE_MONEY', 'CARD', 'PAYPAL']);
      expect(res.json().methods.find((m: { method: string }) => m.method === 'PAYPAL').currency).toBe('EUR');
    });

    it('sans clés, aucun moyen n\'est proposé et un don est refusé (503)', async () => {
      const bare = await buildApp(loadEnv({ ...baseEnv, PAYMENT_MODE: 'live' }));
      expect((await call(bare, 'GET', '/api/donations/methods')).json().methods).toEqual([]);
      expect((await donate(bare)).statusCode).toBe(503);
      await bare.close();
    });

    it('contrôle montants, identité, consentement', async () => {
      expect((await donate(live, { amount: 1002 })).json().details.amount[0]).toContain('multiple de 5');
      expect((await donate(live, { amount: 100 })).json().details.amount[0]).toContain('minimum');
      expect((await donate(live, { amount: 5_000_000 })).statusCode).toBe(400);
      expect((await donate(live, { amount: 1000.5 })).statusCode).toBe(400);
      expect((await donate(live, { donorName: '', donorPhone: '' })).json().details).toHaveProperty('donorName');
      expect((await donate(live, { consent: false })).statusCode).toBe(400);
      expect((await donate(live, { method: 'BITCOIN' })).statusCode).toBe(400);
      // PayPal : euros entiers, identité facultative
      expect((await donate(live, { method: 'PAYPAL', amount: 0, donorName: undefined, donorPhone: undefined })).statusCode).toBe(400);
      expect((await donate(live, { method: 'PAYPAL', amount: 10, donorName: undefined, donorPhone: undefined })).statusCode).toBe(201);
    });

    it('refuse une campagne inconnue ; champ piège : faux succès sans rien enregistrer', async () => {
      expect((await donate(live, { campaign: 'nexiste-pas' })).statusCode).toBe(400);
      const before = await prisma.donation.count();
      const bot = await donate(live, { website: 'http://spam' });
      expect(bot.statusCode).toBe(201);
      expect(await prisma.donation.count()).toBe(before);
    });

    it('limite le nombre de créations par IP', async () => {
      const codes: number[] = [];
      for (let i = 0; i < 12; i++) codes.push((await call(live, 'POST', '/api/donations', { amount: 1 }, { headers: { 'x-forwarded-for': '10.99.0.1' } })).statusCode);
      expect(codes.at(-1)).toBe(429);
    });
  });

  describe('CinetPay (Mobile Money et carte)', () => {
    it('initialise le paiement avec les bons paramètres', async () => {
      calls.length = 0;
      const res = await donate(live, { amount: 1000, method: 'MOBILE_MONEY' });
      expect(res.statusCode).toBe(201);
      const { reference, redirectUrl } = res.json();
      expect(redirectUrl).toBe('https://checkout.cinetpay.test/pay/tok123');

      const sent = calls.find((c) => c.url.endsWith('/v2/payment'))!;
      expect(sent.method).toBe('POST');
      expect(sent.body).toMatchObject({
        apikey: 'KEY', site_id: 'SITE', transaction_id: reference, amount: 1000, currency: 'XOF', channels: 'MOBILE_MONEY',
        notify_url: `${PUBLIC}/api/donations/webhook/cinetpay`, return_url: `${PUBLIC}/dons/merci?ref=${reference}`, customer_phone_number: '+22890000000',
      });
      const row = await prisma.donation.findUnique({ where: { reference } });
      expect(row).toMatchObject({ status: 'PENDING', provider: 'cinetpay', method: 'MOBILE_MONEY', currency: 'XOF', providerRef: 'tok123' });

      const card = await donate(live, { method: 'CARD' });
      expect(calls.filter((c) => c.url.endsWith('/v2/payment')).at(-1)!.body.channels).toBe('CREDIT_CARD');
      expect(card.statusCode).toBe(201);
    });

    it('en attente puis réussi : e-mails envoyés une seule fois', async () => {
      const { reference } = (await donate(live, { amount: 1000 })).json();
      state.cinetpay = { code: '662', message: 'WAITING_FOR_CUSTOMER', data: { status: 'WAITING_FOR_CUSTOMER' } };
      const waiting = await call(live, 'POST', `/api/donations/${reference}/confirm`);
      expect(waiting.json().status).toBe('PENDING');

      const mailsBefore = live.mailer.outbox.length;
      state.cinetpay = { code: '00', data: { status: 'ACCEPTED', amount: '1000', currency: 'XOF' } };
      const done = await call(live, 'POST', `/api/donations/${reference}/confirm`);
      expect(done.json()).toMatchObject({ status: 'SUCCEEDED', amount: 1000, currency: 'XOF' });
      expect(done.json()).not.toHaveProperty('donorName'); // aucune donnée personnelle côté public
      expect(done.json()).not.toHaveProperty('donorEmail');

      const mails = live.mailer.outbox.slice(mailsBefore);
      expect(mails.map((m) => m.to).sort()).toEqual([`${tag}@example.test`, 'secretariat@example.test'].sort());
      expect(mails.find((m) => m.to === `${tag}@example.test`)!.text).toContain('1 000 FCFA');

      await call(live, 'POST', `/api/donations/${reference}/confirm`); // 2e confirmation
      expect(live.mailer.outbox.length).toBe(mailsBefore + 2); // pas de doublon
      expect((await prisma.donation.findUnique({ where: { reference } }))!.paidAt).toBeTruthy();
    });

    it('un montant payé différent du montant attendu n\'est PAS validé', async () => {
      const { reference } = (await donate(live, { amount: 1000 })).json();
      state.cinetpay = { code: '00', data: { status: 'ACCEPTED', amount: '500', currency: 'XOF' } };
      const mailsBefore = live.mailer.outbox.length;
      const res = await call(live, 'POST', `/api/donations/${reference}/confirm`);
      expect(res.json().status).toBe('FAILED');
      expect((await prisma.donation.findUnique({ where: { reference } }))!.note).toContain('ANOMALIE');
      expect(live.mailer.outbox.length).toBe(mailsBefore);
    });

    it('un paiement refusé est marqué échoué', async () => {
      const { reference } = (await donate(live)).json();
      state.cinetpay = { code: '600', data: { status: 'REFUSED' } };
      expect((await call(live, 'POST', `/api/donations/${reference}/confirm`)).json().status).toBe('FAILED');
    });

    it('le webhook déclenche une vérification, mais ne vaut jamais preuve de paiement', async () => {
      const { reference } = (await donate(live)).json();
      const form = { 'content-type': 'application/x-www-form-urlencoded' };

      // Faux webhook « payé » alors que le prestataire dit « en attente » : sans effet.
      state.cinetpay = { code: '662', data: { status: 'WAITING_FOR_CUSTOMER' } };
      const fake = await call(live, 'POST', '/api/donations/webhook/cinetpay', `cpm_trans_id=${reference}&cpm_result=00&cpm_trans_status=ACCEPTED`, { headers: form });
      expect(fake.statusCode).toBe(200);
      expect((await prisma.donation.findUnique({ where: { reference } }))!.status).toBe('PENDING');

      // Vrai paiement confirmé par le prestataire : le webhook suffit à valider.
      state.cinetpay = { code: '00', data: { status: 'ACCEPTED', amount: '1000', currency: 'XOF' } };
      await call(live, 'POST', '/api/donations/webhook/cinetpay', `cpm_trans_id=${reference}`, { headers: form });
      expect((await prisma.donation.findUnique({ where: { reference } }))!.status).toBe('SUCCEEDED');

      // Webhooks inconnus ou mal formés : 200, rien ne casse. Test GET de CinetPay : 200.
      expect((await call(live, 'POST', '/api/donations/webhook/cinetpay', 'cpm_trans_id=DON00000000AAAAAAAAAA', { headers: form })).statusCode).toBe(200);
      expect((await call(live, 'POST', '/api/donations/webhook/cinetpay', 'n=importe;quoi', { headers: form })).statusCode).toBe(200);
      expect((await call(live, 'GET', '/api/donations/webhook/cinetpay')).statusCode).toBe(200);
    });

    it('si le prestataire est injoignable, le don reste en attente (aucune perte)', async () => {
      const { reference } = (await donate(live)).json();
      const failing = await buildApp(loadEnv({ ...baseEnv, PAYMENT_MODE: 'live', CINETPAY_API_KEY: 'K', CINETPAY_SITE_ID: 'S' }), { fetchImpl: async () => { throw new Error('réseau coupé'); } });
      const res = await call(failing, 'POST', `/api/donations/${reference}/confirm`);
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('PENDING');
      await failing.close();
    });
  });

  describe('PayPal (euros)', () => {
    it('crée la commande en EUR avec les liens de retour', async () => {
      calls.length = 0;
      state.paypalOrderId = 'ORDER1';
      const res = await donate(live, { method: 'PAYPAL', amount: 10, donorName: `${tag} Paul`, donorPhone: '', donorEmail: `${tag}p@example.test` });
      expect(res.statusCode).toBe(201);
      const { reference, redirectUrl } = res.json();
      expect(redirectUrl).toBe('https://paypal.test/approve?token=ORDER1');

      const token = allCalls.find((c) => c.url.endsWith('/v1/oauth2/token'))!;
      expect(token.url).toContain('api-m.sandbox.paypal.com');
      expect(token.headers.Authorization).toBe(`Basic ${Buffer.from('PID:PSECRET').toString('base64')}`);

      const order = calls.find((c) => c.url.endsWith('/v2/checkout/orders'))!;
      expect(order.headers.Authorization).toBe('Bearer AT');
      expect(order.body.purchase_units[0].amount).toEqual({ currency_code: 'EUR', value: '10.00' });
      expect(order.body.payment_source.paypal.experience_context).toMatchObject({ return_url: `${PUBLIC}/dons/merci?ref=${reference}`, user_action: 'PAY_NOW' });
      expect(await prisma.donation.findUnique({ where: { reference } })).toMatchObject({ provider: 'paypal', currency: 'EUR', providerRef: 'ORDER1', status: 'PENDING' });
    });

    it('capture le paiement une fois approuvé par le donateur', async () => {
      const { reference } = (await donate(live, { method: 'PAYPAL', amount: 10, donorName: `${tag} Paul`, donorPhone: '' })).json();

      state.paypalOrder = { id: 'ORDER1', status: 'CREATED' };
      expect((await call(live, 'POST', `/api/donations/${reference}/confirm`)).json().status).toBe('PENDING');
      expect(calls.some((c) => c.url.endsWith('/capture'))).toBe(false); // pas de capture avant approbation

      calls.length = 0;
      state.paypalOrder = { id: 'ORDER1', status: 'APPROVED' };
      const res = await call(live, 'POST', `/api/donations/${reference}/confirm`);
      expect(res.json()).toMatchObject({ status: 'SUCCEEDED', amount: 10, currency: 'EUR' });
      const capture = calls.find((c) => c.url.endsWith('/capture'))!;
      expect(capture.method).toBe('POST');
      expect(capture.headers['PayPal-Request-Id']).toBe(`capture-${reference}`);
    });

    it('refuse de valider si le montant capturé diffère', async () => {
      const { reference } = (await donate(live, { method: 'PAYPAL', amount: 10, donorName: `${tag} Paul`, donorPhone: '' })).json();
      state.paypalOrder = { id: 'ORDER1', status: 'APPROVED' };
      state.paypalCapture = { id: 'ORDER1', status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ status: 'COMPLETED', amount: { value: '1.00', currency_code: 'EUR' } }] } }] };
      expect((await call(live, 'POST', `/api/donations/${reference}/confirm`)).json().status).toBe('FAILED');
      state.paypalCapture = { id: 'ORDER1', status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ status: 'COMPLETED', amount: { value: '10.00', currency_code: 'EUR' } }] } }] };
    });

    it('le webhook PayPal retrouve le don par la commande et vérifie auprès de PayPal', async () => {
      state.paypalOrderId = 'ORDER-WH';
      const { reference } = (await donate(live, { method: 'PAYPAL', amount: 10, donorName: `${tag} Paul`, donorPhone: '' })).json();
      state.paypalOrder = { id: 'ORDER-WH', status: 'APPROVED' };
      const res = await call(live, 'POST', '/api/donations/webhook/paypal', { event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'ORDER-WH' } });
      expect(res.statusCode).toBe(200);
      expect((await prisma.donation.findUnique({ where: { reference } }))!.status).toBe('SUCCEEDED');
      expect((await call(live, 'POST', '/api/donations/webhook/paypal', { event_type: 'X', resource: { id: 'INCONNU' } })).statusCode).toBe(200);
    });
  });

  describe('mode simulation et campagnes', () => {
    it('simule un paiement réussi, un échec et une annulation', async () => {
      const start = await donate(mock, { amount: 2000 });
      expect(start.statusCode).toBe(201);
      const { reference, redirectUrl } = start.json();
      expect(redirectUrl).toBe(`${PUBLIC}/dons/simulation?ref=${reference}`);
      expect((await call(mock, 'POST', `/api/donations/${reference}/confirm`)).json().status).toBe('PENDING');

      await call(mock, 'POST', `/api/donations/mock/${reference}/pay`);
      expect((await call(mock, 'POST', `/api/donations/${reference}/confirm`)).json().status).toBe('SUCCEEDED');

      const f = (await donate(mock)).json().reference;
      await call(mock, 'POST', `/api/donations/mock/${f}/fail`);
      expect((await call(mock, 'POST', `/api/donations/${f}/confirm`)).json().status).toBe('FAILED');
      const c = (await donate(mock)).json().reference;
      await call(mock, 'POST', `/api/donations/mock/${c}/cancel`);
      expect((await call(mock, 'POST', `/api/donations/${c}/confirm`)).json().status).toBe('CANCELLED');
    });

    it('les routes de simulation n\'existent pas en mode réel', async () => {
      expect((await call(live, 'POST', '/api/donations/mock/DON00000000AAAAAAAAAA/pay')).statusCode).toBe(404);
    });

    it('référence invalide ou inconnue', async () => {
      expect((await call(live, 'POST', '/api/donations/abc/confirm')).statusCode).toBe(400);
      expect((await call(live, 'POST', '/api/donations/DON00000000AAAAAAAAAA/confirm')).statusCode).toBe(404);
    });

    it('campagne : progression (EUR converti au taux fixe) et dons ciblés', async () => {
      const slug = `${tag}-chapelle`;
      const created = await call(live, 'POST', '/api/admin/campaigns', { title: `${tag} Chapelle`, slug, goalAmount: 1_000_000, status: 'PUBLISHED' }, { who: 'editor' });
      expect(created.statusCode).toBe(201);
      await call(live, 'POST', '/api/admin/campaigns', { title: `${tag} Brouillon`, slug: `${tag}-brouillon` }, { who: 'editor' });

      const pay = async (over: object) => {
        const { reference } = (await donate(mock, { campaign: slug, ...over })).json();
        await call(mock, 'POST', `/api/donations/mock/${reference}/pay`);
        await call(mock, 'POST', `/api/donations/${reference}/confirm`);
      };
      await pay({ amount: 50_000 });
      await pay({ method: 'PAYPAL', amount: 100, donorName: `${tag} Paul`, donorPhone: '' });
      const enAttente = (await donate(mock, { campaign: slug, amount: 900_000 })).json(); // non payé : ne compte pas
      expect(enAttente.reference).toBeTruthy();

      const list = (await call(live, 'GET', '/api/campaigns')).json().items.filter((c: { slug: string }) => c.slug === slug);
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ raised: 50_000 + Math.round(100 * 655.957), donors: 2, percent: 11 });
      expect((await call(live, 'GET', `/api/campaigns/${tag}-brouillon`)).statusCode).toBe(404); // brouillon invisible
      expect((await donate(mock, { campaign: `${tag}-brouillon` })).statusCode).toBe(400);
    });
  });

  describe('administration des dons', () => {
    it('est réservée aux administrateurs et éditeurs', async () => {
      expect((await call(live, 'GET', '/api/admin/donations')).statusCode).toBe(401);
      expect((await call(live, 'GET', '/api/admin/donations', undefined, { who: 'contrib' })).statusCode).toBe(403);
      expect((await call(live, 'GET', '/api/admin/donations/export.csv', undefined, { who: 'contrib' })).statusCode).toBe(403);
    });

    it('liste, filtre, résume, exporte et revérifie', async () => {
      const list = await call(live, 'GET', `/api/admin/donations?status=SUCCEEDED&q=${tag}`, undefined, { who: 'editor' });
      expect(list.statusCode).toBe(200);
      expect(list.json().items.length).toBeGreaterThan(0);
      expect(list.json().items.every((d: { status: string }) => d.status === 'SUCCEEDED')).toBe(true);

      const summary = (await call(live, 'GET', '/api/admin/donations/summary', undefined, { who: 'editor' })).json();
      expect(summary.totalXof).toBeGreaterThan(0);
      expect(summary.byCurrency.XOF.count).toBeGreaterThan(0);

      // export CSV : formules neutralisées
      await prisma.donation.create({ data: { reference: `DON00000000${tag.slice(-10).toUpperCase().replace(/[^0-9A-F]/g, '0').padEnd(10, '0')}`, amount: 5, currency: 'XOF', provider: 'mock', method: 'CARD', donorName: `=1+1 ${tag}`, status: 'FAILED' } });
      const csv = await call(live, 'GET', `/api/admin/donations/export.csv?q=${tag}`, undefined, { who: 'editor' });
      expect(csv.headers['content-type']).toContain('text/csv');
      expect(csv.body.startsWith('﻿"Date";"Référence"')).toBe(true);
      expect(csv.body).toContain(`"'=1+1 ${tag}"`);
      expect(csv.body).not.toMatch(/(^|;)"=1\+1/m);

      // revérification d'un don en attente
      const { reference } = (await donate(live)).json();
      state.cinetpay = { code: '00', data: { status: 'ACCEPTED', amount: '1000', currency: 'XOF' } };
      const id = (await prisma.donation.findUnique({ where: { reference } }))!.id;
      const re = await call(live, 'POST', `/api/admin/donations/${id}/recheck`, undefined, { who: 'editor' });
      expect(re.json().item.status).toBe('SUCCEEDED');
    });
  });
});
