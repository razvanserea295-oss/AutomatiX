/**
 * One-off codemod: PageChrome chrome prop -> DashboardLayout toolbar/actions/leading
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const files = fs.readFileSync(path.join(__dirname, 'page-chrome-files.txt'), 'utf8')
  .split('\n').map(s => s.trim()).filter(Boolean);

function balanceClose(src, openIdx) {
  const open = src[openIdx];
  const close = open === '{' ? '}' : open === '(' ? ')' : open === '<' ? '>' : null;
  if (!close) throw new Error(`Unknown opener at ${openIdx}: ${open}`);
  let depth = 0;
  let inString = null;
  let escaped = false;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error(`Unbalanced ${open} from ${openIdx}`);
}

function extractJsxProp(body, prop) {
  const re = new RegExp(`\\b${prop}=\\{`);
  const m = re.exec(body);
  if (!m) return null;
  const braceStart = m.index + m[0].length - 1;
  const end = balanceClose(body, braceStart);
  return body.slice(braceStart + 1, end - 1).trim();
}

function extractPageChromeInner(block) {
  const pcStart = block.indexOf('<PageChrome');
  if (pcStart === -1) return null;

  const rest = block.slice(pcStart);
  const selfClose = rest.search(/\/>/);
  const closeTag = rest.indexOf('</PageChrome>');

  if (selfClose !== -1 && (closeTag === -1 || selfClose < closeTag)) {
    const tag = rest.slice(0, selfClose + 2);
    return tag.replace(/^<PageChrome\s*/, '').replace(/\/>$/, '');
  }
  if (closeTag !== -1) {
    const tag = rest.slice(0, closeTag + '</PageChrome>'.length);
    return tag.replace(/^<PageChrome\s*/, '').replace(/>$/, '').replace(/<\/PageChrome>$/, '');
  }
  throw new Error('Could not parse PageChrome tag');
}

function transformChromeBlock(block) {
  const viewerMatch = block.match(/<ViewerBanner[^/]*\/>/);
  const leading = viewerMatch ? viewerMatch[0] : null;

  const inner = extractPageChromeInner(block);
  if (!inner) {
    if (leading) return `leading={${leading}}`;
    return '';
  }

  const toolbar = extractJsxProp(inner, 'toolbar');
  const actions = extractJsxProp(inner, 'actions');

  const parts = [];
  if (leading) parts.push(`leading={${leading}}`);
  if (toolbar) parts.push(`toolbar={${toolbar}}`);
  if (actions) parts.push(`actions={${actions}}`);
  return parts.join('\n      ');
}

function stripImports(src) {
  return src
    .replace(
      /import\s*\{([^}]*)\}\s*from\s*'@\/app-ui';/g,
      (m, imports) => {
        const items = imports.split(',').map((s) => s.trim()).filter(Boolean);
        const filtered = items.filter((i) => !i.includes('PageChrome'));
        return filtered.length ? `import { ${filtered.join(', ')} } from '@/app-ui';` : '';
      },
    )
    .replace(
      /import\s*\{([^}]*)\}\s*from\s*'@\/redesign\/layout';/g,
      (m, imports) => {
        const items = imports.split(',').map((s) => s.trim()).filter(Boolean);
        const filtered = items.filter((i) => !i.includes('PageChrome'));
        return filtered.length ? `import { ${filtered.join(', ')} } from '@/redesign/layout';` : '';
      },
    );
}

function transformFile(rel) {
  const file = path.join(ROOT, rel);
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('chrome=')) return { rel, changed: false };

  src = stripImports(src);

  let changed = false;
  const marker = 'chrome={';
  let idx = 0;
  while ((idx = src.indexOf(marker, idx)) !== -1) {
    const braceStart = idx + marker.length - 1;
    const braceEnd = balanceClose(src, braceStart);
    const inner = src.slice(braceStart + 1, braceEnd - 1).trim();
    const replacement = transformChromeBlock(inner);
    const after = src.slice(braceEnd).match(/^\s*/)?.[0] ?? '';
    const newBlock = replacement ? `${replacement}${after}` : '';
    src = src.slice(0, idx) + newBlock + src.slice(braceEnd + after.length);
    changed = true;
    idx = idx + newBlock.length;
  }

  if (src.includes('PageChrome') || src.includes('chrome=')) {
    console.warn(`WARN still has PageChrome/chrome: ${rel}`);
  }

  fs.writeFileSync(file, src);
  return { rel, changed };
}

for (const rel of files) {
  try {
    const r = transformFile(rel);
    console.log(r.changed ? `OK ${rel}` : `skip ${rel}`);
  } catch (e) {
    console.error(`FAIL ${rel}:`, e);
  }
}
