#!/usr/bin/env node
/**
 * Adds PageChrome to every redesign *Page.tsx that lacks it.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = path.join(root, 'src/redesign/pages');

/** Relative path from pages dir → { title, subtitle? } */
const TITLES = {
  'DashboardPage.tsx': { title: 'Tablou de bord' },
  'admin/LicensesPage.tsx': { title: 'Licențe' },
  'ai/AIAssistantPage.tsx': { title: 'Asistent AI' },
  'alerts/AlertsPage.tsx': { title: 'Alerte', subtitle: 'Notificări și anomalii sistem' },
  'auth/UserSessionsPage.tsx': { title: 'Sesiuni active' },
  'auth/UsersPage.tsx': { title: 'Utilizatori' },
  'calendar/CalendarPage.tsx': { title: 'Calendar' },
  'chat/ChatPage.tsx': { title: 'Mesaje' },
  'checklist/FisaProiectantPage.tsx': { title: 'Fișa proiectant' },
  'clients/ClientsPage.tsx': { title: 'Clienți' },
  'contract/ContractPage.tsx': { title: 'Contracte' },
  'deplasari/DeplasariPage.tsx': { title: 'Deplasări' },
  'documents/DocumentsPage.tsx': { title: 'Documente' },
  'email/EmailPage.tsx': { title: 'Email' },
  'FinancePage.tsx': { title: 'Financiar', subtitle: 'Facturi, cheltuieli și indicatori' },
  'FisaTemplatesPage.tsx': { title: 'Template-uri fișe' },
  'InventoryPage.tsx': { title: 'Inventar' },
  'KanbanPage.tsx': { title: 'Producție' },
  'libraries/LibrariesPage.tsx': { title: 'Biblioteci' },
  'maintenance/MaintenancePage.tsx': { title: 'Mentenanță' },
  'ManagerControlPage.tsx': { title: 'Birou de control', subtitle: 'Predări, anomalii și activitate' },
  'PartsTreePage.tsx': { title: 'Arbore piese' },
  'PiecesOrderingPage.tsx': { title: 'Comandă piese' },
  'procurement/ProcurementWorkspacePage.tsx': { title: 'Aprovizionare' },
  'ProjectBriefingsPage.tsx': { title: 'Briefing-uri proiect' },
  'ProjectsPage.tsx': { title: 'Proiecte', subtitle: 'Pipeline, detalii și livrabile' },
  'remote/RemoteSupportPage.tsx': { title: 'Asistență la distanță' },
  'reports/ReportsPage.tsx': { title: 'Rapoarte' },
  'sales/LeadDetailPage.tsx': { title: 'Detaliu lead' },
  'sales/QuotationsPage.tsx': { title: 'Oferte' },
  'sales/SalesHubPage.tsx': { title: 'Vânzări' },
  'service/ServiceTicketsPage.tsx': { title: 'Tichete service' },
  'settings/SettingsPage.tsx': { title: 'Setări' },
  'stations/StationDetailPage.tsx': { title: 'Stație' },
  'tasks/PersonalTasksPage.tsx': { title: 'Task-urile mele' },
  'tools/DownloadAppPage.tsx': { title: 'Descarcă aplicația' },
  'tools/PrintPage.tsx': { title: 'Print' },
  'tutorial/TutorialPage.tsx': { title: 'Tutorial' },
  'warehouse/WarehousePage.tsx': { title: 'Depozit' },
};

function listPageFiles(dir, base = '', acc = []) {
  for (const name of readdirSync(dir)) {
    const rel = base ? `${base}/${name}` : name;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) listPageFiles(full, rel, acc);
    else if (name.endsWith('Page.tsx')) acc.push({ full, rel });
  }
  return acc;
}

function chromeJsx({ title, subtitle }) {
  if (subtitle) {
    return `chrome={<PageChrome title="${title}" subtitle="${subtitle}" />}`;
  }
  return `chrome={<PageChrome title="${title}" />}`;
}

function patchImport(text) {
  if (text.includes('PageChrome')) return text;
  const m = text.match(/import\s*\{([^}]+)\}\s*from\s*'@\/app-ui';/);
  if (m) {
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.includes('PageChrome')) {
      names.unshift('PageChrome');
      const sorted = [...new Set(names)];
      return text.replace(m[0], `import { ${sorted.join(', ')} } from '@/app-ui';`);
    }
    return text;
  }
  const layoutImport = text.match(/import\s*\{[^}]+\}\s*from\s*'@\/redesign\/layout';/);
  if (layoutImport) {
    return text.replace(
      layoutImport[0],
      `${layoutImport[0]}\nimport { PageChrome } from '@/app-ui';`,
    );
  }
  return `import { PageChrome } from '@/app-ui';\n${text}`;
}

function patchFile(rel, full) {
  let text = readFileSync(full, 'utf8');
  if (text.includes('PageChrome')) {
    console.log(`skip (has PageChrome): ${rel}`);
    return false;
  }

  const meta = TITLES[rel];
  if (!meta) {
    console.warn(`no title map for ${rel}`);
    return false;
  }

  text = patchImport(text);
  const chromeLine = chromeJsx(meta);

  if (rel === 'alerts/AlertsPage.tsx') {
    text = text.replace(
      /const layoutProps = \{\s*/,
      `const layoutProps = {\n    chrome: <PageChrome title="${meta.title}"${meta.subtitle ? ` subtitle="${meta.subtitle}"` : ''} />,\n    `,
    );
  } else {
    text = text.replace(
      /<DashboardLayout(\s*\n)?/g,
      `<DashboardLayout\n        ${chromeLine}\n`,
    );
  }

  writeFileSync(full, text, 'utf8');
  console.log(`patched: ${rel}`);
  return true;
}

const files = listPageFiles(pagesDir);
let count = 0;
for (const { full, rel } of files) {
  if (patchFile(rel, full)) count += 1;
}
console.log(`\nDone — patched ${count} files`);
