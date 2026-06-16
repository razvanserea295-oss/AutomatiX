import { create } from 'zustand';

type ShellMode = 'sidebar' | 'navbar';

const KEY = 'promix_shell_mode_v1';

interface ShellModeState {
  mode: ShellMode;
  toggle: () => void;
  setMode: (m: ShellMode) => void;
}

const read = (): ShellMode => {
  if (typeof window === 'undefined') return 'sidebar';
  const v = window.localStorage.getItem(KEY);
  return v === 'navbar' ? 'navbar' : 'sidebar';
};

const persist = (m: ShellMode) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, m);
};

export const useShellModeStore = create<ShellModeState>((set, get) => ({
  mode: read(),
  toggle: () => {
    const next: ShellMode = get().mode === 'sidebar' ? 'navbar' : 'sidebar';
    persist(next);
    set({ mode: next });
  },
  setMode: (m) => {
    persist(m);
    set({ mode: m });
  },
}));
