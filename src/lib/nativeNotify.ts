















const TOGGLE_KEY = 'promix_native_notifications';

export type NotifyLevel = 'info' | 'success' | 'warning' | 'error';


export function nativeNotificationsAvailable(): boolean {
  return typeof window !== 'undefined' && 'electron' in window;
}







export function nativeNotificationsEnabled(): boolean {
  try {
    const v = localStorage.getItem(TOGGLE_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {  }
  return !prefersReducedMotion();
}


export function setNativeNotificationsEnabled(on: boolean): void {
  try { localStorage.setItem(TOGGLE_KEY, on ? '1' : '0'); } catch {  }
}

function prefersReducedMotion(): boolean {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true; }
  catch { return false; }
}





export function nativeNotify(opts: { title: string; body?: string; level?: NotifyLevel }): void {
  if (!nativeNotificationsAvailable()) return;
  if (!nativeNotificationsEnabled()) return; 
  try {
    const w = window as unknown as {
      electron?: {
        notify?: (o: { title: string; body?: string; level?: NotifyLevel }) => Promise<unknown>;
        invoke?: (cmd: string, args?: unknown) => Promise<unknown>;
      };
    };
    const bridge = w.electron;
    if (bridge?.notify) { void bridge.notify(opts).catch(() => {}); return; }
    
    void bridge?.invoke?.('notify', opts).catch?.(() => {});
  } catch {  }
}
