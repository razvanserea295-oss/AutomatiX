import { create } from 'zustand';
import { STORAGE_KEYS, getStorage, setStorage, removeStorage } from '@/config/localStorage';

// In-app motion preference (Settings → Aspect), independent of the OS
// `prefers-reduced-motion`. 'reduced' sets `data-motion="reduced"` on <html>,
// which a CSS block (redesign/index.css) uses to near-zero all animations and
// transitions, and which pageTransitions.ts honours to skip the page morph.
// Mirrors the themeStore/accentStore pattern: persist + apply + boot restore.
export type Motion = 'full' | 'reduced';

export function readPersistedMotion(): Motion {
  return getStorage(STORAGE_KEYS.MOTION) === 'reduced' ? 'reduced' : 'full';
}

export function applyMotion(motion: Motion): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (motion === 'reduced') root.dataset.motion = 'reduced';
  else delete root.dataset.motion;
}

interface MotionState {
  motion: Motion;
  setMotion: (m: Motion) => void;
  restoreMotion: () => void;
}

export const useMotionStore = create<MotionState>((set) => ({
  motion: readPersistedMotion(),
  setMotion: (m) => {
    set({ motion: m });
    if (m === 'reduced') setStorage(STORAGE_KEYS.MOTION, 'reduced');
    else removeStorage(STORAGE_KEYS.MOTION);
    applyMotion(m);
  },
  restoreMotion: () => {
    const m = readPersistedMotion();
    set({ motion: m });
    applyMotion(m);
  },
}));
