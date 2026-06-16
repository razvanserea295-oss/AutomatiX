import { create } from 'zustand';
import { apiCommand } from '@/api/commands';

export interface MenuItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  available: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const MENU_CATEGORIES = ['Burgeri', 'Garnituri', 'Băuturi', 'Deserturi'] as const;

interface MenuState {
  items: MenuItem[];
  loading: boolean;
  loaded: boolean;

  fetchItems: (force?: boolean) => Promise<MenuItem[]>;
  createItem: (payload: Record<string, unknown>) => Promise<void>;
  updateItem: (id: number, patch: Record<string, unknown>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  toggleAvailability: (id: number, available: boolean) => Promise<void>;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  items: [],
  loading: false,
  loaded: false,

  fetchItems: async (force = false) => {
    if (!force && get().loaded) return get().items;
    set({ loading: true });
    try {
      const data = await apiCommand<MenuItem[]>('get_menu_items');
      const items = Array.isArray(data) ? data : [];
      set({ items, loaded: true, loading: false });
      return items;
    } catch (err) {
      console.error('[menuStore] fetchItems failed:', err);
      set({ loading: false });
      return get().items;
    }
  },

  createItem: async (payload) => {
    await apiCommand('create_menu_item', payload);
    await get().fetchItems(true);
  },

  updateItem: async (id, patch) => {
    await apiCommand('update_menu_item', { id, ...patch });
    await get().fetchItems(true);
  },

  deleteItem: async (id) => {
    await apiCommand('delete_menu_item', { id });
    set({ items: get().items.filter(m => m.id !== id) });
  },

  toggleAvailability: async (id, available) => {
    await apiCommand('set_menu_item_availability', { id, available });
    set({
      items: get().items.map(m => (m.id === id ? { ...m, available: available ? 1 : 0 } : m)),
    });
  },
}));

export const useMenuItems = () => useMenuStore(s => s.items);
