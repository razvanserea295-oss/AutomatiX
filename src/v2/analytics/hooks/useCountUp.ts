import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';
import { easeOutExpo } from '@/v2/analytics/lib/easing';

export type CountUpFormat = 'integer' | 'decimal' | 'currency';

export type UseCountUpOptions = {
  duration?: number;
  format?: CountUpFormat;
  locale?: string;
  currency?: string;
  decimals?: number;
  onComplete?: () => void;
};

export type CountUpFlash = 'increase' | 'decrease' | 'neutral' | null;

export function useCountUp(target: number, options: UseCountUpOptions = {}) {
  const {
    duration = 600,
    format = 'integer',
    locale = 'ro-RO',
    currency = 'RON',
    decimals = 2,
    onComplete,
  } = options;

  const reduced = useReducedMotion();
  const safeTarget = Number.isFinite(target) ? target : 0;
  const [display, setDisplay] = useState(reduced ? safeTarget : 0);
  const [flash, setFlash] = useState<CountUpFlash>(null);
  const [done, setDone] = useState(reduced);
  const fromRef = useRef(reduced ? safeTarget : 0);
  const mountedRef = useRef(false);

  useEffect(() => {
    const to = safeTarget;

    if (reduced) {
      setDisplay(to);
      fromRef.current = to;
      setDone(true);
      return;
    }

    const isUpdate = mountedRef.current;
    mountedRef.current = true;
    const from = isUpdate ? fromRef.current : 0;

    if (isUpdate && from !== to) {
      if (to > from) setFlash('increase');
      else if (to < from) setFlash('decrease');
      const flashTimer = window.setTimeout(() => setFlash(null), 250);
      const run = runAnimation(from, to);
      return () => {
        window.clearTimeout(flashTimer);
        run.cancel();
      };
    }

    setDone(false);
    const run = runAnimation(from, to);
    return run.cancel;

    function runAnimation(start: number, end: number) {
      const startTime = performance.now();
      let frame = 0;

      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = easeOutExpo(t);
        setDisplay(start + (end - start) * eased);
        if (t < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          fromRef.current = end;
          setDone(true);
          onComplete?.();
        }
      };

      frame = requestAnimationFrame(tick);
      return { cancel: () => cancelAnimationFrame(frame) };
    }
  }, [safeTarget, duration, reduced, onComplete]);

  const formatValue = (n: number, animating: boolean): string => {
    if (format === 'currency') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: animating ? 0 : decimals,
        maximumFractionDigits: animating ? 0 : decimals,
      }).format(n);
    }
    if (format === 'decimal') {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: animating ? 1 : decimals,
        maximumFractionDigits: animating ? 1 : decimals,
      }).format(n);
    }
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(n));
  };

  return {
    value: display,
    formatted: formatValue(display, !done),
    flash,
    done,
  };
}
