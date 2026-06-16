import { useEffect, useRef, useState, useCallback } from 'react';
import { getServerUrl } from '@/config/server';

export type ConnectionState = 'online' | 'reconnecting' | 'offline' | 'local';

const BACKOFF_SCHEDULE_SEC = [2, 5, 10, 20, 30, 60];
const OFFLINE_AFTER_FAILURES = 3;
const HEALTH_TIMEOUT_MS = 5000;

async function ping(url: string, timeoutMs = HEALTH_TIMEOUT_MS): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}





export function useServerConnection() {
  const [state, setState] = useState<ConnectionState>(() => (getServerUrl() ? 'reconnecting' : 'local'));
  const [retryInSec, setRetryInSec] = useState<number>(0);
  const failureCount = useRef(0);
  const backoffIdx = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const serverUrl = getServerUrl();

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const runCheck = useCallback(async () => {
    const url = getServerUrl();
    if (!url) { setState('local'); return; }
    const ok = await ping(url);
    if (ok) {
      failureCount.current = 0;
      backoffIdx.current = 0;
      setRetryInSec(0);
      setState('online');
      scheduleNext(15);
    } else {
      failureCount.current += 1;
      const next = BACKOFF_SCHEDULE_SEC[Math.min(backoffIdx.current, BACKOFF_SCHEDULE_SEC.length - 1)];
      backoffIdx.current += 1;
      setState(failureCount.current >= OFFLINE_AFTER_FAILURES ? 'offline' : 'reconnecting');
      scheduleNext(next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleNext = useCallback((seconds: number) => {
    clearTimers();
    setRetryInSec(seconds);
    countdownRef.current = setInterval(() => {
      setRetryInSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    timerRef.current = setTimeout(() => { void runCheck(); }, seconds * 1000);
  }, [clearTimers, runCheck]);

  const retryNow = useCallback(() => {
    backoffIdx.current = 0;
    failureCount.current = 0;
    setState('reconnecting');
    void runCheck();
  }, [runCheck]);

  useEffect(() => {
    if (!serverUrl) { setState('local'); return; }
    void runCheck();
    const onOnline = () => retryNow();
    window.addEventListener('online', onOnline);
    return () => {
      clearTimers();
      window.removeEventListener('online', onOnline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl]);

  return { state, retryInSec, retryNow, serverUrl };
}
