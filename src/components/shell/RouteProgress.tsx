
















import { useEffect, useRef, useState } from 'react';

interface Props {
  
  routeKey: string;
}

type Phase = 'idle' | 'rising' | 'finishing' | 'fading';

export default function RouteProgress({ routeKey }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const firstRender = useRef(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    
    
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    
    timers.current.forEach(window.clearTimeout);
    timers.current = [];

    setPhase('rising');
    timers.current.push(window.setTimeout(() => setPhase('finishing'), 280));
    timers.current.push(window.setTimeout(() => setPhase('fading'),    480));
    timers.current.push(window.setTimeout(() => setPhase('idle'),      720));
  }, [routeKey]);

  
  useEffect(() => () => { timers.current.forEach(window.clearTimeout); }, []);

  if (phase === 'idle') return null;

  const width =
    phase === 'rising'    ? '90%' :
    phase === 'finishing' ? '100%' :
                '100%';
  const opacity = phase === 'fading' ? 0 : 1;

  return (
    <div
      role="progressbar"
      aria-busy="true"
      aria-label="Se încarcă pagina"
      
      
      className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-[2px] motion-reduce:hidden"
    >
      <div
        className="h-full bg-accent shadow-none transition-[width,opacity] duration-200 ease-out"
        style={{ width, opacity, transitionDuration: phase === 'rising' ? '260ms' : '200ms' }}
      />
    </div>
  );
}
