#!/usr/bin/env node
/**
 * Injects PageChrome into redesign *Page.tsx files that use DashboardLayout.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesRoot = path.join(root, 'src/redesign/pages');

/** basename → { title, subtitle? } */
const PAGE_META = {
  DashboardPage: { title: 'Tablou de bord' },
  FinancePage: { title: 'Financiar' },
  InventoryPage: { title: 'Inventar' },
  KanbanPage: { title: 'Producție' },
  ManagerControlPage: { title: 'Birou de control', subtitle: 'Predări, anomalii și activitate' },
  PartsTreePage: { title: 'Arbore piese' },
  PiecesOrderingPage: { title: 'Comenzi piese' },
  ProjectBriefingsPage: { title: 'Briefing proiecte' },
  ProjectsPage: { title: 'Proiecte' },
  FisaTemplatesPage: { title: 'Template-uri fișe' },
  LicensesPage: { title: 'Licențe' },
  AIAssistantPage: { title: 'Asistent AI' },
  AlertsPage: { title: 'Alerte' },
  UserSessionsPage: { title: 'Sesiuni active' },
  UsersPage: { title: 'Utilizatori' },
  CalendarPage: { title: 'Calendar' },
  ChatPage: { title: 'Mesaje' },
  FisaProiectantPage: { title: 'Fișa proiectant' },
  ClientsPage: { title: 'Clienți' },
  ContractPage: { title: 'Contracte' },
  DeplasariPage: { title: 'Deplasări' },
  DocumentsPage: { title: 'Documente' },
  EmailPage: { title: 'Email' },
  LibrariesPage: { title: 'Biblioteci' },
  MaintenancePage: { title: 'Mentenanță' },
  ProcurementWorkspacePage: { title: 'Aprovizionare' },
  ReportsPage: { title: 'Rapoarte' },
  LeadDetailPage: { title: 'Detaliu lead' },
  QuotationsPage: { title: 'Oferte' },
  SalesHubPage: { title: 'Vânzări' },
  ServiceTicketsPage: { title: 'Tichete service' },
  SettingsPage: { title: 'Setări' },
  StationDetailPage: { title: 'Stație' },
  PersonalTasksPage: { title: 'Task-urile mele' },
  DownloadAppPage: { title: 'Aplicație desktop' },
  PrintPage: { title: 'Imprimare' },
  TutorialPage: { title: 'Tutorial' },
  RemoteSupportPage: { title: 'Asistență la distanță' },
  WarehousePage: { title: 'Depozit' },
};

function listPageFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) listPageFiles(full, acc);
    else if (name.endsWith('Page.tsx')) acc.push(full);
  }
  return acc;
}

function ensurePageChromeImport(src) {
  const appUiRe = /import\s*\{([^}]+)\}\s*from\s*['"]@\/app-ui['"]/;
  const m = src.match(appUiRe);
  if (m) {
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.includes('PageChrome')) names.unshift('PageChrome');
    const unique = [...new Set(names)];
    return src.replace(appUiRe, `import { ${unique.join(', ')} } from '@/app-ui'`);
  }

  const dashRe = /import\s*\{([^}]*DashboardLayout[^}]*)\}\s*from\s*['"]@\/app-ui['"]/;
  if (dashRe.test(src)) return src;

  const firstImport = src.search(/^import\s/m);
  const insert = "import { PageChrome } from '@/app-ui';\n";
  if (firstImport >= 0) {
    return src.slice(0, firstImport) + insert + src.slice(firstImport);
  }
  return insert + src;
}

function injectChromeProp(src, meta) {
  if (src.includes('chrome={<PageChrome')) return src;

  const subtitle = meta.subtitle
    ? ` subtitle="${meta.subtitle}"`
    : '';
  const chromeLine = `chrome={<PageChrome title="${meta.title}"${subtitle} />}\n      `;

  return src.replace(/<DashboardLayout\s*\n?/, `<DashboardLayout\n      ${chromeLine}`);
}

let patched = 0;
for (const file of listPageFiles(pagesRoot)) {
  const base = path.basename(file, '.tsx');
  const meta = PAGE_META[base];
  if (!meta) {
    console.warn(`[skip] no meta for ${path.relative(root, file)}`);
    continue;
  }

  let src = readFileSync(file, 'utf8');
  if (!src.includes('DashboardLayout')) {
    console.warn(`[skip] no DashboardLayout in ${path.relative(root, file)}`);
    continue;
  }
  if (src.includes('chrome={<PageChrome')) continue;

  src = ensurePageChromeImport(src);
  src = injectChromeProp(src, meta);
  writeFileSync(file, src, 'utf8');
  patched += 1;
  console.log(`[ok] ${path.relative(root, file)}`);
}

console.log(`\nPatched ${patched} page(s).`);
