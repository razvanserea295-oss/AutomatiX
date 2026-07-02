import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = join(process.cwd(), 'src');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function stripChromeProp(src) {
  let out = src;
  // multiline chrome={<PageChrome ...>...</PageChrome>}
  out = out.replace(/\s*chrome=\{[\s\S]*?<\/PageChrome>\s*\}\s*/g, '\n      ');
  // self-closing chrome={<PageChrome ... />}
  out = out.replace(/\s*chrome=\{<PageChrome[\s\S]*?\/>\}\s*/g, '\n      ');
  // fragment chrome={<><PageChrome ... /></>}
  out = out.replace(/\s*chrome=\{<>[\s\S]*?<\/>\s*\}\s*/g, '\n      ');
  // generic chrome={...} before known layout props
  out = out.replace(/\s*chrome=\{[\s\S]*?\}\s*(?=\n\s*(?:toolbar|actions|leading|kpis|bodyClassName|contentClassName|children|>))/g, '\n      ');
  return out;
}

function stripImports(src) {
  return src
    .replace(/,\s*PageChrome\b/g, '')
    .replace(/\bPageChrome,\s*/g, '')
    .replace(/import\s*\{\s*PageChrome\s*\}\s*from\s*['"]@\/app-ui['"];\s*\n?/g, '');
}

let changed = 0;
for (const file of walk(root)) {
  const src = readFileSync(file, 'utf8');
  if (!src.includes('PageChrome') && !src.includes('chrome={')) continue;
  let next = stripImports(stripChromeProp(src));
  // collapse duplicate blank lines after removal
  next = next.replace(/\n\s*\n\s*\n/g, '\n\n');
  if (next !== src) {
    writeFileSync(file, next);
    changed++;
    console.log('updated', file.replace(process.cwd(), ''));
  }
}
console.log('files updated:', changed);
