






import { create } from 'zustand';
import { apiCommand } from '@/api/commands';
import { useDashboardStore } from './dashboardStore';
import { useProjectStore } from './projectStore';

export interface ProjectHandoff {
  id: number;
  project_id: number;
  project_name: string;
  from_stage_id: number | null;
  from_stage_name: string | null;
  to_stage_id: number;
  to_stage_name: string;
  from_user_id: number;
  from_user_name: string | null;
  to_role: string;
  to_user_id: number | null;
  to_user_name: string | null;
  status: string;
  is_urgent: boolean;
  handoff_notes: string | null;
  ai_summary: string | null;
  rejected_reason: string | null;
  sla_due_at: string;
  escalated_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  forced_reason: string | null;
  created_at: string;
}

interface HandoffState {
  pending: ProjectHandoff[];
  loading: boolean;
  loaded: boolean;
  pollSubscribers: number;
  pollHandle: ReturnType<typeof setInterval> | null;
  fetchPending: (force?: boolean) => Promise<ProjectHandoff[]>;
  fetchForProject: (projectId: number) => Promise<ProjectHandoff[]>;
  accept: (id: number) => Promise<void>;
  reject: (id: number, reason: string) => Promise<void>;
  force: (id: number, reason: string) => Promise<void>;
  setUrgent: (id: number, urgent: boolean) => Promise<void>;
  invalidate: () => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
}

function syncOthers(): void {
  void useDashboardStore.getState().invalidate();
  void useProjectStore.getState().refreshAll();
}

export const useHandoffStore = create<HandoffState>((set, get) => ({
  pending: [],
  loading: false,
  loaded: false,
  pollSubscribers: 0,
  pollHandle: null,

  fetchPending: async (force = false) => {
    if (!force && get().loaded) return get().pending;
    set({ loading: true });
    try {
      const data = await apiCommand<ProjectHandoff[]>('get_my_handoffs');
      const pending = Array.isArray(data) ? data : [];
      set({ pending, loaded: true, loading: false });
      return pending;
    } catch (err) {
      console.error('[handoffStore] fetchPending failed:', err);
      set({ loading: false });
      return get().pending;
    }
  },

  fetchForProject: async (projectId) => {
    try {
      const data = await apiCommand<ProjectHandoff[]>('get_project_handoffs', { project_id: projectId });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('[handoffStore] fetchForProject failed:', err);
      return [];
    }
  },

  accept: async (id) => {
    await apiCommand('accept_handoff', { id });
    await get().fetchPending(true);
    syncOthers();
  },

  reject: async (id, reason) => {
    await apiCommand('reject_handoff', { id, reason });
    await get().fetchPending(true);
    syncOthers();
  },

  force: async (id, reason) => {
    await apiCommand('force_handoff', { id, reason });
    await get().fetchPending(true);
    syncOthers();
  },

  setUrgent: async (id, urgent) => {
    await apiCommand('set_handoff_urgent', { id, urgent });
    await get().fetchPending(true);
  },

  invalidate: async () => {
    await get().fetchPending(true);
  },

  
  startPolling: (intervalMs = 5000) => {
    set(s => ({ pollSubscribers: s.pollSubscribers + 1 }));
    const tick = () => { void get().fetchPending(true); };
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

export const useMyHandoffs = () => useHandoffStore(s => s.pending);
