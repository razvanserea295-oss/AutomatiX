









import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}


const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

export function useCountUp(target: number, options?: { duration?: number; from?: number }): number {
  const durationOverride = options?.duration;
  const safeTarget = Number.isFinite(target) ? target : 0;
  
  
  
  
  const initial = Number.isFinite(options?.from as number) ? (options!.from as number) : safeTarget;
  const [value, setValue] = useState(initial);
  const fromRef = useRef(initial);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const to = safeTarget;
    const from = fromRef.current;

    if (prefersReducedMotion() || from === to) {
      setValue(to);
      fromRef.current = to;
      return;
    }

    const delta = Math.abs(to - from);
    const duration = Math.min(1200, Math.max(280, durationOverride ?? delta * 0.6));
    let start: number | null = null;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setValue(from + (to - from) * easeOut(p));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = to; 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeTarget, durationOverride]);

  return value;
}
