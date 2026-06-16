







import { create } from 'zustand';
import { apiCommand } from '@/api/commands';
import type { Client } from '@/core/types';

interface ClientState {
  clients: Client[];
  loading: boolean;
  loaded: boolean;

  fetchClients: (force?: boolean) => Promise<Client[]>;

  createClient: (payload: Record<string, unknown>) => Promise<void>;
  updateClient: (id: number, patch: Record<string, unknown>) => Promise<void>;
  deleteClient: (id: number) => Promise<void>;

  invalidate: () => Promise<void>;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  loading: false,
  loaded: false,

  fetchClients: async (force = false) => {
    if (!force && get().loaded) return get().clients;
    set({ loading: true });
    try {
      const data = await apiCommand<Client[]>('get_clients');
      const clients = Array.isArray(data) ? data : [];
      set({ clients, loaded: true, loading: false });
      return clients;
    } catch (err) {
      console.error('[clientStore] fetchClients failed:', err);
      set({ loading: false });
      return get().clients;
    }
  },

  createClient: async (payload) => {
    await apiCommand('create_client', payload);
    await get().fetchClients(true);
  },

  updateClient: async (id, patch) => {
    await apiCommand('update_client', { id, ...patch });
    set({ clients: get().clients.map(c => (c.id === id ? ({ ...c, ...patch } as Client) : c)) });
    await get().fetchClients(true);
  },

  deleteClient: async (id) => {
    await apiCommand('delete_client', { id });
    set({ clients: get().clients.filter(c => c.id !== id) });
  },

  invalidate: async () => {
    await get().fetchClients(true);
  },
}));

export const useClients = () => useClientStore(s => s.clients);
