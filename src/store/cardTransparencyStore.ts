import { create } from 'zustand';
import { STORAGE_KEYS, getStorage, setStorage, removeStorage } from '@/config/localStorage';

export type CardTransparency = 'default' | 'transparent' | 'ghost';

export function readPersistedCardTransparency(): CardTransparency {
  const v = getStorage(STORAGE_KEYS.CARD_TRANSPARENT);
  if (v === 'transparent' || v === 'ghost') return v;
  return 'default';
}

export function applyCardTransparency(v: CardTransparency): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (v === 'transparent' || v === 'ghost') root.dataset.cardBg = v;
  else delete root.dataset.cardBg;
}

interface CardTransparencyState {
  cardTransparency: CardTransparency;
  setCardTransparency: (v: CardTransparency) => void;
}

export const useCardTransparencyStore = create<CardTransparencyState>((set) => ({
  cardTransparency: readPersistedCardTransparency(),
  setCardTransparency: (v) => {
    set({ cardTransparency: v });
    if (v === 'transparent') setStorage(STORAGE_KEYS.CARD_TRANSPARENT, 'transparent');
    else removeStorage(STORAGE_KEYS.CARD_TRANSPARENT);
    applyCardTransparency(v);
  },
}));
