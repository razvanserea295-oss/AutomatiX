import { create } from 'zustand';
import { getServerUrl } from '@/config/server';

export type BusinessType = 'manufacturing' | 'restaurant';

interface BusinessTypeState {
  businessType: BusinessType;
  tenantName: string;
  loaded: boolean;
  loading: boolean;
  fetch: (force?: boolean) => Promise<BusinessType>;
  // Clear the cache so the NEXT fetch() re-resolves the business type from the
  // server. Called on logout so a tenant switch on a shared device doesn't keep
  // showing the previous tenant's navigation.
  reset: () => void;
}

function normalize(v: unknown): BusinessType {
  return v === 'restaurant' ? 'restaurant' : 'manufacturing';
}

export const useBusinessTypeStore = create<BusinessTypeState>((set, get) => ({
  businessType: 'manufacturing',
  tenantName: '',
  loaded: false,
  loading: false,

  fetch: async (force = false) => {
    if (!force && (get().loaded || get().loading)) return get().businessType;
    const serverUrl = getServerUrl();
    if (!serverUrl) {
      set({ loaded: true });
      return get().businessType;
    }
    set({ loading: true });
    try {
      const res = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json() as { businessType?: string; tenantName?: string };
        set({
          businessType: normalize(data.businessType),
          tenantName: data.tenantName || '',
          loaded: true,
          loading: false,
        });
      } else {
        set({ loaded: true, loading: false });
      }
    } catch {
      set({ loaded: true, loading: false });
    }
    return get().businessType;
  },

  reset: () => set({ loaded: false, loading: false }),
}));

export const useBusinessType = (): BusinessType => useBusinessTypeStore(s => s.businessType);
