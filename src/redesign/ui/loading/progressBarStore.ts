import { useSyncExternalStore } from 'react';

export type ProgressBarPhase = 'idle' | 'active' | 'done' | 'error';

interface ProgressBarState {
  phase: ProgressBarPhase;
  progress: number;
}

type Listener = () => void;

let state: ProgressBarState = { phase: 'idle', progress: 0 };
const listeners = new Set<Listener>();
let crawlTimer: ReturnType<typeof setInterval> | null = null;
let resetTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach(l => l());
}

function clearTimers() {
  if (crawlTimer != null) {
    clearInterval(crawlTimer);
    crawlTimer = null;
  }
  if (resetTimer != null) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
}

function scheduleReset(delayMs = 300) {
  clearTimers();
  resetTimer = setTimeout(() => {
    state = { phase: 'idle', progress: 0 };
    notify();
    resetTimer = null;
  }, delayMs);
}

/**
 * Global top progress bar store.
 *
 * Router integration (optional — no react-router in this app):
 * ```ts
 * import { progressBarStore } from '@/redesign/ui/loading';
 * onPageChange(() => { progressBarStore.start(); progressBarStore.done(); });
 * ```
 */
export const progressBarStore = {
  getState(): ProgressBarState {
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  start() {
    clearTimers();
    state = { phase: 'active', progress: 20 };
    notify();
    crawlTimer = setInterval(() => {
      if (state.phase !== 'active') return;
      const next = Math.min(88, state.progress + (state.progress < 50 ? 2 : 0.6));
      state = { ...state, progress: next };
      notify();
    }, 200);
  },

  inc(n: number) {
    if (state.phase === 'idle') this.start();
    state = { ...state, progress: Math.min(95, state.progress + n) };
    notify();
  },

  done() {
    clearTimers();
    state = { phase: 'done', progress: 100 };
    notify();
    scheduleReset(300);
  },

  error() {
    clearTimers();
    state = { phase: 'error', progress: 100 };
    notify();
    scheduleReset(600);
  },
};

export function useProgressBarStore(): ProgressBarState {
  return useSyncExternalStore(
    progressBarStore.subscribe,
    progressBarStore.getState,
    progressBarStore.getState,
  );
}
