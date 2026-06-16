import { create } from 'zustand';
import { apiCommand } from '@/api/commands';

export interface RestaurantTable {
  id: number;
  code: string;
  label: string;
  zone: string;
  seats: number;
  status: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const TABLE_STATUSES = ['libera', 'ocupata', 'rezervata'] as const;
export const TABLE_ZONES = ['Salon', 'Terasă', 'Bar', 'Etaj', 'VIP'] as const;

interface TableState {
  items: RestaurantTable[];
  loading: boolean;
  loaded: boolean;

  fetchItems: (force?: boolean) => Promise<RestaurantTable[]>;
  createItem: (payload: Record<string, unknown>) => Promise<void>;
  updateItem: (id: number, patch: Record<string, unknown>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  setStatus: (id: number, status: string) => Promise<void>;
}

export const useTableStore = create<TableState>((set, get) => ({
  items: [],
  loading: false,
  loaded: false,

  fetchItems: async (force = false) => {
    if (!force && get().loaded) return get().items;
    set({ loading: true });
    try {
      const data = await apiCommand<RestaurantTable[]>('get_restaurant_tables');
      const items = Array.isArray(data) ? data : [];
      set({ items, loaded: true, loading: false });
      return items;
    } catch (err) {
      console.error('[tableStore] fetchItems failed:', err);
      set({ loading: false });
      return get().items;
    }
  },

  createItem: async (payload) => {
    await apiCommand('create_restaurant_table', payload);
    await get().fetchItems(true);
  },

  updateItem: async (id, patch) => {
    await apiCommand('update_restaurant_table', { id, ...patch });
    await get().fetchItems(true);
  },

  deleteItem: async (id) => {
    await apiCommand('delete_restaurant_table', { id });
    set({ items: get().items.filter(t => t.id !== id) });
  },

  setStatus: async (id, status) => {
    await apiCommand('set_restaurant_table_status', { id, status });
    set({ items: get().items.map(t => (t.id === id ? { ...t, status } : t)) });
  },
}));
