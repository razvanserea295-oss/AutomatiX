import { useState, useEffect } from 'react';
import GearLogo from '@/components/ui/GearLogo';

interface SplashScreenProps {
  onFinished: () => void;
}

export default function SplashScreen({ onFinished }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    
    const seen = sessionStorage.getItem('splash_seen') === '1';
    const holdMs = seen ? 200 : 600;
    const fadeMs = seen ? 200 : 250;
    const timer = setTimeout(() => {
      setFadeOut(true);
      sessionStorage.setItem('splash_seen', '1');
      setTimeout(onFinished, fadeMs);
    }, holdMs);
    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface-primary transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-accent shadow-card-hover">
        <GearLogo size={44} className="text-surface-primary" />
      </div>

      <h1 className="text-2xl font-bold text-content-primary tracking-wide">
        Automatix
      </h1>
      <p className="mt-2 text-sm text-content-muted">
        Sistem integrat de management operational
      </p>

      <div className="mt-8 h-0.5 w-48 overflow-hidden rounded-full bg-line-subtle">
        <div className="h-full rounded-full bg-accent" style={{ animation: 'splash-load 1.5s ease-in-out' }} />
      </div>

      <style>{`
        @keyframes splash-load {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
