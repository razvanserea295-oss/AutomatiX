




import { useEffect, useRef } from 'react';

export function useVisibilityPause(onChange: (visible: boolean) => void): void {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    const sync = () => cb.current(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
}
