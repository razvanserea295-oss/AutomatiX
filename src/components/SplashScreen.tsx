import { useState, useEffect } from 'react';
import GearLogo from '@/components/ui/GearLogo';

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

  const exiting = phase === 'exiting';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white ${
        exiting ? 'animate-fade-out pointer-events-none' : ''
      }`}
    >
      <div className={exiting ? 'animate-scale-out' : 'animate-scale-in'}>
        <GearLogo size={112} animated={!exiting} />
      </div>
    </div>
  );
}
