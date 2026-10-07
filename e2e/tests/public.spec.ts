import { expect, test, type Page } from '@playwright/test';
import { dismissBanner, open } from './helpers';

// Parcours visiteur, sur ordinateur ET mobile (deux projets Playwright).
async function openMenuItem(page: Page, parent: string, child: string) {
  const burger = page.getByRole('button', { name: 'Menu', exact: true });
  if (await burger.isVisible()) await burger.click(); // mobile
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: parent }).click();
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: child }).click();
}

test('l\'accueil se charge sans erreur et présente la paroisse', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`erreur JS : ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('favicon') && problems.push(`console : ${m.text()}`));

  await page.goto('/');
  await expect(page).toHaveTitle(/Paroisse Sainte Lucie/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Horaires des messes' }).first()).toBeVisible();
  await expect(page.locator('footer')).toContainText('Paroisse Sainte Lucie de Baguida');
  expect(problems).toEqual([]);
});

test('le bandeau de vie privée mémorise le choix et peut être rouvert', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByRole('dialog', { name: 'Votre vie privée' });
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Refuser' }).click();
  await expect(banner).toBeHidden();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(banner).toBeHidden(); // choix mémorisé

  await page.getByRole('button', { name: 'Gérer mes choix' }).click();
  await expect(banner).toBeVisible();
});

test('refuser la mesure d\'audience : aucune visite n\'est envoyée', async ({ page }) => {
  const hits: string[] = [];
  page.on('request', (r) => r.url().includes('/api/analytics/hit') && hits.push(r.url()));
  await page.goto('/');
  await dismissBanner(page, 'Refuser');
  await page.goto('/horaires');
  await expect(page.getByRole('heading', { name: 'Horaires des messes' })).toBeVisible();
  expect(hits).toEqual([]);
});

test('navigation par le menu vers les horaires', async ({ page }) => {
  await open(page, '/');
  await dismissBanner(page);
  await openMenuItem(page, 'Vie spirituelle', 'Horaires des messes');
  await expect(page).toHaveURL(/\/horaires$/);
  await expect(page.getByRole('heading', { name: 'Horaires des messes' })).toBeVisible();
});

test('une page inexistante affiche un 404 clair', async ({ page }) => {
  const res = await page.goto('/p/cette-page-nexiste-pas');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
  await page.getByRole('link', { name: 'Retour à l\'accueil' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('l\'agenda, la galerie et la messe en direct répondent', async ({ page }) => {
  for (const [path, title] of [['/agenda', 'Agenda paroissial'], ['/galerie', 'Galerie'], ['/direct', 'Messe en direct'], ['/bulletins', 'Bulletins paroissiaux']] as const) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  }
});

test('sitemap et robots.txt sont servis', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('<urlset');
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toMatch(/Disallow: \/admin/);
});

test('en-têtes de sécurité (production)', async ({ request }) => {
  // À RÉACTIVER avec les en-têtes de sécurité (retirés pour l'instant : voir docs/SECURITE.md).
  test.fixme(true, 'En-têtes de sécurité retirés pour le moment');
  test.skip(!process.env.EXPECT_SECURITY_HEADERS, 'Vérifié seulement sur la pile de production');
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("object-src 'none'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'self'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('SAMEORIGIN');
  expect(h['referrer-policy']).toBeTruthy();
});
