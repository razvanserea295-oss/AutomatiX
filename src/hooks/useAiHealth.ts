import { useEffect, useRef, useState } from 'react';
import { aiHealth } from '@/api/ai';

export type AiHealthState = 'online' | 'offline' | 'checking';

const POLL_INTERVAL_MS = 30_000;
const BACKOFF_AFTER_FAILURE_MS = 10_000;










export function useAiHealth() {
  const [state, setState] = useState<AiHealthState>('checking');
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;

    async function tick() {
      if (cancelRef.current) return;
      const ok = await aiHealth();
      if (cancelRef.current) return;
      setState(ok ? 'online' : 'offline');
      setLastCheckedAt(Date.now());
      timerRef.current = setTimeout(tick, ok ? POLL_INTERVAL_MS : BACKOFF_AFTER_FAILURE_MS);
    }

    void tick();

    const onFocus = () => {
      
      
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      void tick();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { state, lastCheckedAt, isOnline: state === 'online', isOffline: state === 'offline' };
}
