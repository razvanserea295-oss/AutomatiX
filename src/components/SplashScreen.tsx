import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinished: () => void;
}

/* Apple-style splashscreen with smooth entrance/exit animation */
export default function SplashScreen({ onFinished }: SplashScreenProps) {
  const [phase, setPhase] = useState<'visible' | 'exiting'>('visible');

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setPhase('exiting');
    }, 1500);
    const finishTimer = setTimeout(() => {
      onFinished();
    }, 1800);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  if (phase === 'exiting') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white animate-fade-out pointer-events-none">
        <div className="animate-scale-out">
          <svg 
            viewBox="0 0 104 120" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-28 h-auto"
            aria-label="Automatix"
            role="img"
          >
            <g stroke="#0f172a" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M20 102 L50 18" />
              <path d="M50 18 L84 102" />
              <path d="M31 74 L69 74" />
            </g>
            <path d="M84 18 L50 102" stroke="#2563eb" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="animate-scale-in">
        <svg 
          viewBox="0 0 104 120" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-28 h-auto"
          aria-label="Automatix"
          role="img"
        >
          <g stroke="#0f172a" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M20 102 L50 18" />
            <path d="M50 18 L84 102" />
            <path d="M31 74 L69 74" />
          </g>
          <path d="M84 18 L50 102" stroke="#2563eb" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
