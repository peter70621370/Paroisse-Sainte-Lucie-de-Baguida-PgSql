import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { dismissBanner } from './helpers';

// Accessibilité automatique (WCAG 2.1 A/AA) : aucune violation « grave » ou « critique » tolérée.
// L'audit automatique ne remplace pas un test avec un lecteur d'écran, mais attrape les erreurs courantes (contrastes, libellés, titres…).
const pages = ['/', '/horaires', '/agenda', '/actualites', '/bulletins', '/galerie', '/direct', '/contact', '/dons', '/demarches/adhesion', '/p/histoire', '/admin/login'];

for (const path of pages) {
  test(`accessibilité : ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await dismissBanner(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      serious.map((v) => `${v.id} (${v.impact}) : ${v.help} — ${v.nodes.length} élément(s), ex. ${v.nodes[0]?.target.join(' ')}`),
    ).toEqual([]);
  });
}

test('le bandeau de vie privée est lui aussi accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Votre vie privée' })).toBeVisible();
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});
