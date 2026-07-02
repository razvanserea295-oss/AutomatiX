import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';

export default function RouteProgressBar() {
  const [loc] = useLocation();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduced) return;

    setActive(true);
    setProgress(0);

    const t1 = window.setTimeout(() => setProgress(70), 80);
    const t2 = window.setTimeout(() => setProgress(100), 320);
    const t3 = window.setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 480);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [loc, reduced]);

  if (reduced) return null;

  return (
    <div className="v2-progress-bar" data-active={active} aria-hidden>
      <div
        className="v2-progress-bar__fill"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
