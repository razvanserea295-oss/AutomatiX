/** ease-out-expo — canonical analytics count-up / bar grow curve */
export function easeOutExpo(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - 2 ** (-10 * t);
}

export const CHART_PALETTE = [
  'hsl(217 91% 60%)',
  'hsl(262 83% 68%)',
  'hsl(187 85% 53%)',
  'hsl(38 92% 60%)',
  'hsl(199 89% 58%)',
  'hsl(280 67% 62%)',
] as const;

export const ACCENT_GRADIENT_ID = 'analytics-accent-gradient';
