













import { create } from 'zustand';
import { apiCommand } from '@/api/commands';

export interface DashboardData {
  total_projects?: number;
  active_projects?: number;
  in_production?: number;
  total_materials?: number;
  low_stock_count?: number;
  pending_alerts?: number;
  total_documents?: number;
  revenue?: number;
  costs?: number;
  profit?: number;
  [k: string]: unknown;
}

export interface FinanceOverview {
  total_estimated_revenue?: number;
  total_actual_revenue?: number;
  total_estimated_cost?: number;
  total_actual_cost?: number;
  total_estimated_profit?: number;
  total_actual_profit?: number;
  [k: string]: unknown;
}

export interface SalesStats {
  total_leads?: number;
  fara_contact?: number;
  decizie_client?: number;
  decizie_noastra?: number;
  in_negocieri?: number;
  converted?: number;
  pipeline_value?: number;
  stale_leads?: number;
}

export interface DashboardRange {
  from: string | null;
  to: string | null;
}

interface DashboardState {
  dashboardData: Record<string, unknown>;
  financeOverview: Record<string, unknown> | null;
  salesStats: SalesStats | null;
  range: DashboardRange;
  loading: boolean;
  loaded: boolean;
  pollSubscribers: number;
  pollHandle: ReturnType<typeof setInterval> | null;

  fetchDashboardData: () => Promise<Record<string, unknown>>;
  fetchFinanceOverview: () => Promise<Record<string, unknown> | null>;
  fetchSalesStats: () => Promise<SalesStats | null>;
  refreshAll: () => Promise<void>;
  invalidate: () => Promise<void>;
  setRange: (range: DashboardRange) => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboardData: {},
  financeOverview: null,
  salesStats: null,
  range: { from: null, to: null },
  loading: false,
  loaded: false,
  pollSubscribers: 0,
  pollHandle: null,

  fetchDashboardData: async () => {
    try {
      const { range } = get();
      const params = (range.from && range.to) ? { from: range.from, to: range.to } : undefined;
      const raw = await apiCommand<Record<string, unknown>>('get_dashboard_data', params);
      set({ dashboardData: raw, loaded: true });
      return raw;
    } catch (err) {
      console.error('[dashboardStore] fetchDashboardData failed:', err);
      return get().dashboardData;
    }
  },

  fetchFinanceOverview: async () => {
    try {
      const fin = await apiCommand<Record<string, unknown>>('get_finance_overview');
      set({ financeOverview: fin });
      return fin;
    } catch {
      
      return null;
    }
  },

  fetchSalesStats: async () => {
    try {
      const stats = await apiCommand<SalesStats>('get_sales_stats');
      set({ salesStats: stats });
      return stats;
    } catch {
      return null;
    }
  },

  refreshAll: async () => {
    set({ loading: true });
    await Promise.all([
      get().fetchDashboardData(),
      get().fetchFinanceOverview(),
      get().fetchSalesStats(),
    ]);
    set({ loading: false });
  },

  invalidate: async () => {
    
    
    void get().refreshAll();
  },

  setRange: async (range) => {
    set({ range });
    await get().fetchDashboardData();
  },

  





  startPolling: (intervalMs = 30000) => {
    set(s => ({ pollSubscribers: s.pollSubscribers + 1 }));
    const tick = () => { void get().refreshAll(); };
    if (get().pollHandle == null) {
      
      
      tick();
      const handle = setInterval(() => {
        
        
        if (typeof document !== 'undefined' && document.hidden) return;
        tick();
      }, intervalMs);
      set({ pollHandle: handle });
    }
    
    return () => {
      const next = get().pollSubscribers - 1;
      if (next <= 0) {
        const h = get().pollHandle;
        if (h) clearInterval(h);
        set({ pollSubscribers: 0, pollHandle: null });
      } else {
        set({ pollSubscribers: next });
      }
    };
  },
}));
