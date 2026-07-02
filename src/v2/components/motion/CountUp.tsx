import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';

type Props = {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  className?: string;
};

export default function CountUp({
  value,
  duration = 600,
  formatter = (n) => n.toLocaleString('ro-RO'),
  className,
}: Props) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const displayRef = useRef(display);
  displayRef.current = display;
  const mounted = useRef(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    const from = mounted.current ? displayRef.current : 0;
    const to = value;
    mounted.current = true;

    if (from !== to && from !== 0) {
      setFlash(true);
      const flashTimer = window.setTimeout(() => setFlash(false), 200);
      const start = performance.now();
      let frame: number;

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 3;
        setDisplay(Math.round(from + (to - from) * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);

      return () => {
        window.clearTimeout(flashTimer);
        cancelAnimationFrame(frame);
      };
    }

    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return (
    <span className={`tabular-nums ${flash ? 'v2-kpi-flash' : ''} ${className ?? ''}`}>
      {formatter(display)}
    </span>
  );
}
