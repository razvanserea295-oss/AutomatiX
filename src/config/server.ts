import { STORAGE_KEYS, getStorage, setStorage, removeStorage } from './localStorage';
import { getRuntimeWindow, isBrowserWebRuntime } from '@/lib/runtime';

const BUILD_DEFAULT_SERVER_URL: string = (import.meta.env.VITE_DEFAULT_SERVER_URL || 'https://app.automatix.online').trim().replace(/\/+$/, '');

// Raw backend base (no /t/<slug> suffix): the in-app override or the build default.
function rawServerBase(): string {
  const stored = getStorage(STORAGE_KEYS.SERVER_URL) || BUILD_DEFAULT_SERVER_URL;
  return stored || '';
}

// A base counts as "remote cloud" when it's an https host that isn't loopback —
// i.e. app.automatix.online, not a localhost/LAN dev server. Cloud clients use
// the login broker + /t/<slug> tenant routing (multi-tenant), exactly like the
// browser web app; a desktop pointed at a loopback/http server stays in the
// classic single-server (direct login) mode.
function isRemoteCloudBase(base: string): boolean {
  if (!base) return false;
  try {
    const u = new URL(base);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    return h !== 'localhost' && h !== '127.0.0.1' && h !== '::1';
  } catch { return false; }
}

/** True for the browser web app OR a desktop shell pointed at the remote cloud.
 *  Both go through the login broker and per-tenant /t/<slug> routing. */
export function isCloudClient(): boolean {
  if (isBrowserWebRuntime()) return true;
  return isRemoteCloudBase(rawServerBase());
}

/** Server ORIGIN without any /t/<slug> suffix — where the login broker lives.
 *  Web → the page origin; desktop → the configured/default backend base. */
export function getServerOrigin(): string {
  const w = getRuntimeWindow();
  if (isBrowserWebRuntime() && w) return w.location.origin;
  return rawServerBase();
}












/** True in a plain browser tab (not Electron/Tauri desktop). Multi-tenant
 *  path-prefix routing + the login broker only apply here. */
export function isBrowserWeb(): boolean {
  return isBrowserWebRuntime();
}

export function getServerUrl(): string {
  
  
  
  
  
  
  const w = getRuntimeWindow();

  if (isBrowserWebRuntime() && w) {
    // Multi-tenant: when a firm was chosen in the pre-login chooser, route the
    // whole app to that tenant via a same-origin path prefix /t/<slug> (the prod
    // server reverse-proxies it to the right tenant backend). No subdomain, so
    // everything stays same-origin (CSP/CORS unchanged). All ~30 call sites that
    // build `${getServerUrl()}/api/...` become tenant-aware from this one line.
    const slug = getStorage(STORAGE_KEYS.TENANT_SLUG);
    return slug ? `${w.location.origin}/t/${slug}` : w.location.origin;
  }

  // Desktop / configured-server mode. A desktop pointed at the remote cloud gets
  // the SAME per-tenant /t/<slug> routing once the broker resolves the firm, so
  // it behaves exactly like the web client; a loopback/LAN server does not.
  const base = rawServerBase();
  if (isRemoteCloudBase(base)) {
    const slug = getStorage(STORAGE_KEYS.TENANT_SLUG);
    return slug ? `${base}/t/${slug}` : base;
  }
  return base;
}


export function isDefaultServerUrl(): boolean {
  return !getStorage(STORAGE_KEYS.SERVER_URL) && BUILD_DEFAULT_SERVER_URL.length > 0;
}




export async function isServerReachable(url?: string): Promise<boolean> {
  const serverUrl = url || getServerUrl();
  if (!serverUrl) return false;
  try {
    const res = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
}




export function setServerUrl(url: string): void {
  const trimmed = url.trim().replace(/\/+$/, ''); 
  if (trimmed) {
    setStorage(STORAGE_KEYS.SERVER_URL, trimmed);
  } else {
    removeStorage(STORAGE_KEYS.SERVER_URL);
  }
}




export function isServerMode(): boolean {
  return getServerUrl().length > 0;
}





export async function testServerConnection(url?: string): Promise<{ ok: boolean; message: string }> {
  const serverUrl = url ?? getServerUrl();
  if (!serverUrl) {
    return { ok: false, message: 'URL server neconfigurat' };
  }
  try {
    const res = await fetch(`${serverUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { ok: true, message: 'Conectat' };
    }
    return { ok: false, message: `${serverUrl} a răspuns ${res.status} ${res.statusText}` };
  } catch (e) {
    const reason = e instanceof DOMException && e.name === 'TimeoutError'
      ? 'timeout după 5s — verifică firewall-ul serverului sau IP-ul'
      : e instanceof TypeError
        ? `${serverUrl} nu răspunde — verifică IP-ul, portul (3500), că serverul rulează și că firewall-ul permite conexiunea`
        : e instanceof Error ? e.message : 'eroare necunoscută';
    return { ok: false, message: reason };
  }
}
