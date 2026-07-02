import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';

export type DashboardEntrancePhase =
  | 'idle'
  | 'toolbar'
  | 'kpis'
  | 'content'
  | 'charts'
  | 'table'
  | 'secondary'
  | 'complete';

const TIMELINE: { phase: DashboardEntrancePhase; at: number }[] = [
  { phase: 'toolbar', at: 0 },
  { phase: 'kpis', at: 50 },
  { phase: 'content', at: 320 },
  { phase: 'charts', at: 400 },
  { phase: 'table', at: 500 },
  { phase: 'secondary', at: 800 },
  { phase: 'complete', at: 900 },
];

export function useDashboardEntrance() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<DashboardEntrancePhase>(reduced ? 'complete' : 'idle');

  useEffect(() => {
    if (reduced) {
      setPhase('complete');
      return;
    }

    setPhase('idle');
    const timers = TIMELINE.map(({ phase: p, at }) =>
      window.setTimeout(() => setPhase(p), at),
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduced]);

  const isVisible = (target: DashboardEntrancePhase): boolean => {
    if (reduced || phase === 'complete') return true;
    const order: DashboardEntrancePhase[] = [
      'idle', 'toolbar', 'kpis', 'content', 'charts', 'table', 'secondary', 'complete',
    ];
    return order.indexOf(phase) >= order.indexOf(target);
  };

  return { phase, isVisible, reduced };
}
