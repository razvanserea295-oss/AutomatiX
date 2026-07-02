import { create } from 'zustand';

// Tiered Audience Architecture — one app, two depths.
//   'standard' → guided, clean, high-level (regular business users)
//   'expert'   → advanced tools, deep filters, custom params, full widget grid
// Persisted per device. Default = 'expert' (this deployment leans power-user).
export type ViewTier = 'standard' | 'expert';

const KEY = 'promix_view_tier';

function read(): ViewTier {
  if (typeof window === 'undefined') return 'expert';
  const v = window.localStorage.getItem(KEY);
  return v === 'standard' || v === 'expert' ? v : 'expert';
}

interface ViewTierState {
  tier: ViewTier;
  setTier: (t: ViewTier) => void;
  toggle: () => void;
}

export const useViewTierStore = create<ViewTierState>((set, get) => ({
  tier: read(),
  setTier: (t) => { try { window.localStorage.setItem(KEY, t); } catch { /* quota */ } set({ tier: t }); },
  toggle: () => {
    const next: ViewTier = get().tier === 'expert' ? 'standard' : 'expert';
    try { window.localStorage.setItem(KEY, next); } catch { /* quota */ }
    set({ tier: next });
  },
}));

export const useViewTier = (): ViewTier => useViewTierStore((s) => s.tier);
