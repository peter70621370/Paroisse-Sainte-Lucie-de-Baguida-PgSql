import { request, type FullConfig } from '@playwright/test';
import { ADMIN, ensureStaff } from './tests/helpers';

// Une seule connexion administrateur pour toute la série (évite la limite de 5 essais/minute), enregistrée dans un fichier réutilisé.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]!.use.baseURL!;
  const ctx = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const res = await ctx.post('/api/auth/login', { data: { email: ADMIN.email, password: ADMIN.password } });
  if (!res.ok()) throw new Error(`Connexion administrateur impossible (${res.status()}). Vérifiez ADMIN_EMAIL / ADMIN_PASSWORD.`);
  await ctx.storageState({ path: '.auth-admin.json' });
  // Comptes éditeur / contributeur de test (créés une fois, supprimés ou désactivés en fin de série par nettoyage manuel si besoin).
  await ensureStaff(ctx);
  await ctx.dispose();
}
