#!/usr/bin/env node
/**
 * Gate: SaaS UI migration must be 100% on active routes.
 * Excludes src/fiori/** and deleted legacy files.
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function rg(pattern, globs, extraArgs = '') {
  const globArgs = globs.map((g) => `--glob ${g}`).join(' ');
  try {
    const out = execSync(
      `rg -n "${pattern}" ${globArgs} ${extraArgs} src/redesign/pages src/pages`,
      { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return out.trim();
  } catch (e) {
    if (e.status === 1) return '';
    throw e;
  }
}

/** Shell-level legacy markers only — GlassCard may remain inside panel bodies per PAGES_MIGRATION.md */
const legacyHits = rg(
  'HeroHeader|mod-shell|EditLayoutButton|TierToggle',
  ['!**/fiori/**', '!**/*.md', '!**/ManagerControlPage.tsx', '!src/pages/ManagerControlPage.tsx'],
);
if (legacyHits) {
  errors.push(`Legacy UI markers on active routes:\n${legacyHits}`);
}

const workspacePageFit = rg('<Page fit>', ['src/pages/workspace/**']);
if (workspacePageFit) {
  errors.push(`Workspace double-wrap <Page fit>:\n${workspacePageFit}`);
}

function listPageFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) listPageFiles(full, acc);
    else if (name.endsWith('Page.tsx')) acc.push(full);
  }
  return acc;
}

const redesignPages = listPageFiles(path.join(root, 'src/redesign/pages'));
const missingChrome = redesignPages.filter((f) => {
  const text = readFileSync(f, 'utf8');
  return !text.includes('PageChrome');
});
if (missingChrome.length) {
  errors.push(
    `*Page.tsx without PageChrome:\n${missingChrome.map((f) => path.relative(root, f)).join('\n')}`,
  );
}

if (errors.length) {
  console.error('[check:migration] FAILED\n');
  for (const e of errors) console.error(`${e}\n`);
  process.exit(1);
}

console.log('[check:migration] OK — active routes pass migration gate');
