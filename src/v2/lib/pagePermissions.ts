/** Page IDs used by `update_user_pages` / `custom_pages` on users. */
export const PERMISSION_PAGES: { id: string; label: string; group: string }[] = [
  { id: 'tasks', label: 'Task-uri', group: 'Personal' },
  { id: 'calendar', label: 'Calendar', group: 'Personal' },
  { id: 'deplasari', label: 'Deplasări', group: 'Personal' },
  { id: 'sales-hub', label: 'Pipeline', group: 'Vânzări' },
  { id: 'quotations', label: 'Oferte', group: 'Vânzări' },
  { id: 'clients', label: 'Clienți', group: 'Vânzări' },
  { id: 'projects', label: 'Proiecte', group: 'Proiecte' },
  { id: 'contracts', label: 'Contracte', group: 'Proiecte' },
  { id: 'fisa-proiectant', label: 'Fișă proiectant', group: 'Inginerie' },
  { id: 'parts-tree', label: 'Arbore piese', group: 'Inginerie' },
  { id: 'libraries', label: 'Biblioteci', group: 'Inginerie' },
  { id: 'production', label: 'Kanban', group: 'Producție' },
  { id: 'maintenance', label: 'Service', group: 'Producție' },
  { id: 'warehouse', label: 'Depozit', group: 'Achiziții' },
  { id: 'materials', label: 'Inventar', group: 'Achiziții' },
  { id: 'suppliers', label: 'Furnizori', group: 'Achiziții' },
  { id: 'purchase-orders', label: 'Achiziții', group: 'Achiziții' },
  { id: 'finance', label: 'Financiar', group: 'Financiar' },
  { id: 'documents', label: 'Documente', group: 'Financiar' },
  { id: 'reports', label: 'Rapoarte', group: 'Financiar' },
  { id: 'email', label: 'Email', group: 'Comunicare' },
  { id: 'chat', label: 'Mesaje', group: 'Comunicare' },
  { id: 'alerts', label: 'Alerte', group: 'Comunicare' },
  { id: 'manager-control', label: 'Birou control', group: 'Sistem' },
  { id: 'users', label: 'Utilizatori', group: 'Sistem' },
  { id: 'settings', label: 'Setări', group: 'Sistem' },
];

export const PAGE_ACCESS_LEVELS = [
  { value: 'inherit', label: 'Moștenit' },
  { value: 'full', label: 'Complet' },
  { value: 'viewer', label: 'Vizualizare' },
  { value: 'deny', label: 'Blocat' },
] as const;

export function parseCustomPages(json: string | null): Record<string, string> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as unknown;
    if (Array.isArray(parsed)) {
      const map: Record<string, string> = {};
      for (const p of parsed) map[String(p)] = 'full';
      return map;
    }
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
  } catch { /* ignore */ }
  return {};
}
