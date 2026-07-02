/**
 * Copies redesign pages, layout, and ui into src/v2/ with import path rewrites.
 * Run once during v2 bootstrap; v2 must not import from src/redesign at runtime.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = join(root, 'src');

const COPY_DIRS = [
  { from: 'redesign/pages', to: 'v2/features/pages' },
  { from: 'redesign/layout', to: 'v2/components/layout' },
  { from: 'redesign/ui', to: 'v2/components/primitives' },
  { from: 'redesign/pages/dashboard', to: 'v2/features/pages/dashboard' },
];

const REWRITES = [
  [/@\/redesign\/layout/g, '@/v2/components/layout'],
  [/@\/redesign\/ui/g, '@/v2/components/primitives'],
  [/@\/app-ui/g, '@/v2/components/app-ui'],
  [/@\/redesign\/lib/g, '@/v2/lib'],
  [/@\/redesign\/shell/g, '@/v2/components/shell-legacy'],
];

function walkCopy(fromDir, toDir) {
  if (!existsSync(fromDir)) return;
  mkdirSync(toDir, { recursive: true });
  for (const name of readdirSync(fromDir)) {
    const from = join(fromDir, name);
    const to = join(toDir, name);
    if (statSync(from).isDirectory()) {
      walkCopy(from, to);
    } else if (/\.(tsx?|css|md)$/.test(name)) {
      let content = readFileSync(from, 'utf8');
      for (const [re, rep] of REWRITES) content = content.replace(re, rep);
      mkdirSync(dirname(to), { recursive: true });
      writeFileSync(to, content);
    }
  }
}

// Copy portal/auth pages into v2
const SINGLE_FILES = [
  ['pages/LoginPage.tsx', 'v2/features/auth/LoginPage.tsx'],
  ['pages/ForcePasswordChangePage.tsx', 'v2/features/auth/ForcePasswordChangePage.tsx'],
  ['pages/LicenseActivationPage.tsx', 'v2/features/auth/LicenseActivationPage.tsx'],
  ['pages/LicenseLoginGate.tsx', 'v2/features/auth/LicenseLoginGate.tsx'],
  ['pages/DownloadPage.tsx', 'v2/features/public/DownloadPage.tsx'],
  ['pages/portal/CustomerPortalPage.tsx', 'v2/features/public/CustomerPortalPage.tsx'],
  ['pages/portal/RfqResponsePage.tsx', 'v2/features/public/RfqResponsePage.tsx'],
  ['pages/remote/QuickSupportGuestPage.tsx', 'v2/features/public/QuickSupportGuestPage.tsx'],
  ['pages/shared-storage/SharedStoragePage.tsx', 'v2/features/tools/SharedStoragePage.tsx'],
];

for (const { from, to } of COPY_DIRS) {
  const fromPath = join(src, from);
  const toPath = join(src, to);
  if (existsSync(fromPath)) {
    walkCopy(fromPath, toPath);
    console.log(`Copied ${from} -> ${to}`);
  }
}

for (const [from, to] of SINGLE_FILES) {
  const fromPath = join(src, from);
  const toPath = join(src, to);
  if (existsSync(fromPath)) {
    let content = readFileSync(fromPath, 'utf8');
    for (const [re, rep] of REWRITES) content = content.replace(re, rep);
    mkdirSync(dirname(toPath), { recursive: true });
    writeFileSync(toPath, content);
    console.log(`Copied ${from} -> ${to}`);
  }
}

// app-ui re-export for v2
const appUiDir = join(src, 'v2/components/app-ui');
mkdirSync(appUiDir, { recursive: true });
writeFileSync(
  join(appUiDir, 'index.ts'),
  `export { Card, CardHead, CardHeader, CardBody, CardActions, CardState, default as CardDefault } from '@/app-ui/Card';
export { default as Kpi, KpiCard, type KpiProps } from '@/app-ui/Kpi';
export {
  PageToolbar,
  PageChrome,
  Panel,
  CardSlot,
  TablePanel,
  ListPanel,
  ListPageLayout,
  MasterDetailLayout,
  DashboardLayout,
  PAGE_GRID_12,
  CARD_SLOT_CLASS,
  CARD_SLOT_COL_SPAN,
  getComplementarySize,
} from '@/v2/components/layout';
export type {
  PageChromeProps,
  PageToolbarProps,
  CardSlotProps,
  TablePanelProps,
  ListPanelProps,
  CardSlotSize,
  PanelProps,
} from '@/v2/components/layout';
`,
);

console.log('v2 port complete');
