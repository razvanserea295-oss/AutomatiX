import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = join(process.cwd(), 'src');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}

for (const file of walk(root)) {
  if (file.includes('PageChrome.tsx')) continue;
  let src = readFileSync(file, 'utf8');
  const next = src
    .replace(/,\s*PageChrome\b/g, '')
    .replace(/\bPageChrome,\s*/g, '')
    .replace(/import\s*\{\s*PageChrome\s*\}\s*from\s*['"]@\/app-ui['"];\s*\n?/g, '');
  if (next !== src) writeFileSync(file, next);
}
