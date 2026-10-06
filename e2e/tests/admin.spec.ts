import { expect, test } from '@playwright/test';
import { ADMIN, BASE, CONTRIB, adminApi, open, unique } from './helpers';

test.describe('connexion', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // visiteur non connecté

  test('mauvais mot de passe : message clair, pas de connexion', async ({ page }) => {
    await open(page, '/admin/login');
    await page.getByLabel('E-mail').fill(ADMIN.email);
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('alert')).toContainText('incorrect');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('l\'administration redirige vers la connexion sans session', async ({ page }) => {
    await page.goto('/admin/pages');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('connexion par le formulaire, puis déconnexion', async ({ page }) => {
    await open(page, '/admin/login');
    await page.getByLabel('E-mail').fill(ADMIN.email);
    await page.getByLabel('Mot de passe').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/); // la session est bien fermée
  });
});

test.describe('administrateur connecté', () => {
  test.use({ storageState: '.auth-admin.json' });

  test('tableau de bord et menu complet', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    const nav = page.locator('aside nav');
    for (const label of ['Demandes reçues', 'Dons reçus', 'Pages', 'Galerie', 'Utilisateurs', 'Paramètres du site']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('créer et publier une page avec l\'éditeur, la voir sur le site, puis la supprimer', async ({ page, playwright }) => {
    const title = unique('Page');
    await open(page, '/admin/pages/new');
    await page.getByLabel('Titre', { exact: true }).fill(title);
    const slugInput = page.getByLabel(/Adresse \(slug\)/);
    await expect(slugInput).toHaveValue(/^e2e-page-\d+$/); // adresse proposée automatiquement (avec attente)
    const slug = await slugInput.inputValue();

    // éditeur riche : saisie + titre
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.type('Un texte publié par un test automatique.');
    await page.keyboard.press('Control+A');
    await page.getByRole('button', { name: 'Titre', exact: true }).click();

    await page.getByLabel('Statut').selectOption('PUBLISHED');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page).toHaveURL(/\/admin\/pages\/\d+$/);
    const id = page.url().split('/').pop();

    try {
      // visible publiquement, titre de section rendu en <h2>
      const pub = await page.context().newPage();
      await pub.goto(`/p/${slug}`);
      await expect(pub.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(pub.locator('article h2')).toContainText('Un texte publié');
      await pub.close();
    } finally {
      const api = await adminApi(playwright);
      await api.delete(`/api/admin/pages/${id}`);
      await api.dispose();
    }
    const after = await page.request.get(`/api/pages/${slug}`);
    expect(after.status()).toBe(404); // supprimée
  });

  test('un brouillon n\'est pas visible du public', async ({ page, playwright }) => {
    const api = await adminApi(playwright);
    const slug = `e2e-brouillon-${Date.now()}`;
    const created = await api.post('/api/admin/pages', { data: { slug, title: unique('Brouillon'), content: '<p>secret</p>' } });
    const id = (await created.json()).item.id;
    try {
      const res = await page.goto(`/p/${slug}`);
      expect(res?.status()).toBe(404);
    } finally {
      await api.delete(`/api/admin/pages/${id}`);
      await api.dispose();
    }
  });

  test('l\'éditeur ne peut pas être contourné : le HTML dangereux est nettoyé', async ({ playwright }) => {
    const api = await adminApi(playwright);
    const res = await api.post('/api/admin/pages', { data: { slug: `e2e-xss-${Date.now()}`, title: unique('XSS'), content: '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>' } });
    const item = (await res.json()).item;
    expect(item.content).not.toMatch(/script|onerror/i);
    await api.delete(`/api/admin/pages/${item.id}`);
    await api.dispose();
  });
});

test.describe('contributeur', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('ne voit pas les menus réservés et ne peut pas publier', async ({ page, request }) => {
    const login = await request.post(`${BASE}/api/auth/login`, { data: CONTRIB, headers: { Origin: BASE } });
    expect(login.ok()).toBe(true);
    await page.context().addCookies(await (await request.storageState()).cookies);

    await page.goto('/admin');
    const nav = page.locator('aside nav');
    await expect(nav.getByRole('link', { name: 'Pages' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Utilisateurs' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Dons reçus' })).toHaveCount(0);

    await page.goto('/admin/users'); // accès direct refusé
    await expect(page).toHaveURL(/\/admin$/);

    await open(page, '/admin/pages/new');
    await expect(page.getByLabel('Statut').locator('option[value="PUBLISHED"]')).toHaveCount(0); // pas de « Publié »
  });
});
