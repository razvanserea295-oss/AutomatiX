import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { progressBarStore } from '@/redesign/ui/loading/progressBarStore';

/**
 * Wires the global progress bar to wouter hash navigation.
 * Mount once inside `<Router>` (see App.tsx).
 */
export default function NavigationProgress() {
  const [location] = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    progressBarStore.start();
    const done = setTimeout(() => progressBarStore.done(), 420);
    return () => clearTimeout(done);
  }, [location]);

  return null;
}
