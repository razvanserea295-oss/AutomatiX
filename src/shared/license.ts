// Browser-side license verification (WebCrypto, Ed25519).
//
// This is a UX-only pre-check: it lets the marketing landing and the desktop
// activation screen tell the user "key looks valid / invalid" instantly. The
// SERVER (/api/license/verify, /api/download/authorize, the login gate) is the
// authoritative boundary — never trust this in isolation.
//
// Same token format as server/licenseCore.ts and tools/license-generator/lib.mjs:
//     AX1.<base64url(payloadJSON)>.<base64url(ed25519-signature)>
//
// Keep LICENSE_PUBLIC_KEY_PEM identical to server/licensePublicKey.ts. When
// WebCrypto Ed25519 is unavailable (older engine), verify resolves to
// { ok:false, reason:'unsupported' } and callers should defer to the server.

export const LICENSE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAq7pqNFTN6pyirVavqow/MNCcE1trcDno05klMTjF7gY=
-----END PUBLIC KEY-----`;

export interface LicensePayload {
  v: 1;
  license_id: string;
  company_name: string;
  email: string;
  cui: string;
  issued_at: string;
}

export type BrowserVerify =
  | { ok: true; payload: LicensePayload }
  | { ok: false; reason: 'format' | 'signature' | 'payload' | 'unsupported' };

function b64urlToBytes(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pemToDer(pem: string): Uint8Array {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let keyPromise: Promise<CryptoKey> | null = null;
async function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      'spki',
      pemToDer(LICENSE_PUBLIC_KEY_PEM) as BufferSource,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
  }
  return keyPromise;
}

/** Decode the (untrusted) payload of a token without checking the signature. */
export function parseLicensePayload(token: string): LicensePayload | null {
  try {
    const parts = token.trim().replace(/\s+/g, '').split('.');
    if (parts.length !== 3 || parts[0] !== 'AX1') return null;
    const json = new TextDecoder().decode(b64urlToBytes(parts[1]));
    const p = JSON.parse(json);
    if (!p || p.v !== 1 || !p.license_id) return null;
    return p as LicensePayload;
  } catch {
    return null;
  }
}

/** Verify a token's Ed25519 signature in the browser. UX-only. */
export async function verifyLicenseBrowser(token: string): Promise<BrowserVerify> {
  try {
    const raw = String(token || '').trim().replace(/\s+/g, '');
    const parts = raw.split('.');
    if (parts.length !== 3 || parts[0] !== 'AX1') return { ok: false, reason: 'format' };
    const payload = b64urlToBytes(parts[1]);
    const sig = b64urlToBytes(parts[2]);
    const key = await getKey();
    const ok = await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      sig as BufferSource,
      payload as BufferSource,
    );
    if (!ok) return { ok: false, reason: 'signature' };
    const p = parseLicensePayload(raw);
    if (!p) return { ok: false, reason: 'payload' };
    return { ok: true, payload: p };
  } catch {
    return { ok: false, reason: 'unsupported' };
  }
}
