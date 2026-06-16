







import { create } from 'zustand';
import { apiCommand } from '@/api/commands';
import { useDashboardStore } from './dashboardStore';

function syncDashboard(): void {
  void useDashboardStore.getState().invalidate();
}

export interface Alert {
  id: number;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: number;
  acknowledged: boolean;
  acknowledged_by: number | null;
  created_at: string;
  project_id?: number;
}

interface AlertState {
  alerts: Alert[];
  loading: boolean;
  loaded: boolean;
  error: string | null;

  fetchAlerts: (force?: boolean) => Promise<Alert[]>;
  generateAndFetch: () => Promise<Alert[]>;

  createAlert: (payload: Record<string, unknown>) => Promise<void>;
  updateAlert: (id: number, patch: Record<string, unknown>) => Promise<void>;
  acknowledgeAlert: (alertId: number, userId: number) => Promise<void>;

  invalidate: () => Promise<void>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  loading: false,
  loaded: false,
  error: null,

  fetchAlerts: async (force = false) => {
    if (!force && get().loaded) return get().alerts;
    set({ loading: true, error: null });
    try {
      const data = await apiCommand<Alert[]>('get_alerts');
      const alerts = Array.isArray(data) ? data : [];
      set({ alerts, loaded: true, loading: false });
      return alerts;
    } catch (err) {
      console.error('[alertStore] fetchAlerts failed:', err);
      set({ loading: false, error: err instanceof Error ? err.message : 'Fetch failed' });
      return get().alerts;
    }
  },

  generateAndFetch: async () => {
    set({ loading: true, error: null });
    try {
      await apiCommand('generate_system_alerts').catch(() => undefined);
      const data = await apiCommand<Alert[]>('get_alerts');
      const alerts = Array.isArray(data) ? data : [];
      set({ alerts, loaded: true, loading: false });
      return alerts;
    } catch (err) {
      console.error('[alertStore] generateAndFetch failed:', err);
      set({ loading: false, error: err instanceof Error ? err.message : 'Fetch failed' });
      return get().alerts;
    }
  },

  createAlert: async (payload) => {
    await apiCommand('create_alert', payload);
    await get().fetchAlerts(true);
  },

  updateAlert: async (id, patch) => {
    await apiCommand('update_alert', { id, ...patch });
    await get().fetchAlerts(true);
  },

  acknowledgeAlert: async (alertId, userId) => {
    await apiCommand('acknowledge_alert', { alert_id: alertId, user_id: userId });
    set({
      alerts: get().alerts.map(a =>
        a.id === alertId ? { ...a, acknowledged: true, acknowledged_by: userId } : a,
      ),
    });
    syncDashboard();
  },

  invalidate: async () => {
    await get().fetchAlerts(true);
  },
}));

export const useAlerts = () => useAlertStore(s => s.alerts);
export const useUnacknowledgedAlertCount = () =>
  useAlertStore(s => s.alerts.filter(a => !a.acknowledged).length);
