import { useCallback } from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { DENSITY_OPTIONS, type UiDensity } from '@/lib/density';

export function useDensity() {
  const density = useLayoutStore((s) => s.density);
  const setDensityStore = useLayoutStore((s) => s.setDensity);

  const setDensity = useCallback(
    (mode: UiDensity) => setDensityStore(mode),
    [setDensityStore],
  );

  return {
    density,
    setDensity,
    options: DENSITY_OPTIONS,
    isCompact: density === 'compact',
    isDense: density === 'dense',
    isComfortable: density === 'comfortable',
  };
}
