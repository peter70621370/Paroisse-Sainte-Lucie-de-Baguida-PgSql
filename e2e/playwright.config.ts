import { defineConfig, devices } from '@playwright/test';

// Tests de bout en bout : un vrai navigateur sur le site complet (frontend + API + base).
// Lancement : voir e2e/README.md. Un seul worker : la connexion est limitée à 5 essais/minute et les tests partagent la base.
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  retries: 1,
  reporter: [['list']],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    locale: 'fr-FR',
    timezoneId: 'Africa/Lome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'bureau', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: /public\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
});
