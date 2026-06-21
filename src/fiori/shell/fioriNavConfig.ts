import { WORKSPACE_SUBPAGES } from '@/config/workspaceNav';
import { PAGE_IDS } from '@/config/constants';
import { canAccessPage, type AppPage } from '@/lib/access';
import type { User } from '@/core/types';
import type { FioriNavItem } from '@/redesign/shell/FioriShell';

const WORKSPACE_ORDER: string[] = [
  PAGE_IDS.SALES_WORKSPACE,
  PAGE_IDS.PROJECTS_CONTRACTS_WORKSPACE,
  PAGE_IDS.ENGINEERING_WORKSPACE,
  PAGE_IDS.PRODUCTION_WORKSPACE,
  PAGE_IDS.PROCUREMENT_WORKSPACE,
  PAGE_IDS.FINANCE_WORKSPACE,
  PAGE_IDS.INSTRUMENTE_WORKSPACE,
  PAGE_IDS.PERSONAL_WORKSPACE,
  PAGE_IDS.SISTEM_WORKSPACE,
];

const WORKSPACE_LABELS: Record<string, string> = {
  [PAGE_IDS.SALES_WORKSPACE]: 'Vânzări',
  [PAGE_IDS.PROJECTS_CONTRACTS_WORKSPACE]: 'Proiecte & Contracte',
  [PAGE_IDS.ENGINEERING_WORKSPACE]: 'Inginerie',
  [PAGE_IDS.PRODUCTION_WORKSPACE]: 'Producție',
  [PAGE_IDS.PROCUREMENT_WORKSPACE]: 'Aprovizionare',
  [PAGE_IDS.FINANCE_WORKSPACE]: 'Financiar',
  [PAGE_IDS.INSTRUMENTE_WORKSPACE]: 'Instrumente',
  [PAGE_IDS.PERSONAL_WORKSPACE]: 'Personal',
  [PAGE_IDS.SISTEM_WORKSPACE]: 'Sistem',
};

function canAccess(pageId: string, user: User | null): boolean {
  const role = user?.role_name?.toLowerCase() ?? '';
  try {
    return canAccessPage(role, pageId as AppPage, user?.custom_pages ?? null);
  } catch {
    return true;
  }
}

/** Side-navigation tree for the Fiori shell, filtered to what the user may see. */
export function buildFioriNav(user: User | null): FioriNavItem[] {
  const items: FioriNavItem[] = [{ id: 'dashboard', text: 'Dashboard' }];

  for (const wsId of WORKSPACE_ORDER) {
    const subs = WORKSPACE_SUBPAGES[wsId] ?? [];
    const accessible = subs.filter(s => canAccess(s.id, user));
    if (accessible.length === 0) continue;
    items.push({
      id: wsId,
      text: WORKSPACE_LABELS[wsId] ?? wsId,
      subItems: accessible.map(s => ({ id: s.id, text: s.label })),
    });
  }

  return items;
}

/** Which workspace + page is active for a given hash route ("/clients" → …). */
export function selectedIdsForRoute(route: string): { wsId: string; pageId: string } {
  const page = (route || '/').replace(/^\//, '') || 'dashboard';
  if (page === 'dashboard') return { wsId: 'dashboard', pageId: 'dashboard' };
  for (const wsId of WORKSPACE_ORDER) {
    const subs = WORKSPACE_SUBPAGES[wsId] ?? [];
    if (subs.some(s => s.id === page)) return { wsId, pageId: page };
  }
  return { wsId: '', pageId: page };
}

/** Resolve a clicked nav id (page OR workspace header) to a hash route. */
export function routeForNavId(id: string, user: User | null): string {
  if (id === 'dashboard') return '/';
  const subs = WORKSPACE_SUBPAGES[id];
  if (subs) {
    const first = subs.find(s => canAccess(s.id, user)) ?? subs[0];
    return `/${first.id}`;
  }
  return `/${id}`;
}

/** Human title for a page id (workspace label · subpage label). */
export function titleForPage(pageId: string): string {
  if (pageId === 'dashboard' || pageId === '') return 'Dashboard';
  for (const wsId of WORKSPACE_ORDER) {
    const subs = WORKSPACE_SUBPAGES[wsId] ?? [];
    const hit = subs.find(s => s.id === pageId);
    if (hit) return hit.label;
  }
  return pageId;
}

/** Flat list of every accessible page id (for route generation). */
export function allPageIds(user: User | null): string[] {
  const ids = ['dashboard'];
  for (const wsId of WORKSPACE_ORDER) {
    for (const s of WORKSPACE_SUBPAGES[wsId] ?? []) {
      if (canAccess(s.id, user)) ids.push(s.id);
    }
  }
  return ids;
}
