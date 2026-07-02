export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' &&
    typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition === 'function';
}

export function prefersReducedMotion(): boolean {
  // Honor the in-app "reduce motion" toggle (Settings → Aspect, data-motion) too.
  if (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduced') return true;
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function runForwardTransition(applyNav: () => void): void {
  applyNav();
}

export function runBackForwardTransition(): void {
  // Page transitions disabled — instant navigation only.
}

export function resolvePageCommit(): void {
  // No-op while page transitions are disabled.
}

const scrollStore = new Map<string, number>();

function primaryScrollEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('main [data-page-scroll]')
    ?? document.querySelector<HTMLElement>('main .overflow-y-auto');
}

export function saveScroll(fromLocation: string): void {
  const el = primaryScrollEl();
  if (el) scrollStore.set(fromLocation, el.scrollTop);
}

export function applyScroll(toLocation: string, isBack: boolean): void {
  requestAnimationFrame(() => {
    const el = primaryScrollEl();
    if (!el) return;
    el.scrollTop = isBack ? (scrollStore.get(toLocation) ?? 0) : 0;
  });
}

export function focusNewPage(): void {
  const main = document.querySelector<HTMLElement>('main');
  if (!main) return;
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  main.focus({ preventScroll: true });
}

export function initPageTransitions(): void {
  if (typeof document === 'undefined') return;
  if (supportsViewTransitions()) document.documentElement.classList.add('vt-supported');
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch { /* noop */ }
}
