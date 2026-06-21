import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { THEMES, DEFAULT_THEME, type Theme } from '@/config/constants';
import { STORAGE_KEYS, getStorage, setStorage } from '@/config/localStorage';
import { isElectronRuntime } from '@/lib/runtime';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  restoreTheme: () => void;
}

function isTheme(v: string): v is Theme {
  return v === THEMES.LIGHT || v === THEMES.DARK;
}

export function readPersistedTheme(): Theme {
  const raw = getStorage(STORAGE_KEYS.THEME);
  if (isTheme(raw)) return raw;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return THEMES.LIGHT;
  }
  return DEFAULT_THEME;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === THEMES.DARK) root.classList.add('dark');
  else root.classList.remove('dark');

  if (isElectronRuntime()) {
    try {
      window.electron.invoke('window_set_title_bar_theme', { mode: theme });
    } catch {  }
  }
}

export const useThemeStore = create<ThemeState>()(
  subscribeWithSelector((set, get) => ({
    theme: readPersistedTheme(),
    setTheme: (theme: Theme) => {
      set({ theme });
      setStorage(STORAGE_KEYS.THEME, theme);
      applyTheme(theme);
    },
    toggleTheme: () => {
      const next = get().theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
      get().setTheme(next);
    },
    restoreTheme: () => {
      const persisted = readPersistedTheme();
      set({ theme: persisted });
      applyTheme(persisted);
    },
  }))
);

export function useTheme(): Theme {
  return useThemeStore(state => state.theme);
}

export function useDarkMode(): boolean {
  return useThemeStore(state => state.theme === THEMES.DARK);
}
