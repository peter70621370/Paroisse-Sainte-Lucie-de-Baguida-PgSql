import { expect, test } from '@playwright/test';
import { MAILPIT, dismissBanner, open, unique } from './helpers';

test('formulaire de contact : erreurs en français, puis envoi réussi', async ({ page }) => {
  await open(page, '/contact');
  await dismissBanner(page);

  // formulaire invalide : l'e-mail est faux, le message trop court, pas de consentement
  await page.getByLabel(/Nom et prénoms/).fill('E2E Visiteur');
  await page.getByLabel(/^E-mail/).fill('pas-un-email');
  await page.getByLabel(/Votre message/).fill('court');
  await page.getByRole('button', { name: 'Envoyer le message' }).click();
  await expect(page.getByText('Adresse e-mail invalide')).toBeVisible();
  await expect(page.getByText(/Message trop court/)).toBeVisible();
  await expect(page.getByText(/Vous devez accepter le traitement/)).toBeVisible();

  // corrigé
  const subject = unique('Contact');
  await page.getByLabel(/^E-mail/).fill('e2e.visiteur@example.test');
  await page.getByLabel(/Objet/).fill(subject);
  await page.getByLabel(/Votre message/).fill('Bonjour, ceci est un message envoyé par un test automatique.');
  await page.locator('main').getByRole('checkbox').check(); // le pied de page a aussi une case (newsletter)
  await page.getByRole('button', { name: 'Envoyer le message' }).click();
  await expect(page.getByText('Merci, votre message est envoyé')).toBeVisible();

  if (MAILPIT) {
    await expect.poll(async () => {
      const list = await (await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:e2e.visiteur@example.test')}`)).json();
      return list.messages?.some((m: { Subject: string }) => m.Subject.includes('bien reçu'));
    }).toBe(true); // accusé de réception
  }
});

test('adhésion : téléphone ou e-mail obligatoire', async ({ page }) => {
  await open(page, '/demarches/adhesion');
  await dismissBanner(page);
  await page.getByLabel(/Nom et prénoms/).fill('E2E Paroissien');
  await page.locator('main').getByRole('checkbox').check(); // le pied de page a aussi une case (newsletter)
  await page.getByRole('button', { name: /Envoyer mon adhésion/ }).click();
  await expect(page.getByText(/téléphone ou une adresse e-mail/i)).toBeVisible();
});
