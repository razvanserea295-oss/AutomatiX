/**
 * Remove inline page header blocks; keep actions/toolbar in PageToolbar.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const HEADER_START = /<(header|div)\s+[^>]*(?:enter-up|border-b border-line)[^>]*>/;

function balanceTag(src, openIdx) {
  const tagMatch = src.slice(openIdx).match(/^<([a-zA-Z][\w.-]*)/);
  if (!tagMatch) throw new Error(`No tag at ${openIdx}`);
  const tag = tagMatch[1];
  let depth = 0;
  let inString = null;
  let escaped = false;
  const openRe = new RegExp(`<${tag}(?:\\s|>|/)`, 'g');
  const closeRe = new RegExp(`</${tag}>`, 'g');
  let i = openIdx;
  while (i < src.length) {
    const ch = src[i];
    if (inString) {
      if (escaped) { escaped = false; i++; continue; }
      if (ch === '\\') { escaped = true; i++; continue; }
      if (ch === inString) inString = null;
      i++; continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; i++; continue; }
    if (src.startsWith(`<${tag}`, i)) {
      const selfClose = /^\s*\/>/.test(src.slice(i).replace(/^<[^>]+/, ''));
      const gt = src.indexOf('>', i);
      if (gt === -1) break;
      const tagChunk = src.slice(i, gt + 1);
      if (tagChunk.endsWith('/>')) { i = gt + 1; continue; }
      depth++;
      i = gt + 1;
      continue;
    }
    if (src.startsWith(`</${tag}>`, i)) {
      depth--;
      i += `</${tag}>`.length;
      if (depth === 0) return i;
      continue;
    }
    i++;
  }
  throw new Error(`Unbalanced <${tag}> from ${openIdx}`);
}

function extractBalancedJsx(src, prop, from) {
  const re = new RegExp(`\\b${prop}=\\{`);
  const m = re.exec(from);
  if (!m) return null;
  const brace = from.indexOf('{', m.index);
  let depth = 0;
  let inString = null;
  let escaped = false;
  for (let i = brace; i < from.length; i++) {
    const ch = from[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return from.slice(brace + 1, i).trim();
    }
  }
  return null;
}

function extractHeroHeader(block) {
  const actions = extractBalancedJsx(block, 'actions', block);
  const children = extractBalancedJsx(block, 'children', block);
  return { actions, toolbar: children };
}

function findHeaderBlock(src) {
  const patterns = [
    /<(header|div)\s+[^>]*enter-up[^>]*shrink-0[^>]*border-b[^>]*>/,
    /<(header|div)\s+[^>]*border-b border-line[^>]*enter-up[^>]*>/,
    /<div className="px-6 pt-5 pb-4 shrink-0 border-b[^>]*>/,
    /<header className="[^"]*border-b[^"]*"[^>]*>/,
    /<HeroHeader[\s\S]*?\/>/,
    /<HeroHeader[\s\S]*?<\/HeroHeader>/,
  ];
  for (const re of patterns) {
    const m = re.exec(src);
    if (m) {
      if (m[0].startsWith('<HeroHeader')) {
        const end = src.indexOf('</HeroHeader>', m.index);
        const block = end === -1 ? m[0] : src.slice(m.index, end + '</HeroHeader>'.length);
        return { start: m.index, end: end === -1 ? m.index + m[0].length : end + '</HeroHeader>'.length, block, kind: 'hero' };
      }
      const end = balanceTag(src, m.index);
      return { start: m.index, end, block: src.slice(m.index, end), kind: 'inline' };
    }
  }
  return null;
}

function extractFromInlineHeader(block) {
  let actions = null;
  let toolbar = null;

  const animatedTabs = block.match(/<AnimatedTabs[\s\S]*?\/>/);
  if (animatedTabs) toolbar = animatedTabs[0];

  const filterBarBlock = block.match(/<FilterBar[\s\S]*?\/>/);
  if (filterBarBlock && !toolbar) toolbar = filterBarBlock[0];

  const buttonSection = block.match(/<Button[\s\S]*?<\/Button>/g);
  if (buttonSection?.length) {
    actions = buttonSection.length === 1 ? buttonSection[0] : `<>${buttonSection.join('\n')}</>`;
  }

  const condButton = block.match(/\{!isViewer[\s\S]*?<\/Button>\s*\)\}/);
  if (condButton && !actions) actions = condButton[0];

  const fragmentActions = block.match(/actions=\{([\s\S]*?)\}/);
  if (fragmentActions) actions = fragmentActions[1].trim();

  return { actions, toolbar };
}

function ensurePageToolbarImport(src) {
  if (src.includes('PageToolbar')) return src;
  if (src.includes("from '@/app-ui'")) {
    return src.replace(
      /import \{([^}]+)\} from '@\/app-ui';/,
      (m, imp) => {
        if (imp.includes('PageToolbar')) return m;
        return `import { ${imp.trim()}, PageToolbar } from '@/app-ui';`;
      },
    );
  }
  const pageImport = src.match(/import Page from '@\/redesign\/ui\/Page';/);
  if (pageImport) {
    return src.replace(
      pageImport[0],
      `${pageImport[0]}\nimport { PageToolbar } from '@/app-ui';`,
    );
  }
  return `import { PageToolbar } from '@/app-ui';\n${src}`;
}

function buildToolbarJsx(actions, toolbar, leading) {
  const props = [];
  if (leading) props.push(`leading={${leading}}`);
  if (toolbar) props.push(`toolbar={${toolbar}}`);
  if (actions) props.push(`actions={${actions}}`);
  if (!props.length) return '';
  return `<PageToolbar ${props.join(' ')} />\n\n        `;
}

function processFile(rel) {
  const file = path.join(ROOT, rel);
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('PageToolbar') && !findHeaderBlock(src)) return { rel, changed: false };

  let leading = null;
  const viewer = src.match(/<ViewerBanner[^/]*\/>/);
  if (viewer) {
    leading = viewer[0];
    src = src.replace(viewer[0], '').replace(/<>\s*<\/>\s*/g, '');
  }

  const header = findHeaderBlock(src);
  if (!header) return { rel, changed: false, skip: true };

  let actions = null;
  let toolbar = null;
  if (header.kind === 'hero') {
    ({ actions, toolbar } = extractHeroHeader(header.block));
  } else {
    ({ actions, toolbar } = extractFromInlineHeader(header.block));
  }

  const toolbarJsx = buildToolbarJsx(actions, toolbar, leading);
  src = ensurePageToolbarImport(src);
  src = src.slice(0, header.start) + toolbarJsx + src.slice(header.end);

  if (src.includes('<HeroHeader')) {
    console.warn(`WARN HeroHeader remains: ${rel}`);
  }

  fs.writeFileSync(file, src);
  return { rel, changed: true };
}

const files = fs.readFileSync(path.join(__dirname, 'page-header-files.txt'), 'utf8')
  .split('\n').map(s => s.trim()).filter(Boolean);

for (const rel of files) {
  try {
    const r = processFile(rel);
    console.log(r.changed ? `OK ${rel}` : `skip ${rel}${r.skip ? '' : ''}`);
  } catch (e) {
    console.error(`FAIL ${rel}:`, e.message);
  }
}
