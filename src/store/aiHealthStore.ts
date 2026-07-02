import { create } from 'zustand';
import { aiHealth } from '@/api/ai';

export type AiHealthState = 'online' | 'offline' | 'checking';

interface AiHealthStore {
  state: AiHealthState;
  lastCheckedAt: number | null;
  _timer: ReturnType<typeof setTimeout> | null;
  start: () => void;
  stop: () => void;
  checkNow: () => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000;
const BACKOFF_AFTER_FAILURE_MS = 10_000;





export const useAiHealthStore = create<AiHealthStore>((set, get) => ({
  state: 'checking',
  lastCheckedAt: null,
  _timer: null,

  start: () => {
    if (get()._timer) return; 
    const tick = async () => {
      const ok = await aiHealth();
      const st = get();
      if (!st._timer && st.state !== 'checking') return; 
      set({
        state: ok ? 'online' : 'offline',
        lastCheckedAt: Date.now(),
        _timer: setTimeout(tick, ok ? POLL_INTERVAL_MS : BACKOFF_AFTER_FAILURE_MS),
      });
    };
    set({ _timer: setTimeout(() => {  }, 0) });
    void tick();
  },

  stop: () => {
    const t = get()._timer;
    if (t) clearTimeout(t);
    set({ _timer: null });
  },

  checkNow: async () => {
    const t = get()._timer;
    if (t) clearTimeout(t);
    set({ state: 'checking' });
    const ok = await aiHealth();
    set({
      state: ok ? 'online' : 'offline',
      lastCheckedAt: Date.now(),
      _timer: setTimeout(get().checkNow, ok ? POLL_INTERVAL_MS : BACKOFF_AFTER_FAILURE_MS),
    });
  },
}));

export const useIsAiOnline = () => useAiHealthStore(s => s.state === 'online');
export const useIsAiOffline = () => useAiHealthStore(s => s.state === 'offline');
