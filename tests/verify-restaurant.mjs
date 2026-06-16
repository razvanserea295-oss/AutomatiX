import { chromium } from '@playwright/test';

const base = 'http://127.0.0.1:3703';
const dir = 'C:/APLICATIE AUTOMATIX/Automatix-NEW/tests/shots';
const NEWPW = 'Verif!Floor9Plan';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const out = [];
const shot = async (n) => { await page.screenshot({ path: `${dir}/${n}.png` }); out.push(`shot:${n}`); };

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await shot('01-login');

  await page.getByPlaceholder('Utilizator').fill('admin');
  await page.getByPlaceholder('Parolă').fill('1234');
  await page.getByRole('button', { name: 'Conectează-te' }).click();
  await page.waitForTimeout(2500);
  await shot('02-after-login');

  if (await page.locator('#next').count() > 0) {
    await page.fill('#current', '1234');
    await page.fill('#next', NEWPW);
    await page.fill('#confirm', NEWPW);
    await page.getByRole('button', { name: 'Actualizează parola' }).click();
    await page.waitForTimeout(3000);
    await shot('03-after-pwchange');
  }

  for (const [n, p] of [['orders', '/orders'], ['tables', '/tables'], ['reservations', '/reservations'], ['menu', '/menu']]) {
    await page.goto(`${base}/#${p}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    await shot(`page-${n}`);
    out.push(`${n}->${page.url()}`);
  }
  console.log('DONE | ' + out.join(' | '));
} catch (e) {
  console.log('ERROR: ' + e.message);
  try { await shot('zz-error'); } catch {}
} finally {
  await browser.close();
}
