import { getStorage, setStorage, STORAGE_KEYS } from '@/config/localStorage';
import { applyUiScale } from '@/lib/uiScale';

export type UiDensity = 'comfortable' | 'compact' | 'dense';

export const DENSITY_OPTIONS: readonly { id: UiDensity; label: string; hint: string }[] = [
  { id: 'comfortable', label: 'Confortabil', hint: 'Spațiere clasică între carduri' },
  { id: 'compact', label: 'Compact', hint: 'Implicit — echilibru densitate / lizibilitate' },
  { id: 'dense', label: 'Dens', hint: 'Maximum date pe ecran, utilizatori avansați' },
] as const;

function isDensity(v: string | null | undefined): v is UiDensity {
  return v === 'comfortable' || v === 'compact' || v === 'dense';
}

/** Read persisted density — ui-density key first, then layout store fallback. */
export function readPersistedDensity(): UiDensity {
  const direct = getStorage(STORAGE_KEYS.UI_DENSITY);
  if (isDensity(direct)) return direct;

  try {
    const raw = localStorage.getItem('promix-layout-storage');
    const parsed = raw ? JSON.parse(raw) as { state?: { density?: string } } : null;
    const fromLayout = parsed?.state?.density;
    if (isDensity(fromLayout)) return fromLayout;
  } catch {
    /* ignore corrupt storage */
  }

  return 'compact';
}

/** Apply density to <html> and sync rem scale. Call before first paint and on change. */
export function applyDensity(density?: UiDensity): void {
  if (typeof document === 'undefined') return;

  const mode = density ?? readPersistedDensity();
  document.documentElement.dataset.density = mode;
  setStorage(STORAGE_KEYS.UI_DENSITY, mode);
  applyUiScale({ density: mode });
}
