import type { AppPage } from '@/lib/access';

export interface DashboardSummary {
  total_projects: number;
  active_projects: number;
  in_production: number;
  total_materials: number;
  low_stock_count: number;
  pending_alerts: number;
  total_documents: number;
  revenue: number;
  costs: number;
  profit: number;
}

export type NavigateFn = (page: string, opts?: Record<string, unknown>) => void;

export type CanAccessFn = (page: AppPage) => boolean;

/** Palette action pages that are not AppPage ids. */
export const QUICK_ACTION_PAGE_MAP: Record<string, AppPage> = {
  quotations: 'sales-hub',
  clients: 'clients',
  projects: 'projects',
  finance: 'finance',
  materials: 'materials',
};
