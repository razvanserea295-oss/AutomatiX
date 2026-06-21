import { create } from 'zustand';
import { STORAGE_KEYS, getStorage, setStorage, removeStorage } from '@/config/localStorage';
import { applyUiScale } from '@/lib/uiScale';

// UI text scale (Settings → Aspect). The actual root font-size is computed in
// lib/uiScale.ts together with density (both scale the rem-based UI). This store
// just owns the text-scale choice + persistence. Boot restore is in main.tsx.
export type TextScale = 'small' | 'normal' | 'large';

function isScale(v: string): v is TextScale {
  return v === 'small' || v === 'normal' || v === 'large';
}

export function readPersistedTextScale(): TextScale {
  const raw = getStorage(STORAGE_KEYS.TEXT_SCALE);
  return isScale(raw) ? raw : 'normal';
}

interface TextScaleState {
  scale: TextScale;
  setScale: (s: TextScale) => void;
  restoreScale: () => void;
}

export const useTextScaleStore = create<TextScaleState>((set) => ({
  scale: readPersistedTextScale(),
  setScale: (s) => {
    set({ scale: s });
    if (s === 'normal') removeStorage(STORAGE_KEYS.TEXT_SCALE);
    else setStorage(STORAGE_KEYS.TEXT_SCALE, s);
    applyUiScale({ scale: s });
  },
  restoreScale: () => {
    const s = readPersistedTextScale();
    set({ scale: s });
    applyUiScale({ scale: s });
  },
}));
