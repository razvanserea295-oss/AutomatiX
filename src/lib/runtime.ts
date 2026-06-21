type RuntimeWindow = Window & {
  electron?: unknown;
  __TAURI_INTERNALS__?: unknown;
  __TAURI__?: unknown;
};

export function getRuntimeWindow(): RuntimeWindow | null {
  return typeof window === 'undefined' ? null : (window as RuntimeWindow);
}

export function isElectronRuntime(): boolean {
  const w = getRuntimeWindow();
  return !!w && 'electron' in w;
}

export function isTauriRuntime(): boolean {
  const w = getRuntimeWindow();
  return !!w && ('__TAURI_INTERNALS__' in w || '__TAURI__' in w);
}

export function isDesktopRuntime(): boolean {
  return isElectronRuntime() || isTauriRuntime();
}

export function isBrowserWebRuntime(): boolean {
  const w = getRuntimeWindow();
  return !!w
    && !isDesktopRuntime()
    && (w.location.protocol === 'http:' || w.location.protocol === 'https:');
}
