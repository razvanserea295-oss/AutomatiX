// Logs in once, verifies overlay positioning (dropdown / dialog / select), and
// screenshots every built page into _review/. Read-only.
//   node scripts/review-ui.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.VERIFY_URL || 'http://localhost:3500';
const OUT = '_review';
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['dashboard', '/'], ['sales-pipeline', '/sales-hub'], ['quotations', '/quotations'], ['clients', '/clients'],
  ['projects', '/projects'], ['contracts', '/contracts'], ['briefings', '/briefings'],
  ['fisa-proiectant', '/fisa-proiectant'], ['parts-tree', '/parts-tree'], ['fisa-templates', '/fisa-templates'],
  ['libraries', '/libraries'], ['parts-ordering', '/parts-ordering'],
  ['production', '/production'], ['stations', '/stations'], ['maintenance', '/maintenance'],
  ['service-tickets', '/service-tickets'], ['time-tracking', '/time-tracking'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#username', { timeout: 15000 });
await page.fill('#username', 'razvan'); await page.fill('#password', 'Razvan@2006');
await page.click('button[type="submit"]');
await page.waitForSelector('text=Proiecte active', { timeout: 30000 });
await page.waitForTimeout(1000);

// --- overlay positioning checks ---
try {
  await page.click('[aria-label="Cont"]'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/menu-account.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
} catch (e) { console.log('account menu:', e.message); }

try {
  await page.goto(BASE + '/clients', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200);
  await page.click('text=Client nou'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/menu-dialog.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
} catch (e) { console.log('dialog:', e.message); }

try {
  await page.goto(BASE + '/quotations', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200);
  const combo = await page.$('[role="combobox"]');
  if (combo) { await combo.click(); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/menu-select.png` }); await page.keyboard.press('Escape'); }
} catch (e) { console.log('select:', e.message); }

// --- page screenshots ---
for (const [name, path] of ROUTES) {
  try {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${OUT}/page-${name}.png` });
  } catch (e) { console.log('shot fail', name, e.message); }
}
console.log('DONE. console errors:', JSON.stringify(errors.slice(0, 8)));
await browser.close();
