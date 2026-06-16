







import { create } from 'zustand';
import { apiCommand } from '@/api/commands';

export interface Station {
  id: number;
  name: string;
  code: string;
  station_type: string;
  location: string;
  status: string;
  manufacturer: string;
  model: string;
  commissioned_date: string;
}

interface StationState {
  stations: Station[];
  loading: boolean;
  loaded: boolean;

  fetchStations: (force?: boolean) => Promise<Station[]>;

  createStation: (payload: Record<string, unknown>) => Promise<void>;
  updateStation: (id: number, patch: Record<string, unknown>) => Promise<void>;
  deleteStation: (id: number) => Promise<void>;

  invalidate: () => Promise<void>;
}

export const useStationStore = create<StationState>((set, get) => ({
  stations: [],
  loading: false,
  loaded: false,

  fetchStations: async (force = false) => {
    if (!force && get().loaded) return get().stations;
    set({ loading: true });
    try {
      const data = await apiCommand<Station[]>('get_all_stations');
      const stations = Array.isArray(data) ? data : [];
      set({ stations, loaded: true, loading: false });
      return stations;
    } catch (err) {
      console.error('[stationStore] fetchStations failed:', err);
      set({ loading: false });
      return get().stations;
    }
  },

  createStation: async (payload) => {
    await apiCommand('create_station', payload);
    await get().fetchStations(true);
  },

  updateStation: async (id, patch) => {
    await apiCommand('update_station', { id, ...patch });
    await get().fetchStations(true);
  },

  deleteStation: async (id) => {
    await apiCommand('delete_station', { id });
    set({ stations: get().stations.filter(s => s.id !== id) });
  },

  invalidate: async () => {
    await get().fetchStations(true);
  },
}));

export const useStations = () => useStationStore(s => s.stations);
