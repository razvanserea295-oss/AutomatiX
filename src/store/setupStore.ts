import { create } from 'zustand';
import { apiCommand } from '@/api/commands';










export interface SetupState {
  company_name?: string;
  cui?: string;
  reg_com?: string;
  address?: string;
  city?: string;
  county?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  iban?: string;
  tva_rate?: number;
  default_currency?: string;
  logo_base64?: string;
  seal_base64?: string;
  invoice_series?: string;
  invoice_next_number?: number;
  offer_series?: string;
  offer_next_number?: number;
  aviz_series?: string;
  aviz_next_number?: number;
  number_format?: string;
}

interface SetupStore {
  completed: boolean | null;
  checked: boolean;
  open: boolean;
  snoozed: boolean;
  settings: SetupState;
  refresh: () => Promise<void>;
  openWizard: () => void;
  closeWizard: () => void;
  snooze: () => void;
  markCompleted: () => void;
}

export const useSetupStore = create<SetupStore>((set) => ({
  completed: null,
  checked: false,
  open: false,
  snoozed: false,
  settings: {},

  refresh: async () => {
    try {
      const res = await apiCommand<{ completed: boolean; settings: SetupState }>('get_setup_state');
      set({ completed: !!res.completed, settings: res.settings || {}, checked: true });
    } catch {
      
      
      set({ completed: true, checked: true });
    }
  },

  openWizard: () => set({ open: true, snoozed: false }),
  closeWizard: () => set({ open: false }),
  snooze: () => set({ open: false, snoozed: true }),
  markCompleted: () => set({ completed: true, open: false }),
}));
