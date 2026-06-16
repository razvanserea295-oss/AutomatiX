import { chromium } from '@playwright/test';

const url = process.argv[2] || 'http://127.0.0.1:5181/fiori-preview.html';
const out = process.argv[3] || 'fiori-reservations.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1480, height: 920 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(url, { waitUntil: 'load', timeout: 90000 });
// give UI5 web components + the AnalyticalTable time to upgrade & render
await page.waitForTimeout(5000);
await page.screenshot({ path: out });
console.log('screenshot saved:', out);
console.log('console errors:', errors.length ? JSON.stringify(errors.slice(0, 8), null, 2) : 'none');
await browser.close();
