import { getServerUrl } from '@/config/server';
import { getStorage, STORAGE_KEYS } from '@/config/localStorage';

interface AuthorizeResponse {
  ok?: boolean;
  url?: string;
  version?: string;
  size?: number;
  error?: string;
}

/** Append session token so GET /downloads/* works without Authorization header. */
function withSessionToken(url: string): string {
  const token = getStorage(STORAGE_KEYS.TOKEN);
  if (!token) return url;
  try {
    const u = new URL(url, window.location.origin);
    if (!u.searchParams.has('token')) {
      u.searchParams.set('token', token);
    }
    return u.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}token=${encodeURIComponent(token)}`;
  }
}

/** Start a file download without navigating away from the SPA shell. */
export function triggerInstallerFileDownload(url: string): void {
  const a = document.createElement('a');
  a.href = withSessionToken(url);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Target platform for an installer download. */
export type InstallerPlatform = 'windows' | 'mac' | 'linux';

/** Exchange session or license key for a single-use installer download URL (?dlt=). */
export async function authorizeInstallerDownload(
  licenseKey?: string,
  platform?: InstallerPlatform,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const base = getServerUrl();
  const token = getStorage(STORAGE_KEYS.TOKEN);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const body: Record<string, string> = {};
  const key = licenseKey?.trim();
  if (key) body.key = key;
  if (platform) body.platform = platform;

  const r = await fetch(`${base}/api/download/authorize`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const d = (await r.json()) as AuthorizeResponse;
  if (r.ok && d.ok && d.url) {
    const absolute = d.url.startsWith('http') ? d.url : `${base}${d.url}`;
    return { ok: true, url: absolute };
  }
  return { ok: false, error: d.error || 'unauthorized' };
}

export function installerDownloadErrorMessage(error?: string): string {
  switch (error) {
    case 'revoked':
      return 'Licență revocată. Contactează furnizorul.';
    case 'no_build':
      return 'Installer indisponibil momentan.';
    case 'unauthorized':
      return 'Nu ai permisiunea de a descărca installer-ul. Autentifică-te sau introdu o cheie de licență validă.';
    default:
      return 'Descărcarea nu a putut fi autorizată.';
  }
}
