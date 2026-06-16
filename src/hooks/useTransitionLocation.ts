









import { useCallback } from 'react';
import { useHashLocation } from 'wouter/use-hash-location';
import { runForwardTransition, saveScroll } from '@/lib/pageTransitions';

type Navigate = (to: string, options?: { replace?: boolean }) => void;

export function useTransitionLocation(): [string, Navigate] {
  const [loc, navigate] = useHashLocation();

  const wrapped = useCallback<Navigate>((to, options) => {
    
    if (to === loc) { navigate(to, options); return; }
    saveScroll(loc);
    runForwardTransition(() => navigate(to, options));
  }, [loc, navigate]);

  return [loc, wrapped];
}
