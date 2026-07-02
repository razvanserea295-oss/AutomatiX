import { create } from 'zustand';
import { STORAGE_KEYS, getStorage, setStorage, removeStorage } from '@/config/localStorage';

// Global layout density: the default "tiled" look (separate rounded/elevated
// cards) vs "flat" — one continuous, dense, borderless sheet. Same store→
// data-attr→CSS pattern as cardTransparencyStore: the attribute is PRESENT only
// for the non-default value, so "tiled" leaves the current styling untouched.
export type LayoutMode = 'tiled' | 'flat';

// Boot-time read (used by main.tsx before React mounts).
export function readPersistedLayoutMode(): LayoutMode {
  return getStorage(STORAGE_KEYS.LAYOUT_MODE) === 'flat' ? 'flat' : 'tiled';
}

// Write/clear data-layout-mode on <html>. 'tiled' = default → attribute removed
// entirely so the tiled styling is byte-for-byte the current look.
export function applyLayoutMode(mode: LayoutMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'flat') root.dataset.layoutMode = 'flat';
  else delete root.dataset.layoutMode;
}

interface LayoutModeState {
  layoutMode: LayoutMode;
  setLayoutMode: (m: LayoutMode) => void;
}

export const useLayoutModeStore = create<LayoutModeState>((set) => ({
  layoutMode: readPersistedLayoutMode(),
  setLayoutMode: (m) => {
    set({ layoutMode: m });
    if (m === 'flat') setStorage(STORAGE_KEYS.LAYOUT_MODE, 'flat');
    else removeStorage(STORAGE_KEYS.LAYOUT_MODE);
    applyLayoutMode(m);
  },
}));
