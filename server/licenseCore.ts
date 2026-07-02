// Automatix license core — OFFLINE Ed25519 verification (Node / server side).
//
// A license key is a SELF-CONTAINED signed token:
//
//     AX1.<base64url(payloadJSON)>.<base64url(ed25519-signature)>
//
// The signature is computed over the EXACT payload-JSON bytes embedded in the
// token (segment 1, base64url-decoded). The verifier never re-serializes the
// payload — it verifies the literal decoded bytes — so signer and verifier can
// never drift apart over key ordering or whitespace.
//
// This module only VERIFIES. The PRIVATE key lives ONLY in the standalone
// generator (tools/license-generator/) which is the sole minting authority.
//
// Validity of a license = signature valid AND license_id not revoked. Revocation
// is a separate DB/CRL concern handled by server/license.ts. By product
// decision there is NO expiry, NO device limit and NO tiers — a license is
// simply bound to a company (name / email / CUI).
//
// The token format, canonicalization and public key MUST stay byte-identical
// with tools/license-generator/lib.mjs and src/shared/license.ts.

import crypto from 'crypto';
import { LICENSE_PUBLIC_KEY_PEM } from './licensePublicKey';

export interface LicensePayload {
  v: 1;
  license_id: string;
  company_name: string;
  email: string;
  cui: string;
  issued_at: string; // ISO-8601
}

export interface VerifyResult {
  ok: boolean;
  reason?: 'format' | 'signature' | 'payload' | 'nokey' | 'error';
  payload?: LicensePayload;
}

const TOKEN_PREFIX = 'AX1';

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Canonical payload serialization. Exported for tests and parity checks; the
 * generator (lib.mjs) inlines the SAME field order. The verifier itself does
 * NOT call this — it verifies the embedded bytes directly (see above).
 */
export function canonicalizePayload(p: LicensePayload): string {
  return JSON.stringify({
    v: p.v,
    license_id: p.license_id,
    company_name: p.company_name,
    email: p.email,
    cui: p.cui,
    issued_at: p.issued_at,
  });
}

/**
 * Sign a license payload into a token. Used by the IN-APP generator (Settings →
 * Licențe) which holds the private key on the server. Produces the EXACT same
 * format the standalone CLI does (canonical payload bytes → Ed25519 → token), so
 * keys from either path verify identically.
 */
export function signLicenseToken(payload: LicensePayload, privateKeyPem: string): string {
  const bytes = Buffer.from(canonicalizePayload(payload), 'utf8');
  const sig = crypto.sign(null, bytes, crypto.createPrivateKey(privateKeyPem));
  return `${TOKEN_PREFIX}.${b64urlEncode(bytes)}.${b64urlEncode(sig)}`;
}

/** Verify a license token's signature and shape. Pure — no DB, no revocation. */
export function verifyLicenseToken(
  token: string,
  publicKeyPem: string = LICENSE_PUBLIC_KEY_PEM,
): VerifyResult {
  try {
    if (publicKeyPem.includes('PLACEHOLDER_RUN_init-keys')) {
      return { ok: false, reason: 'nokey' };
    }
    const raw = String(token || '').trim().replace(/\s+/g, '');
    const parts = raw.split('.');
    if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
      return { ok: false, reason: 'format' };
    }
    const payloadBytes = b64urlDecode(parts[1]);
    const sig = b64urlDecode(parts[2]);
    if (sig.length !== 64) return { ok: false, reason: 'signature' };

    const pub = crypto.createPublicKey(publicKeyPem);
    const valid = crypto.verify(null, payloadBytes, pub, sig);
    if (!valid) return { ok: false, reason: 'signature' };

    let parsed: unknown;
    try { parsed = JSON.parse(payloadBytes.toString('utf8')); }
    catch { return { ok: false, reason: 'payload' }; }

    const p = parsed as Partial<LicensePayload>;
    if (!p || p.v !== 1 || !p.license_id || !p.company_name) {
      return { ok: false, reason: 'payload' };
    }
    return { ok: true, payload: parsed as LicensePayload };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

// ── Signed revocation list (CRL) ────────────────────────────────────────────
// The generator emits a DETACHED-signed CRL (revoke.mjs). The server verifies
// the signature against the same public key before trusting an imported list,
// so a revocation can't be spoofed even if mirrored over plain HTTP.

export interface CrlEntry { license_id: string; revoked_at: string; reason?: string }
export interface SignedCrl { generated_at: string; revoked: CrlEntry[]; sig: string }

/** Canonical CRL body — MUST match lib.mjs canonicalizeCrlBody byte-for-byte. */
export function canonicalizeCrlBody(generated_at: string, revoked: CrlEntry[]): string {
  return JSON.stringify({
    generated_at,
    revoked: revoked.map((r) => ({
      license_id: r.license_id,
      revoked_at: r.revoked_at,
      reason: r.reason ?? '',
    })),
  });
}

export function verifyCrl(crl: SignedCrl, publicKeyPem: string = LICENSE_PUBLIC_KEY_PEM): boolean {
  try {
    if (publicKeyPem.includes('PLACEHOLDER_RUN_init-keys')) return false;
    if (!crl || !Array.isArray(crl.revoked) || typeof crl.sig !== 'string') return false;
    const body = Buffer.from(canonicalizeCrlBody(crl.generated_at, crl.revoked), 'utf8');
    const pub = crypto.createPublicKey(publicKeyPem);
    return crypto.verify(null, body, pub, b64urlDecode(crl.sig));
  } catch {
    return false;
  }
}

// Re-exported only so a quick parity test can round-trip without a second impl.
export const __testOnly = { b64urlEncode, b64urlDecode, TOKEN_PREFIX };
