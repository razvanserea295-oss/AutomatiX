import { create } from 'zustand';
import { STORAGE_KEYS, getStorage, setStorage, removeStorage } from '@/config/localStorage';

// Accent colour override. `null` = no override → the theme's default accent
// (the blue defined in redesign/index.css :root / .dark) applies. Mirrors the
// themeStore pattern: persist to localStorage + apply to the document root, and
// re-apply at boot from main.tsx so the choice survives reloads with no flash.

// Pick a readable ink (white vs near-black) for text/icons sitting ON the
// accent (e.g. primary buttons), based on the accent's relative luminance.
function contrastInk(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.5 ? '#0B1020' : '#ffffff';
}

const isHex = (v: string): boolean => /^#[0-9a-fA-F]{6}$/.test(v);

export function readPersistedAccent(): string | null {
  const raw = getStorage(STORAGE_KEYS.ACCENT).trim();
  return isHex(raw) ? raw : null;
}

export function applyAccent(color: string | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!color || !isHex(color)) {
    // Drop the inline overrides → CSS theme defaults take over again.
    root.style.removeProperty('--color-accent');
    root.style.removeProperty('--color-accent-muted');
    root.style.removeProperty('--color-on-accent');
    return;
  }
  // Inline styles on <html> win over the :root / .dark rules, so one accent
  // applies in both light and dark mode.
  root.style.setProperty('--color-accent', color);
  root.style.setProperty('--color-accent-muted', `color-mix(in srgb, ${color} 12%, transparent)`);
  root.style.setProperty('--color-on-accent', contrastInk(color));
}

interface AccentState {
  accent: string | null;
  setAccent: (color: string | null) => void;
  restoreAccent: () => void;
}

export const useAccentStore = create<AccentState>((set) => ({
  accent: readPersistedAccent(),
  setAccent: (color) => {
    const next = color && isHex(color) ? color : null;
    set({ accent: next });
    if (next) setStorage(STORAGE_KEYS.ACCENT, next);
    else removeStorage(STORAGE_KEYS.ACCENT);
    applyAccent(next);
  },
  restoreAccent: () => {
    const c = readPersistedAccent();
    set({ accent: c });
    applyAccent(c);
  },
}));
