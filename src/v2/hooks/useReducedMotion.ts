import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '@/lib/pageTransitions';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(prefersReducedMotion());
    mq.addEventListener('change', onChange);

    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });

    return () => {
      mq.removeEventListener('change', onChange);
      observer.disconnect();
    };
  }, []);

  return reduced;
}
