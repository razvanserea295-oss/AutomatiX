import { getStorage, STORAGE_KEYS } from '@/config/localStorage';
import type { UiDensity } from '@/lib/density';

// Root font-size combines density + text-scale. CSS custom properties handle
// component sizing; rem scaling provides a second global tightening pass.

type TextScale = 'small' | 'normal' | 'large';

const DENSITY_FACTOR: Record<UiDensity, number> = {
  comfortable: 1,
  compact: 0.92,
  dense: 0.85,
};
const SCALE_FACTOR: Record<TextScale, number> = { small: 0.94, normal: 1, large: 1.12 };

export function readDensity(): UiDensity {
  try {
    const direct = getStorage(STORAGE_KEYS.UI_DENSITY);
    if (direct === 'comfortable' || direct === 'compact' || direct === 'dense') return direct;
    const s = JSON.parse(localStorage.getItem('promix-layout-storage') || '{}');
    const d = s?.state?.density;
    if (d === 'comfortable' || d === 'compact' || d === 'dense') return d;
  } catch { /* ignore */ }
  return 'compact';
}

export function readTextScale(): TextScale {
  const v = getStorage(STORAGE_KEYS.TEXT_SCALE);
  return v === 'small' || v === 'large' ? v : 'normal';
}

export function applyUiScale(opts?: { density?: UiDensity; scale?: TextScale }): void {
  if (typeof document === 'undefined') return;
  const d = opts?.density ?? readDensity();
  const s = opts?.scale ?? readTextScale();
  const root = document.documentElement;
  if (d === 'comfortable' && s === 'normal') {
    root.style.removeProperty('font-size');
    return;
  }
  const px = Math.max(12, 16 * DENSITY_FACTOR[d] * SCALE_FACTOR[s]);
  root.style.fontSize = `${px.toFixed(2)}px`;
}
