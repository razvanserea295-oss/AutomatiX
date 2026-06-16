import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1480, height: 900 } });
await p.goto('http://127.0.0.1:5181/fiori-preview.html', { waitUntil: 'load', timeout: 90000 });
await p.waitForTimeout(4500);
const data = await p.evaluate(() => {
  const out = {};
  const sn = document.querySelector('ui5-side-navigation');
  if (!sn) return { error: 'no side nav' };
  out.hostBg = getComputedStyle(sn).backgroundColor;
  const conts = [];
  const visit = (root) => {
    root.querySelectorAll('*').forEach((el) => {
      const c = getComputedStyle(el);
      if (c.backgroundColor && c.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        conts.push({ tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') || '').slice(0, 34), part: el.getAttribute('part') || undefined, bg: c.backgroundColor });
      }
      if (el.shadowRoot) visit(el.shadowRoot);
    });
  };
  if (sn.shadowRoot) visit(sn.shadowRoot);
  out.containers = conts.slice(0, 10);
  const rcs = getComputedStyle(document.documentElement);
  out.vars = {};
  ['--sapList_Background', '--sapGroup_ContentBackground', '--sapList_HeaderBackground', '--sapBackgroundColor', '--sapShell_Background', '--sapList_BorderColor'].forEach((k) => out.vars[k] = rcs.getPropertyValue(k).trim());
  return out;
});
console.log(JSON.stringify(data, null, 2));
await b.close();
