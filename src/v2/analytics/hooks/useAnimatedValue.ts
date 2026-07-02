import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';
import { easeOutExpo } from '@/v2/analytics/lib/easing';

export type UseAnimatedValueOptions = {
  duration?: number;
};

/** Smoothly tweens between numeric values (live data, connection bars, etc.) */
export function useAnimatedValue(target: number, options: UseAnimatedValueOptions = {}) {
  const { duration = 400 } = options;
  const reduced = useReducedMotion();
  const safeTarget = Number.isFinite(target) ? target : 0;
  const [value, setValue] = useState(safeTarget);
  const fromRef = useRef(safeTarget);

  useEffect(() => {
    if (reduced) {
      setValue(safeTarget);
      fromRef.current = safeTarget;
      return;
    }

    const from = fromRef.current;
    const to = safeTarget;
    if (from === to) return;

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutExpo(t);
      setValue(from + (to - from) * eased);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [safeTarget, duration, reduced]);

  return value;
}
