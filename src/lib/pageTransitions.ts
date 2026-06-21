


















let pendingResolve: (() => void) | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

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






function setVtActive(): void { document.documentElement.classList.add('vt-active'); }
function clearVtActive(): void {
  document.documentElement.classList.remove('vt-active');
  delete document.documentElement.dataset.vtDir;
}

type StartViewTransition = (cb: () => void | Promise<void>) => { finished: Promise<void> };

function begin(direction: 'forward' | 'back', applyNav?: () => void): void {
  document.documentElement.dataset.vtDir = direction;
  setVtActive();
  
  
  
  
  
  const doc = document as unknown as { startViewTransition: StartViewTransition };
  const vt = doc.startViewTransition(() => {
    if (applyNav) applyNav();
    return new Promise<void>((res) => {
      pendingResolve = res;
      
      
      safetyTimer = setTimeout(() => { res(); pendingResolve = null; }, 500);
    });
  });
  vt.finished.finally(() => {
    clearVtActive();
    if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
    pendingResolve = null;
  });
}




export function runForwardTransition(applyNav: () => void): void {
  if (!supportsViewTransitions() || prefersReducedMotion()) { applyNav(); return; }
  try { begin('forward', applyNav); }
  catch { try { clearVtActive(); } catch {  } applyNav(); }
}



export function runBackForwardTransition(): void {
  if (!supportsViewTransitions() || prefersReducedMotion()) return;
  try { begin('back'); }
  catch { try { clearVtActive(); } catch {  }  }
}


export function resolvePageCommit(): void {
  if (!pendingResolve) return;
  const r = pendingResolve;
  pendingResolve = null;
  if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
  r();
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
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch {  }
}
