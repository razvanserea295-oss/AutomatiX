// Authenticated screenshot helper for the live frontend watch loop.
//
//   node scripts/watch-auth-shot.mjs <route> <out.png> [base] [user] [pass]
//
// Logs in over the API to mint a real token, seeds promix_token/promix_user/
// promix_tenant_slug + promix_first_run=1 into localStorage BEFORE the SPA boots
// (so it skips the setup wizard and restores the session), navigates to <route>
// on the vite dev server, screenshots it, and prints any console/page errors.
import { chromium } from '@playwright/test';

const route = process.argv[2] || '/';
const out = process.argv[3] || 'watch-auth.png';
const base = process.argv[4] || 'http://localhost:1420';
const username = process.argv[5] || 'razvan';
const password = process.argv[6] || 'Razvan@2006';

// 1) Mint a session via the API (proxied through the dev server to the backend).
const loginRes = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});
if (!loginRes.ok) {
  console.error('login failed:', loginRes.status, await loginRes.text());
  process.exit(1);
}
const { token, user, tenant_slug } = await loginRes.json();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1480, height: 920 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

// 2) Seed the session before any app code runs.
await page.addInitScript(([t, u, slug]) => {
  localStorage.setItem('promix_token', t);
  localStorage.setItem('promix_user', JSON.stringify(u));
  if (slug) localStorage.setItem('promix_tenant_slug', slug);
  localStorage.setItem('promix_first_run', '1'); // skip the setup wizard
}, [token, user, tenant_slug]);

const target = base + (route.startsWith('#') ? '/' + route : route);
await page.goto(target, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(Number(process.argv[7]) || 6000); // let lazy chunks + UI5 upgrade + data settle
await page.screenshot({ path: out, fullPage: false });
console.log('screenshot saved:', out, '(as', user.username, '/', user.role_name + ')');
console.log('console errors:', errors.length ? JSON.stringify(errors.slice(0, 10), null, 2) : 'none');
await browser.close();
