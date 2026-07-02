import { useEffect, type ReactNode } from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { applyDensity, readPersistedDensity } from '@/lib/density';

type Props = {
  children: ReactNode;
};

/** Syncs layoutStore density with data-density on <html> after hydration. */
export default function DensityProvider({ children }: Props) {
  const density = useLayoutStore((s) => s.density);
  const setDensity = useLayoutStore((s) => s.setDensity);

  useEffect(() => {
    const persisted = readPersistedDensity();
    if (persisted !== density) {
      setDensity(persisted);
    } else {
      applyDensity(density);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- boot sync once

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  return children;
}
