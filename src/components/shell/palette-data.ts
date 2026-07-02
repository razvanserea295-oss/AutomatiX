





import type { ComponentType } from 'react';
import { LayoutDashboard, Gauge } from '@/icons';
import { PAGE_IDS, PAGE_TITLES } from '@/config/constants';
import { WORKSPACE_SUBPAGES } from '@/config/workspaceNav';
import {
  FilePlus2, UserPlus, FolderPlus, Receipt, PackagePlus, Search, Keyboard,
} from '@/icons';

export type PaletteIcon = ComponentType<{ className?: string }>;

export interface PalettePage {
  id: string;
  title: string;
  
  breadcrumb: string;
  icon: PaletteIcon;
  
  keywords: string;
}

export interface PaletteAction {
  id: string;
  title: string;
  subtitle: string;
  icon: PaletteIcon;
  keywords: string;
  
  page?: string;
  
  command?: 'shortcuts';
}


export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}


export const PALETTE_PAGES: PalettePage[] = (() => {
  const pages: PalettePage[] = [
    { id: PAGE_IDS.DASHBOARD, title: 'Dashboard', breadcrumb: 'Acasă', icon: LayoutDashboard, keywords: 'acasa home panou principal' },
    { id: PAGE_IDS.MANAGER_CONTROL, title: 'Birou control', breadcrumb: 'Management', icon: Gauge, keywords: 'manager control kpi' },
  ];
  for (const [workspaceId, subs] of Object.entries(WORKSPACE_SUBPAGES)) {
    const wsTitle = PAGE_TITLES[workspaceId as keyof typeof PAGE_TITLES] ?? workspaceId;
    for (const sub of subs) {
      
      if (pages.some((p) => p.id === sub.id)) continue;
      pages.push({
        id: sub.id,
        title: sub.label,
        breadcrumb: wsTitle,
        icon: sub.icon,
        keywords: normalizeText(`${sub.label} ${wsTitle}`),
      });
    }
  }
  return pages;
})();


export const PALETTE_ACTIONS: PaletteAction[] = [
  { id: 'new-quotation', title: 'Creează ofertă', subtitle: 'Vânzări · Oferte', icon: FilePlus2, page: 'quotations', keywords: normalizeText('creeaza adauga oferta noua quotation vanzari') },
  { id: 'new-client', title: 'Adaugă client', subtitle: 'Vânzări · Clienți', icon: UserPlus, page: 'clients', keywords: normalizeText('adauga client partener nou contact') },
  { id: 'new-project', title: 'Creează proiect', subtitle: 'Proiecte', icon: FolderPlus, page: 'projects', keywords: normalizeText('creeaza adauga proiect nou project') },
  { id: 'new-invoice', title: 'Înregistrează factură', subtitle: 'Financiar', icon: Receipt, page: 'finance', keywords: normalizeText('factura noua invoice financiar inregistreaza') },
  { id: 'new-material', title: 'Adaugă material', subtitle: 'Aprovizionare · Inventar', icon: PackagePlus, page: 'materials', keywords: normalizeText('adauga material articol inventar stoc') },
  { id: 'find-client', title: 'Caută client', subtitle: 'Vânzări · Clienți', icon: Search, page: 'clients', keywords: normalizeText('cauta gaseste client partener') },
  { id: 'show-shortcuts', title: 'Scurtături tastatură', subtitle: 'Ajutor · Shift + ?', icon: Keyboard, command: 'shortcuts', keywords: normalizeText('scurtaturi shortcuts taste ajutor help') },
];
