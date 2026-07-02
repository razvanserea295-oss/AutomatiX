// Desktop thin-client auto-reload.
//
// The Tauri desktop shell (.dmg/.exe) loads the LIVE SPA from the production
// server instead of a bundled copy. This module polls the server's build
// fingerprint (`buildId` from /api/health, which changes whenever any frontend
// asset is redeployed) and reloads the window when it changes — so desktop users
// pick up new code "instantly", and the reload only re-downloads Vite's changed
// content-hashed chunks (the "differences"), not the whole app.
//
// Gated to the desktop shell via its custom User-Agent (set on the Tauri window)
// so ordinary browser tabs are NEVER force-reloaded out from under the user.

const DESKTOP_UA_MARK = 'AutomatixDesktop';
const POLL_MS = 30_000;

function isDesktopShell(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes(DESKTOP_UA_MARK);
}

export function startDesktopAutoReload(): void {
  if (typeof window === 'undefined' || !isDesktopShell()) return;

  let known: string | null = null;
  const origin = window.location.origin;

  const tick = async (): Promise<void> => {
    try {
      const res = await fetch(`${origin}/api/health`, { cache: 'no-store' });
      if (!res.ok) return;
      const h = (await res.json()) as { buildId?: string; version?: string };
      const id = h.buildId || h.version;
      if (!id) return;
      if (known && id !== known) {
        // A new frontend was deployed — reload to pick it up. The browser engine
        // refetches only the changed Vite chunks (unchanged ones stay cached).
        window.location.reload();
        return;
      }
      known = id;
    } catch {
      /* server momentarily unreachable — try again next tick */
    }
  };

  void tick();
  const timer = window.setInterval(() => void tick(), POLL_MS);
  window.addEventListener('beforeunload', () => window.clearInterval(timer));
}
