const STORAGE_KEY = 'promix:interface';

export type InterfaceMode = 'v2' | 'classic';

export function getInterfaceMode(): InterfaceMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'v2') return 'v2';
    if (v === 'classic') return 'classic';
  } catch { /* ignore */ }
  return 'classic';
}

export function setInterfaceMode(mode: InterfaceMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch { /* ignore */ }
  applyInterfaceMode(mode);
}

/** Set html[data-interface] before first paint so the correct token set loads. */
export function applyInterfaceMode(mode?: InterfaceMode): void {
  if (typeof document === 'undefined') return;
  const resolved = mode ?? getInterfaceMode();
  document.documentElement.dataset.interface = resolved;
}

/** Redirect bare #/ or legacy #/page paths to #/v2 when in v2 mode */
export function ensureDefaultV2Route(): void {
  if (typeof window === 'undefined') return;
  if (getInterfaceMode() !== 'v2') return;

  const hash = window.location.hash || '#/';
  if (hash === '#' || hash === '#/') {
    window.location.replace('#/v2');
    return;
  }

  // Legacy bookmark #/dashboard → #/v2/dashboard
  if (hash.startsWith('#/') && !hash.startsWith('#/v2')) {
    const legacy = hash.slice(1);
    if (!legacy.startsWith('/portal/') && !legacy.startsWith('/rfq/') && legacy !== '/download' && !legacy.startsWith('/support/q/')) {
      window.location.replace(`#/v2${legacy}`);
    }
  }
}
