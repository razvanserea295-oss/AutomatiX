import { create } from 'zustand';

// Which presentation layer renders the authenticated app:
//   'saas'  → the custom Modern-SaaS React UI (default, unchanged)
//   'fiori' → the SAP UI5 Web Components (Horizon) tree (src/fiori/**)
// The data layer (stores, apiCommand, services, config, lib, hooks) is shared.
export type UiMode = 'saas' | 'fiori';

const KEY = 'promix_ui_mode';

function readInitial(): UiMode {
  if (typeof window === 'undefined') return 'saas';
  // A ?ui=fiori / ?ui=saas query param wins and is persisted (handy for testing).
  try {
    const q = new URLSearchParams(window.location.search).get('ui');
    if (q === 'fiori' || q === 'saas') { window.localStorage.setItem(KEY, q); return q; }
  } catch { /* ignore */ }
  return window.localStorage.getItem(KEY) === 'fiori' ? 'fiori' : 'saas';
}

const persist = (m: UiMode) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, m);
};

interface UiModeState {
  mode: UiMode;
  setMode: (m: UiMode) => void;
  toggle: () => void;
}

export const useUiModeStore = create<UiModeState>((set, get) => ({
  mode: readInitial(),
  setMode: (m) => { persist(m); set({ mode: m }); },
  toggle: () => {
    const next: UiMode = get().mode === 'fiori' ? 'saas' : 'fiori';
    persist(next);
    set({ mode: next });
  },
}));

export const useUiMode = (): UiMode => useUiModeStore(s => s.mode);
