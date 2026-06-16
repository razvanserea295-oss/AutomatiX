import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1480, height: 200 } });
await p.goto('http://127.0.0.1:5181/fiori-preview.html', { waitUntil: 'load', timeout: 90000 });
await p.waitForTimeout(4500);
const data = await p.evaluate(() => {
  const sb = document.querySelector('ui5-shellbar');
  if (!sb) return { error: 'no shellbar' };
  const cs = getComputedStyle(sb);
  const vget = (k) => cs.getPropertyValue(k).trim();
  const sr = sb.shadowRoot;
  let titleColor = null, iconColor = null, titleTxt = null;
  if (sr) {
    for (const el of sr.querySelectorAll('*')) {
      const t = el.textContent && el.textContent.trim();
      if (!titleColor && (t === 'Automatix')) { titleColor = getComputedStyle(el).color; titleTxt = el.className; }
    }
    const icon = sr.querySelector('ui5-icon');
    if (icon) iconColor = getComputedStyle(icon).color;
  }
  return {
    shellBackground: cs.backgroundColor,
    shellColor: cs.color,
    vars: {
      sapShellColor: vget('--sapShellColor'),
      sapShell_Background: vget('--sapShell_Background'),
      sapShell_TextColor: vget('--sapShell_TextColor'),
      sapShell_InteractiveTextColor: vget('--sapShell_InteractiveTextColor'),
    },
    titleColor, titleClass: titleTxt, iconColor,
  };
});
console.log(JSON.stringify(data, null, 2));
await b.close();
