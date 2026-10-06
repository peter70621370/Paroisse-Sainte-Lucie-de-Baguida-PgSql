import { expect, test } from '@playwright/test';
import { MAILPIT, adminApi, dismissBanner, open } from './helpers';

// Inscription complète : formulaire -> e-mail de confirmation (Mailpit) -> clic sur le lien -> abonné confirmé.
test('newsletter : double confirmation par e-mail puis désinscription', async ({ page, playwright }) => {
  test.skip(!MAILPIT, 'Nécessite Mailpit (environnement de développement)');
  const address = `e2e.news.${Date.now()}@example.test`;

  await open(page, '/');
  await dismissBanner(page);
  const footer = page.locator('footer');
  await footer.getByLabel(/Recevez les nouvelles|adresse e-mail/i).first().fill(address);
  await footer.getByRole('checkbox').check();
  await footer.getByRole('button', { name: /S'inscrire/ }).click();
  await expect(footer.getByText(/e-mail de confirmation/)).toBeVisible();

  // le lien de confirmation arrive par e-mail
  let link = '';
  await expect.poll(async () => {
    const list = await (await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`)).json();
    const id = list.messages?.[0]?.ID;
    if (!id) return false;
    const msg = await (await page.request.get(`${MAILPIT}/api/v1/message/${id}`)).json();
    link = (msg.Text as string).match(/https?:\/\/\S+\/newsletter\/confirmer\?token=[0-9a-f]+/)?.[0] ?? '';
    return !!link;
  }, { timeout: 20_000 }).toBe(true);

  const path = new URL(link).pathname + new URL(link).search;
  await open(page, path);
  await expect(page.getByText('Inscription confirmée')).toBeVisible();

  // désinscription depuis le lien de l'e-mail suivant (simulé : même jeton)
  const token = new URL(link).searchParams.get('token')!;
  await open(page, `/newsletter/desinscription?token=${token}`);
  await page.getByRole('button', { name: 'Confirmer ma désinscription' }).click();
  await expect(page.getByText('Vous êtes désinscrit')).toBeVisible();

  // nettoyage (droit à l'effacement)
  const api = await adminApi(playwright);
  const subs = await (await api.get(`/api/admin/subscribers?q=${encodeURIComponent(address)}`)).json();
  for (const s of subs.items) await api.delete(`/api/admin/subscribers/${s.id}`);
  await api.dispose();
});
