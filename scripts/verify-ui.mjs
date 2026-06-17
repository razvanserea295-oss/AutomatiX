// Playwright verification harness for the UI rebuild.
//   node scripts/verify-ui.mjs                      → login + dashboard smoke
//   VERIFY_URL=http://localhost:3500 node ...       → target a specific host
//   VERIFY_PATH=/clients node ...                   → after login, visit a page
// Read-only: logs in and views pages, never mutates. Writes verify-*.png.
import { chromium } from '@playwright/test';

const BASE = process.env.VERIFY_URL || 'http://localhost:3500';
const USER = process.env.VERIFY_USER || 'razvan';
const PASS = process.env.VERIFY_PASS || 'Razvan@2006';
const EXTRA_PATH = process.env.VERIFY_PATH || '';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

let ok = false;
try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#username', { timeout: 15000 });
  await page.fill('#username', USER);
  await page.fill('#password', PASS);
  await page.click('button[type="submit"]');
  // Survives the tenant-slug reload that follows a multi-tenant login.
  await page.waitForSelector('text=Proiecte active', { timeout: 30000 });
  await page.waitForTimeout(1200);
  ok = true;
  console.log('LOGIN OK — dashboard rendered');
  console.log('URL:', page.url());
  console.log('H1:', (await page.textContent('h1').catch(() => '(none)')) || '(none)');
  await page.screenshot({ path: 'verify-dashboard.png', fullPage: true });

  if (EXTRA_PATH) {
    await page.goto(BASE + EXTRA_PATH, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    console.log('VISITED:', EXTRA_PATH, '→ H1:', (await page.textContent('h1').catch(() => '(none)')) || '(none)');
    if (process.env.VERIFY_CLICK) {
      await page.click(`text=${process.env.VERIFY_CLICK}`); await page.waitForTimeout(500);
      console.log('CLICKED:', process.env.VERIFY_CLICK);
    }
    await page.screenshot({ path: 'verify-page.png', fullPage: true });
  }
} catch (e) {
  console.log('FAIL:', e.message);
  console.log('URL:', page.url());
  console.log('BODY:', ((await page.textContent('body').catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 400));
  await page.screenshot({ path: 'verify-fail.png', fullPage: true }).catch(() => {});
} finally {
  console.log('CONSOLE ERRORS:', JSON.stringify(errors.slice(0, 12)));
  await browser.close();
}
process.exit(ok ? 0 : 1);
