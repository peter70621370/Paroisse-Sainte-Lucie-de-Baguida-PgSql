import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@paroissesaintelucie-baguida.org',
  password: process.env.ADMIN_PASSWORD ?? '',
};
export const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
export const MAILPIT = process.env.MAILPIT_URL ?? '';
export const TAG = 'E2E';

/** Comptes de test pour vérifier les droits (créés une seule fois). */
export const CONTRIB = { email: 'e2e-contributeur@example.test', password: 'E2e-Contrib-Pass-2026!' };

export async function ensureStaff(ctx: APIRequestContext) {
  const res = await ctx.post('/api/admin/users', {
    data: { email: CONTRIB.email, firstName: 'E2E', lastName: 'Contributeur', role: 'CONTRIBUTOR', password: CONTRIB.password },
  });
  expect([201, 409]).toContain(res.status()); // 409 = déjà créé
}

/** Client API déjà connecté en administrateur. */
export function adminApi(playwright: { request: { newContext: (o: object) => Promise<APIRequestContext> } }) {
  return playwright.request.newContext({
    baseURL: BASE,
    storageState: '.auth-admin.json',
    extraHTTPHeaders: { Origin: BASE },
  });
}

/** Accepte ou refuse le bandeau de vie privée pour qu'il ne masque pas les boutons. */
export async function dismissBanner(page: Page, choice: 'Refuser' | 'Accepter' = 'Refuser') {
  const btn = page.getByRole('button', { name: choice, exact: true });
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

export const unique = (s: string) => `${TAG} ${s} ${Date.now()}`;

/**
 * Ouvre une page et attend que Vue ait pris la main (hydratation) : un clic avant ce moment est sans effet,
 * ce qui rendait les tests instables. (Un vrai visiteur ne le remarque pas : l'hydratation dure quelques dixièmes de seconde.)
 */
export async function hydrated(page: Page) {
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as unknown as { __vue_app__?: unknown } | null)?.__vue_app__);
}

export async function open(page: Page, path: string) {
  const res = await page.goto(path);
  await hydrated(page);
  return res;
}
