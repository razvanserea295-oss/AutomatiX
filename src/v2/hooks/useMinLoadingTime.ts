import { useEffect, useState } from 'react';
import { MIN_SKELETON_MS } from '@/v2/lib/motion';

/** Ensures skeleton shows at least MIN_SKELETON_MS to avoid flash */
export function useMinLoadingTime(loading: boolean, minMs = MIN_SKELETON_MS): boolean {
  const [show, setShow] = useState(loading);
  const [startedAt, setStartedAt] = useState<number | null>(loading ? Date.now() : null);

  useEffect(() => {
    if (loading) {
      setShow(true);
      setStartedAt(Date.now());
      return;
    }
    if (!startedAt) {
      setShow(false);
      return;
    }
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, minMs - elapsed);
    const t = window.setTimeout(() => {
      setShow(false);
      setStartedAt(null);
    }, remaining);
    return () => window.clearTimeout(t);
  }, [loading, minMs, startedAt]);

  return show;
}
