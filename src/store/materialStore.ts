







import { create } from 'zustand';
import { apiCommand } from '@/api/commands';
import { useDashboardStore } from './dashboardStore';

function syncDashboard(): void {
  void useDashboardStore.getState().invalidate();
}





export interface Material {
  id: number;
  name: string;
  code: string;
  unit: string;
  category: string;
  quantity: number;
  stock: number;
  minimum_threshold: number;
  min_stock: number;
  unit_cost: number;
  currency: string;
  supplier_name: string;
  location: string;
  status: string;
  created_at: string;
}

function normalizeMaterial(raw: Partial<Material> & { id: number; name: string; code: string }): Material {
  const stock = (raw.stock ?? raw.quantity ?? 0) as number;
  const minStock = (raw.min_stock ?? raw.minimum_threshold ?? 0) as number;
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    unit: raw.unit ?? '',
    category: raw.category ?? '',
    quantity: stock,
    stock,
    minimum_threshold: minStock,
    min_stock: minStock,
    unit_cost: raw.unit_cost ?? 0,
    currency: raw.currency ?? 'RON',
    supplier_name: raw.supplier_name ?? '',
    location: raw.location ?? '',
    status: raw.status ?? '',
    created_at: raw.created_at ?? '',
  };
}

export interface WarehouseLocation {
  id: number;
  code: string;
  name: string;
  location_type: string;
}

interface MaterialState {
  materials: Material[];
  locations: WarehouseLocation[];

  loading: boolean;
  loaded: boolean;
  locationsLoaded: boolean;

  fetchMaterials: (force?: boolean) => Promise<Material[]>;
  fetchLocations: (force?: boolean) => Promise<WarehouseLocation[]>;

  createMaterial: (payload: Record<string, unknown>) => Promise<void>;
  updateMaterial: (id: number, patch: Record<string, unknown>) => Promise<void>;
  deleteMaterial: (id: number) => Promise<void>;

  invalidate: () => Promise<void>;
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
  materials: [],
  locations: [],
  loading: false,
  loaded: false,
  locationsLoaded: false,

  fetchMaterials: async (force = false) => {
    if (!force && get().loaded) return get().materials;
    set({ loading: true });
    try {
      const data = await apiCommand<Material[]>('get_materials');
      const raw = Array.isArray(data) ? data : [];
      const materials = raw.map(m => normalizeMaterial(m as Partial<Material> & { id: number; name: string; code: string }));
      set({ materials, loaded: true, loading: false });
      return materials;
    } catch (err) {
      console.error('[materialStore] fetchMaterials failed:', err);
      set({ loading: false });
      return get().materials;
    }
  },

  fetchLocations: async (force = false) => {
    if (!force && get().locationsLoaded) return get().locations;
    try {
      const data = await apiCommand<WarehouseLocation[]>('get_warehouse_locations');
      const locations = Array.isArray(data) ? data : [];
      set({ locations, locationsLoaded: true });
      return locations;
    } catch (err) {
      console.error('[materialStore] fetchLocations failed:', err);
      return get().locations;
    }
  },

  createMaterial: async (payload) => {
    await apiCommand('create_material', payload);
    await get().fetchMaterials(true);
    syncDashboard();
  },

  updateMaterial: async (id, patch) => {
    await apiCommand('update_material', { id, ...patch });
    await get().fetchMaterials(true);
    syncDashboard();
  },

  deleteMaterial: async (id) => {
    await apiCommand('delete_material', { id });
    set({ materials: get().materials.filter(m => m.id !== id) });
    syncDashboard();
  },

  invalidate: async () => {
    await get().fetchMaterials(true);
  },
}));

export const useMaterials = () => useMaterialStore(s => s.materials);
export const useWarehouseLocations = () => useMaterialStore(s => s.locations);
