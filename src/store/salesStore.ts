








import { create } from 'zustand';
import { apiCommand } from '@/api/commands';
import { useDashboardStore } from './dashboardStore';
import { useProjectStore } from './projectStore';

export interface LeadNote {
  id: number;
  content: string;
  created_by_name: string | null;
  created_at: string;
}

export interface SalesLead {
  id: number;
  client_name: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  product_interest: string | null;
  estimated_value: number;
  location: string | null;
  status: string;
  notes: string | null;
  last_contact_date: string | null;
  next_followup_date: string | null;
  assigned_to_name: string | null;
  converted_project_id: number | null;
  converted_project_name: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  recent_notes: LeadNote[];
}

interface SalesState {
  leads: SalesLead[];
  loading: boolean;
  loaded: boolean;

  fetchLeads: (force?: boolean) => Promise<SalesLead[]>;
  reloadLead: (id: number) => Promise<SalesLead | null>;

  createLead: (payload: Record<string, unknown>) => Promise<SalesLead | null>;
  updateLead: (id: number, patch: Record<string, unknown>) => Promise<void>;
  deleteLead: (id: number) => Promise<void>;
  addNote: (leadId: number, content: string) => Promise<void>;
  convertLead: (leadId: number, projectName: string) => Promise<void>;

  invalidate: () => Promise<void>;
}

async function syncDashboard(): Promise<void> {
  await useDashboardStore.getState().invalidate();
}

export const useSalesStore = create<SalesState>((set, get) => ({
  leads: [],
  loading: false,
  loaded: false,

  fetchLeads: async (force = false) => {
    if (!force && get().loaded) return get().leads;
    set({ loading: true });
    try {
      const data = await apiCommand<SalesLead[]>('get_sales_leads');
      const leads = Array.isArray(data) ? data : [];
      set({ leads, loaded: true, loading: false });
      return leads;
    } catch (err) {
      console.error('[salesStore] fetchLeads failed:', err);
      set({ loading: false });
      return get().leads;
    }
  },

  reloadLead: async (id) => {
    try {
      const fresh = await apiCommand<SalesLead>('get_sales_lead', { id });
      set(state => ({
        leads: state.leads.map(l => (l.id === id ? fresh : l)),
      }));
      return fresh;
    } catch {
      return null;
    }
  },

  createLead: async (payload) => {
    
    
    
    const created = await apiCommand<SalesLead | null>('create_sales_lead', payload).catch(() => null);
    await get().fetchLeads(true);
    await syncDashboard();
    return created;
  },

  updateLead: async (id, patch) => {
    await apiCommand('update_sales_lead', { id, ...patch });
    await get().reloadLead(id);
    await syncDashboard();
  },

  deleteLead: async (id) => {
    await apiCommand('delete_sales_lead', { id });
    set(state => ({ leads: state.leads.filter(l => l.id !== id) }));
    await syncDashboard();
  },

  addNote: async (leadId, content) => {
    await apiCommand('add_sales_lead_note', { lead_id: leadId, content });
    await get().reloadLead(leadId);
  },

  convertLead: async (leadId, projectName) => {
    await apiCommand('convert_sales_lead', { lead_id: leadId, project_name: projectName });
    await get().fetchLeads(true);
    
    
    await useProjectStore.getState().refreshAll();
    await syncDashboard();
  },

  invalidate: async () => {
    await get().fetchLeads(true);
    await syncDashboard();
  },
}));

export const useLeads = () => useSalesStore(s => s.leads);
