















type StartViewTransition = (cb: () => void | Promise<void>) => { finished: Promise<void> };

export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' &&
    typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition === 'function';
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}




export function startMorphTransition(update: () => void, opts?: { dir?: 'forward' | 'back' }): void {
  if (!supportsViewTransitions() || prefersReducedMotion()) { update(); return; }
  if (opts?.dir) document.documentElement.dataset.vtDir = opts.dir;
  try {
    const doc = document as unknown as { startViewTransition: StartViewTransition };
    const vt = doc.startViewTransition(() => { update(); });
    vt.finished.finally(() => { delete document.documentElement.dataset.vtDir; });
  } catch {
    delete document.documentElement.dataset.vtDir;
    update();
  }
}


export function vtName(prefix: string, id: string | number): string {
  return `${prefix}-${String(id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
}
