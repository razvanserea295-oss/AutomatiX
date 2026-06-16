import { create } from 'zustand';
import { apiCommand } from '@/api/commands';

export interface RecipeItem {
  id: number;
  menu_item_id: number;
  material_id: number | null;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  line_cost: number;
}

export interface RecipeOverviewRow {
  menu_item_id: number;
  code: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  ingredient_count: number;
  cost: number;
  margin: number;
  food_cost_pct: number;
}

interface RecipeState {
  overview: RecipeOverviewRow[];
  items: Record<number, RecipeItem[]>;
  loading: boolean;
  loaded: boolean;
  fetchOverview: (force?: boolean) => Promise<RecipeOverviewRow[]>;
  fetchRecipe: (menuItemId: number) => Promise<RecipeItem[]>;
  addItem: (payload: Record<string, unknown>) => Promise<void>;
  updateItem: (payload: Record<string, unknown>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  overview: [],
  items: {},
  loading: false,
  loaded: false,

  fetchOverview: async (force = false) => {
    if (!force && get().loaded) return get().overview;
    set({ loading: true });
    try {
      const data = await apiCommand<RecipeOverviewRow[]>('get_recipes_overview');
      const overview = Array.isArray(data) ? data : [];
      set({ overview, loaded: true, loading: false });
      return overview;
    } catch (err) {
      console.error('[recipeStore] fetchOverview failed:', err);
      set({ loading: false });
      return get().overview;
    }
  },

  fetchRecipe: async (menuItemId) => {
    const data = await apiCommand<RecipeItem[]>('get_recipe', { menu_item_id: menuItemId });
    const items = Array.isArray(data) ? data : [];
    set({ items: { ...get().items, [menuItemId]: items } });
    return items;
  },

  addItem: async (payload) => {
    const items = await apiCommand<RecipeItem[]>('add_recipe_item', payload);
    const menuItemId = Number(payload.menu_item_id);
    set({ items: { ...get().items, [menuItemId]: Array.isArray(items) ? items : [] } });
    await get().fetchOverview(true);
  },

  updateItem: async (payload) => {
    const items = await apiCommand<RecipeItem[]>('update_recipe_item', payload);
    if (Array.isArray(items) && items.length > 0) {
      set({ items: { ...get().items, [items[0].menu_item_id]: items } });
    }
    await get().fetchOverview(true);
  },

  deleteItem: async (id) => {
    const res = await apiCommand<{ menu_item_id: number; items: RecipeItem[] }>('delete_recipe_item', { id });
    if (res && typeof res.menu_item_id === 'number') {
      set({ items: { ...get().items, [res.menu_item_id]: res.items || [] } });
    }
    await get().fetchOverview(true);
  },
}));
