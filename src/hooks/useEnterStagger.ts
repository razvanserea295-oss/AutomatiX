








import type { CSSProperties } from 'react';
import { useReducedMotion } from './useReducedMotion';

export function useEnterStagger(count: number, baseDelay = 60): CSSProperties[] {
  const reduced = useReducedMotion();
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    reduced ? {} : { animationDelay: `${i * baseDelay}ms` },
  );
}
