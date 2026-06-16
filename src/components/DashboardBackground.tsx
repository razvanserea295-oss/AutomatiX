








import { useEffect, useState } from 'react';



const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  left: (i * 8.3 + 4) % 100,
  top: (i * 13.7 + 9) % 88,
  duration: 16 + (i % 5) * 4,
  delay: (i % 7) * -2.5,
}));

export default function DashboardBackground() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const sync = () => setPaused(document.visibilityState !== 'visible');
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return (
    <div className={`dash-bg${paused ? ' is-paused' : ''}`} aria-hidden="true">
      <div className="dash-bg__grid" />
      <div className="dash-bg__orb dash-bg__orb--1" />
      <div className="dash-bg__orb dash-bg__orb--2" />
      <div className="dash-bg__orb dash-bg__orb--3" />
      <div className="dash-bg__particles">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="dash-bg__p"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="dash-bg__vignette" />
    </div>
  );
}
