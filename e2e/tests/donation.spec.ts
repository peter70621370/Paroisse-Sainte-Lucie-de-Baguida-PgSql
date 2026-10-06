import { expect, test } from '@playwright/test';
import { BASE, dismissBanner, hydrated, open } from './helpers';

// Parcours de don complet en mode SIMULATION (PAYMENT_MODE=mock). Ignoré si les vrais prestataires sont actifs.
// Les dons de test portent le nom « E2E … » : voir e2e/README.md pour les supprimer de la base de développement.
test.describe('don en ligne (simulation)', () => {
  test.beforeEach(async ({ request, page }) => {
    const cfg = await (await request.get('/api/donations/methods')).json();
    test.skip(cfg.mode !== 'mock', 'Le mode simulation n\'est pas actif');
    // Le backend renvoie des adresses de retour en PUBLIC_URL (celle d'un navigateur sur la machine du développeur).
    // Dans le conteneur de test, le même site est joint par BASE_URL : on redirige simplement ces requêtes.
    const publicUrl = process.env.PUBLIC_URL ?? 'http://localhost:3000';
    if (publicUrl !== BASE) await page.route(`${publicUrl}/**`, (route) => route.continue({ url: route.request().url().replace(publicUrl, BASE) }));
  });

  async function fill(page: import('@playwright/test').Page, amountLabel: string) {
    await open(page, '/dons');
    await dismissBanner(page);
    await page.getByRole('button', { name: amountLabel, exact: true }).click();
    await page.getByLabel(/Nom et prénoms/).fill('E2E Donateur');
    await page.getByLabel(/Téléphone/).fill('+228 90 11 22 33');
    await page.getByLabel(/E-mail/).fill('e2e.donateur@example.test');
    await page.locator('main').getByRole('checkbox').check();
  }

  test('paiement réussi : confirmation affichée et don visible côté administration', async ({ page, browser }) => {
    await fill(page, '2 000 FCFA');
    await page.getByRole('button', { name: /Donner 2 000 FCFA/ }).click();

    await expect(page).toHaveURL(/\/dons\/simulation\?ref=DON/);
    await hydrated(page);
    await expect(page.getByText('Simulation — aucun vrai paiement')).toBeVisible();
    await expect(page.getByText(/2 000 FCFA/)).toBeVisible();
    const ref = new URL(page.url()).searchParams.get('ref')!;
    await page.getByRole('button', { name: 'Simuler un paiement réussi' }).click();

    await expect(page.getByText('Merci pour votre don !')).toBeVisible();
    await expect(page.getByText(ref)).toBeVisible();

    // côté paroisse (session administrateur)
    const admin = await browser.newContext({ storageState: '.auth-admin.json' });
    const ap = await admin.newPage();
    await ap.goto('/admin/donations');
    await expect(ap.getByRole('row', { name: /E2E Donateur/ }).first()).toContainText('Réussi');
    await admin.close();
  });

  test('paiement échoué : message clair et possibilité de réessayer', async ({ page }) => {
    await fill(page, '1 000 FCFA');
    await page.getByRole('button', { name: /Donner 1 000 FCFA/ }).click();
    await expect(page).toHaveURL(/\/dons\/simulation\?ref=DON/);
    await hydrated(page); // page atteinte par redirection : on attend qu'elle soit prête avant de cliquer
    await page.getByRole('button', { name: 'Simuler un échec' }).click();
    await expect(page.getByText(/Le paiement n'a pas abouti/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Réessayer' })).toBeVisible();
  });

  test('montant invalide refusé avec un message', async ({ page }) => {
    await open(page, '/dons');
    await dismissBanner(page);
    await page.getByLabel(/Autre montant/).fill('1002'); // pas un multiple de 5
    await page.getByLabel(/Nom et prénoms/).fill('E2E Donateur');
    await page.getByLabel(/Téléphone/).fill('+228 90 11 22 33');
    await page.locator('main').getByRole('checkbox').check();
    await page.getByRole('button', { name: /Donner/ }).click();
    await expect(page.getByText(/multiple de 5/)).toBeVisible();
  });
});
