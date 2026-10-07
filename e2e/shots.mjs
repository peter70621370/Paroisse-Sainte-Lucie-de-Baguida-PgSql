// Captures pleine page pour relecture visuelle : node shots.mjs [mobile] chemin1 chemin2…
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const mobile = args[0] === 'mobile';
const paths = mobile ? args.slice(1) : args;
const base = process.env.BASE_URL || 'http://frontend:3000';
mkdirSync('test-results/shots', { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => localStorage.setItem('consent-analytics', 'denied'));
const page = await ctx.newPage();
for (const p of paths) {
  await page.goto(base + p, { waitUntil: 'networkidle' });
  // Déclenche le chargement des images « lazy »
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(500);
  const name = (p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'accueil') + (mobile ? '_m' : '');
  await page.screenshot({ path: `test-results/shots/${name}.jpg`, fullPage: true, type: 'jpeg', quality: 70 });
  console.log(name);
}
await browser.close();
