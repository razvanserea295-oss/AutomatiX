








import { create } from 'zustand';
import { apiCommand } from '@/api/commands';

export interface MaintenanceStatus {
  enabled: boolean;
  message: string | null;
  eta: string | null;
  updated_at: string | null;
}

interface MaintenanceState {
  mode: boolean;
  message: string | null;
  eta: string | null;
  updatedAt: string | null;
  loaded: boolean;
  


  unavailable: boolean;
  load: () => Promise<void>;
  setFromStatus: (s: MaintenanceStatus) => void;
  
  startPolling: (ms?: number) => () => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  mode: false,
  message: null,
  eta: null,
  updatedAt: null,
  loaded: false,
  unavailable: false,

  load: async () => {
    try {
      const s = await apiCommand<MaintenanceStatus>('get_maintenance_mode');
      get().setFromStatus(s);
    } catch (err) {
      
      
      
      const msg = err instanceof Error ? err.message : String(err);
      const missing = /no handler registered/i.test(msg) || (err as { status?: number })?.status === 404;
      set({ loaded: true, mode: false, ...(missing ? { unavailable: true } : {}) });
    }
  },

  setFromStatus: (s) => set({
    mode: !!s?.enabled,
    message: s?.message ?? null,
    eta: s?.eta ?? null,
    updatedAt: s?.updated_at ?? null,
    loaded: true,
  }),

  startPolling: (ms = 20000) => {
    let iv: ReturnType<typeof setInterval> | null = null;
    const stop = () => { if (iv) { clearInterval(iv); iv = null; } };
    const tick = async () => {
      await get().load();
      
      if (get().unavailable) stop();
    };
    const start = () => { if (iv || get().unavailable) return; void tick(); iv = setInterval(() => void tick(), ms); };
    if (typeof document === 'undefined' || !document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  },
}));
