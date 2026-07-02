#!/usr/bin/env node
/** Mechanical UI cleanup across redesign *Page.tsx files. */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = path.join(root, 'src/redesign/pages');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (name.endsWith('Page.tsx')) acc.push(full);
  }
  return acc;
}

function polish(text, rel) {
  let next = text;
  let changed = false;

  const apply = (re, rep) => {
    const n = next.replace(re, rep);
    if (n !== next) { next = n; changed = true; }
  };

  // Legacy enter animations on page shells
  apply(/\s*enter-up\b/g, '');
  apply(/\s*enter-fade\b/g, '');
  apply(/\s*enter-scale\b/g, '');
  apply(/\s*style=\{\{\s*animationDelay:\s*'[^']*'\s*\}\}/g, '');

  // Stray empty JSX blocks left from edits
  apply(/\n\s*\{\s*\}\s*\n/g, '\n');

  // Full-page centered loader → PageLoadingShell (simple one-liner pattern)
  if (!next.includes('PageLoadingShell')) {
    const loaderRe = /return\s+<div className="flex flex-1 items-center justify-center(?: bg-surface-page)?">\s*<Loader2 className="h-6 w-6 animate-spin text-content-muted"[^/]*\/>\s*<\/div>;/g;
    if (loaderRe.test(next)) {
      next = next.replace(loaderRe, 'return <PageLoadingShell />;');
      if (!next.includes("from '@/redesign/ui/PageLoadingShell'")) {
        next = next.replace(
          /(import .+ from '@\/app-ui';)/,
          "$1\nimport PageLoadingShell from '@/redesign/ui/PageLoadingShell';",
        );
      }
      changed = true;
    }
  }

  // Multiline full-page loader
  const multiLoader = /if \((\w+)\) \{\s*return \(\s*<div className="flex flex-1 items-center justify-center[^"]*">\s*<Loader2 className="h-6 w-6 animate-spin text-content-muted"[^/]*\/>\s*<\/div>\s*\);\s*\}/g;
  if (multiLoader.test(next) && !next.includes('PageLoadingShell')) {
    next = next.replace(multiLoader, 'if ($1) {\n    return <PageLoadingShell />;\n  }');
    if (!next.includes("from '@/redesign/ui/PageLoadingShell'")) {
      next = next.replace(
        /(import .+ from '@\/app-ui';)/,
        "$1\nimport PageLoadingShell from '@/redesign/ui/PageLoadingShell';",
      );
    }
    changed = true;
  }

  // Normalize inner page grids
  apply(
    /className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0"/g,
    'className="page-content-grid stagger-in grid grid-cols-1 xl:grid-cols-12 gap-5 lg:gap-6 flex-1 min-h-0"',
  );
  apply(
    /className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-5"/g,
    'className="page-content-grid stagger-in grid flex-1 min-h-0 grid-cols-1 xl:grid-cols-12 gap-5 lg:gap-6"',
  );
  apply(
    /className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-6"/g,
    'className="page-content-grid stagger-in grid flex-1 min-h-0 grid-cols-1 xl:grid-cols-12 gap-5 lg:gap-6"',
  );

  // Default contentClassName on DashboardLayout when absent (skip overflow-special pages)
  const skipContent = ['KanbanPage.tsx', 'SalesHubPage.tsx', 'ChatPage.tsx'];
  if (!skipContent.some((s) => rel.endsWith(s)) && next.includes('<DashboardLayout')) {
    const layoutOpen = next.match(/<DashboardLayout\b[^>]*>/);
    const layoutTag = layoutOpen?.[0] ?? '';
    const hasLayoutContentClass = /contentClassName\s*=/.test(layoutTag);
    if (!hasLayoutContentClass) {
      next = next.replace(
        /<DashboardLayout\r?\n(\s+)(?!contentClassName=)/,
        '<DashboardLayout\n$1contentClassName="page-content-grid"\n$1',
      );
      changed = true;
    }
  }

  return { next, changed };
}

let total = 0;
for (const full of walk(pagesDir)) {
  const rel = path.relative(pagesDir, full).replace(/\\/g, '/');
  const text = readFileSync(full, 'utf8');
  const { next, changed } = polish(text, rel);
  if (changed) {
    writeFileSync(full, next, 'utf8');
    console.log('polished:', rel);
    total += 1;
  }
}
console.log(`Done — ${total} files updated`);
