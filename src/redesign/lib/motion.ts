/**
 * Stagger delay helper — mirrors CSS stagger cap (index > 9 → 9 × interval).
 */
export function staggerDelay(index: number, intervalMs: number): string {
  return `${Math.min(index, 9) * intervalMs}ms`;
}

/** Stagger interval presets (ms) — match motion/stagger.css */
export const STAGGER_INTERVAL = {
  xs: 30,
  sm: 50,
  fast: 50,
  md: 80,
  lg: 120,
  slow: 120,
  dropdown: 20,
} as const;

export type StaggerPreset = keyof typeof STAGGER_INTERVAL;

export function staggerDelayPreset(index: number, preset: StaggerPreset): string {
  return staggerDelay(index, STAGGER_INTERVAL[preset]);
}
