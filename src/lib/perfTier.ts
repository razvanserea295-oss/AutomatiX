















export type PerfTier = 'low' | 'medium' | 'high';

const STORAGE_KEY = 'promix_perf_tier';
const TIERS: readonly PerfTier[] = ['low', 'medium', 'high'];

function isTier(v: unknown): v is PerfTier {
  return typeof v === 'string' && (TIERS as readonly string[]).includes(v);
}

export function getPerfTier(): PerfTier {
  const t = document.documentElement.dataset.perfTier;
  return isTier(t) ? t : 'high';
}

export function setPerfTier(tier: PerfTier, opts?: { persist?: boolean }): void {
  document.documentElement.dataset.perfTier = tier;
  if (opts?.persist) {
    try { localStorage.setItem(STORAGE_KEY, tier); } catch {  }
  }
}


function detectTier(): PerfTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 8;      
  const cores = nav.hardwareConcurrency ?? 8;
  if (mem <= 4 || cores <= 4) return 'low';
  if (mem <= 6 || cores <= 6) return 'medium';
  return 'high';
}





function scheduleFrameProbe(): void {
  const start = () => {
    let frames = 0;
    let t0 = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - t0 < 1000) { requestAnimationFrame(tick); return; }
      const fps = (frames * 1000) / (now - t0);
      const current = getPerfTier();
      if (fps < 28 && current !== 'low') setPerfTier('low');
      else if (fps < 50 && current === 'high') setPerfTier('medium');
    };
    requestAnimationFrame(tick);
  };
  
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void })
      .requestIdleCallback(start, { timeout: 4000 });
  } else {
    setTimeout(start, 3000);
  }
}

export function initPerfTier(): void {
  let stored: string | null = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch {  }

  if (isTier(stored)) {
    setPerfTier(stored);
    return; 
  }
  
  if (isTier(document.documentElement.dataset.perfTier)) return;

  setPerfTier(detectTier());
  scheduleFrameProbe();
}
