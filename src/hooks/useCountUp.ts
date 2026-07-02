









/**
 * useCountUp — build enterprise: numere INSTANT (fără animație count-up).
 * Aspectul enterprise cere valori afișate imediat; animația teatrală a fost
 * retrasă (elimină și riscul de „0" înghețat în tab-uri de fundal). Semnătura
 * e păstrată pentru compatibilitatea call-site-urilor existente.
 */
export function useCountUp(target: number, _options?: { duration?: number; from?: number }): number {
  return Number.isFinite(target) ? target : 0;
}
