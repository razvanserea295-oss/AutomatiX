
















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

  const scaleX =
    phase === 'rising'    ? 0.9 :
    phase === 'finishing' ? 1 :
                1;
  const opacity = phase === 'fading' ? 0 : 1;

  return (
    <div
      role="progressbar"
      aria-busy="true"
      aria-label="Se încarcă pagina"
      
      
      className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-[2px] motion-reduce:hidden"
    >
      <div
        className="h-full w-full origin-left bg-accent transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
        style={{ transform: `scaleX(${scaleX})`, opacity, transitionDuration: phase === 'rising' ? '260ms' : '200ms' }}
      />
    </div>
  );
}
