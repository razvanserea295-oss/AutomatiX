















import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supportsViewTransitions } from '@/lib/pageTransitions';

interface Props {
  
  routeKey: string;
}

type Phase = 'idle' | 'in' | 'out';

export default function PageTransitionOverlay({ routeKey }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const firstRender = useRef(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    
    
    
    if (supportsViewTransitions()) return;
    timers.current.forEach(window.clearTimeout);
    timers.current = [];

    setPhase('in');
    timers.current.push(window.setTimeout(() => setPhase('out'),  120));
    timers.current.push(window.setTimeout(() => setPhase('idle'), 320));
  }, [routeKey]);

  useEffect(() => () => { timers.current.forEach(window.clearTimeout); }, []);

  if (phase === 'idle') return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-surface-primary transition-opacity duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:hidden ${
        phase === 'in' ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="rounded-full bg-surface-secondary border border-line shadow-soft p-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    </div>
  );
}
