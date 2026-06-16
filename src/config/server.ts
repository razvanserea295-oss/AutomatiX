import { STORAGE_KEYS, getStorage, setStorage, removeStorage } from './localStorage';

const BUILD_DEFAULT_SERVER_URL: string = (import.meta.env.VITE_DEFAULT_SERVER_URL || '').trim().replace(/\/+$/, '');












/** True in a plain browser tab (not Electron/Tauri desktop). Multi-tenant
 *  path-prefix routing + the login broker only apply here. */
export function isBrowserWeb(): boolean {
  const w = window as unknown as {
    electron?: unknown; location?: Location;
    __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown;
  };
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in w || '__TAURI__' in w);
  return typeof window !== 'undefined'
    && !('electron' in w) && !isTauri
    && !!w.location && (w.location.protocol === 'http:' || w.location.protocol === 'https:');
}

export function getServerUrl(): string {
  
  
  
  
  
  
  const w = window as unknown as {
    electron?: unknown; location?: Location;
    __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown;
  };
  const isTauri =
    typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in w || '__TAURI__' in w);
  const isBrowserWeb =
    typeof window !== 'undefined' &&
    !('electron' in w) &&
    !isTauri &&
    w.location &&
    (w.location.protocol === 'http:' || w.location.protocol === 'https:');

  if (isBrowserWeb) {
    // Multi-tenant: when a firm was chosen in the pre-login chooser, route the
    // whole app to that tenant via a same-origin path prefix /t/<slug> (the prod
    // server reverse-proxies it to the right tenant backend). No subdomain, so
    // everything stays same-origin (CSP/CORS unchanged). All ~30 call sites that
    // build `${getServerUrl()}/api/...` become tenant-aware from this one line.
    const slug = getStorage(STORAGE_KEYS.TENANT_SLUG);
    return slug ? `${w.location!.origin}/t/${slug}` : w.location!.origin;
  }

  const stored = getStorage(STORAGE_KEYS.SERVER_URL) || BUILD_DEFAULT_SERVER_URL;
  return stored || '';
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
