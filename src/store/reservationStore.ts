import { create } from 'zustand';
import { apiCommand } from '@/api/commands';

export interface Reservation {
  id: number;
  code: string;
  customer_name: string;
  phone: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_label: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const RESERVATION_STATUSES = ['noua', 'confirmata', 'asezata', 'finalizata', 'anulata'] as const;

interface ReservationState {
  items: Reservation[];
  loading: boolean;
  loaded: boolean;

  fetchItems: (force?: boolean) => Promise<Reservation[]>;
  createItem: (payload: Record<string, unknown>) => Promise<void>;
  updateItem: (id: number, patch: Record<string, unknown>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  setStatus: (id: number, status: string) => Promise<void>;
}

export const useReservationStore = create<ReservationState>((set, get) => ({
  items: [],
  loading: false,
  loaded: false,

  fetchItems: async (force = false) => {
    if (!force && get().loaded) return get().items;
    set({ loading: true });
    try {
      const data = await apiCommand<Reservation[]>('get_reservations');
      const items = Array.isArray(data) ? data : [];
      set({ items, loaded: true, loading: false });
      return items;
    } catch (err) {
      console.error('[reservationStore] fetchItems failed:', err);
      set({ loading: false });
      return get().items;
    }
  },

  createItem: async (payload) => {
    await apiCommand('create_reservation', payload);
    await get().fetchItems(true);
  },

  updateItem: async (id, patch) => {
    await apiCommand('update_reservation', { id, ...patch });
    await get().fetchItems(true);
  },

  deleteItem: async (id) => {
    await apiCommand('delete_reservation', { id });
    set({ items: get().items.filter(r => r.id !== id) });
  },

  setStatus: async (id, status) => {
    await apiCommand('set_reservation_status', { id, status });
    set({ items: get().items.map(r => (r.id === id ? { ...r, status } : r)) });
  },
}));
