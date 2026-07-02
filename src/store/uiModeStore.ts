import { create } from 'zustand';

// Presentation layer — locked to Modern SaaS for production stability.
// Alternate shells (fiori / code / hybrid) remain in the codebase but are not
// user-selectable until a single UI track is chosen and finished.
export type UiMode = 'saas' | 'fiori' | 'code' | 'hybrid';

const KEY = 'promix_ui_mode';

function readInitial(): UiMode {
  if (typeof window === 'undefined') return 'saas';
  // Migrate any legacy alternate mode back to SaaS.
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved && saved !== 'saas') window.localStorage.setItem(KEY, 'saas');
  } catch { /* ignore */ }
  return 'saas';
}

const persist = (m: UiMode) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, m);
};

interface UiModeState {
  mode: UiMode;
  setMode: (m: UiMode) => void;
  toggle: () => void;
}

export const useUiModeStore = create<UiModeState>((set) => ({
  mode: readInitial(),
  setMode: () => { persist('saas'); set({ mode: 'saas' }); },
  toggle: () => { persist('saas'); set({ mode: 'saas' }); },
}));

export const useUiMode = (): UiMode => useUiModeStore(s => s.mode);
