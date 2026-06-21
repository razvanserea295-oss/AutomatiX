import { getStorage, STORAGE_KEYS } from '@/config/localStorage';

// Single source of truth for the root font-size, combining two Aspect controls:
//   • Density   (comfortable / compact)  — overall tightness
//   • TextScale (small / normal / large) — text size
// Both are rem-based in this app, so a root font-size change scales spacing AND
// type together — the only reliable way to make "density" visibly affect the
// whole UI (the old data-density CSS only touched a couple of table classes).

type Density = 'comfortable' | 'compact';
type TextScale = 'small' | 'normal' | 'large';

const DENSITY_FACTOR: Record<Density, number> = { comfortable: 1, compact: 0.9 };
const SCALE_FACTOR: Record<TextScale, number> = { small: 0.94, normal: 1, large: 1.12 };

export function readDensity(): Density {
  try {
    const s = JSON.parse(localStorage.getItem('promix-layout-storage') || '{}');
    return s?.state?.density === 'compact' ? 'compact' : 'comfortable';
  } catch { return 'comfortable'; }
}

export function readTextScale(): TextScale {
  const v = getStorage(STORAGE_KEYS.TEXT_SCALE);
  return v === 'small' || v === 'large' ? v : 'normal';
}

// Pass the value being changed explicitly (the store's persist may not have
// flushed to localStorage yet); the other is read from storage.
export function applyUiScale(opts?: { density?: Density; scale?: TextScale }): void {
  if (typeof document === 'undefined') return;
  const d = opts?.density ?? readDensity();
  const s = opts?.scale ?? readTextScale();
  const root = document.documentElement;
  if (d === 'comfortable' && s === 'normal') {
    root.style.removeProperty('font-size'); // back to browser default (16px)
    return;
  }
  const px = Math.max(12, 16 * DENSITY_FACTOR[d] * SCALE_FACTOR[s]);
  root.style.fontSize = `${px.toFixed(2)}px`;
}
