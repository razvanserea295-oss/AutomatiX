import { useEffect, useRef, useState } from 'react';

/** Tier 1: hidden · Tier 2: skeleton · Tier 3: skeleton + elapsed context */
export type LoadingTier = 'hidden' | 'skeleton' | 'extended';

const TIER2_DELAY_MS = 100;
const TIER3_DELAY_MS = 1000;
const MIN_SKELETON_VISIBLE_MS = 200;

export interface DeferredLoadingState {
  tier: LoadingTier;
  /** True while the parent reports loading but tier is still hidden (<100ms). */
  isPending: boolean;
  /** Elapsed ms since loading started (for tier 3 context). */
  elapsedMs: number;
  showSkeleton: boolean;
  showExtended: boolean;
}

/**
 * 3-tier deferred loading:
 * - <100ms: nothing (layout reserved via reserve shell)
 * - 100ms–1s: skeleton
 * - >1s: skeleton + progress context + elapsed time
 *
 * Skeleton stays visible at least 200ms once shown (min-display logic).
 */
export function useDeferredLoading(isLoading: boolean, dataReady = true): DeferredLoadingState {
  const active = isLoading || !dataReady;
  const [tier, setTier] = useState<LoadingTier>('hidden');
  const [elapsedMs, setElapsedMs] = useState(0);
  const skeletonShownAt = useRef<number | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!active) {
      const shownAt = skeletonShownAt.current;
      if (shownAt == null) {
        setTier('hidden');
        setElapsedMs(0);
        return;
      }
      const visibleFor = Date.now() - shownAt;
      const remaining = Math.max(0, MIN_SKELETON_VISIBLE_MS - visibleFor);
      const hideTimer = setTimeout(() => {
        setTier('hidden');
        setElapsedMs(0);
        skeletonShownAt.current = null;
      }, remaining);
      return () => clearTimeout(hideTimer);
    }

    setElapsedMs(0);
    skeletonShownAt.current = null;
    const startedAt = Date.now();

    const tier2 = setTimeout(() => {
      skeletonShownAt.current = Date.now();
      setTier('skeleton');
    }, TIER2_DELAY_MS);

    const tier3 = setTimeout(() => {
      if (activeRef.current) setTier('extended');
    }, TIER3_DELAY_MS);

    const tick = setInterval(() => {
      if (activeRef.current) setElapsedMs(Date.now() - startedAt);
    }, 100);

    return () => {
      clearTimeout(tier2);
      clearTimeout(tier3);
      clearInterval(tick);
    };
  }, [active]);

  return {
    tier,
    isPending: active && tier === 'hidden',
    elapsedMs,
    showSkeleton: tier === 'skeleton' || tier === 'extended',
    showExtended: tier === 'extended',
  };
}

/** Alias for useDeferredLoading — same 3-tier API. */
export const useLoadingTier = useDeferredLoading;

export interface RefetchLoadingState {
  isFetching: boolean;
  showBar: boolean;
  isComplete: boolean;
}

/**
 * Flash-prevention: delays showing loading UI until `minDelayMs` of continuous loading.
 * If data resolves before the delay, nothing is shown. Once visible, stays at least `minDelayMs`.
 */
export function useDelayedLoading(isLoading: boolean, minDelayMs = 200): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      const showTimer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, minDelayMs);
      return () => clearTimeout(showTimer);
    }

    if (shownAt.current == null) {
      setVisible(false);
      return;
    }

    const elapsed = Date.now() - shownAt.current;
    const remaining = Math.max(0, minDelayMs - elapsed);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      shownAt.current = null;
    }, remaining);
    return () => clearTimeout(hideTimer);
  }, [isLoading, minDelayMs]);

  return visible;
}

/** Panel-level refetch indicator — bar visible while fetching, completes on settle. */
export function useRefetchLoading(isFetching: boolean): RefetchLoadingState {
  const [showBar, setShowBar] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const wasFetching = useRef(false);

  useEffect(() => {
    if (isFetching) {
      wasFetching.current = true;
      setShowBar(true);
      setIsComplete(false);
      return;
    }
    if (!wasFetching.current) return;
    wasFetching.current = false;
    setIsComplete(true);
    const t = setTimeout(() => {
      setShowBar(false);
      setIsComplete(false);
    }, 300);
    return () => clearTimeout(t);
  }, [isFetching]);

  return { isFetching, showBar, isComplete };
}
