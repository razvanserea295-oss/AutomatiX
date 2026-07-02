// Automatix license generator — shared crypto helpers (Node ESM, no deps).
//
// This is the ONLY place that signs licenses. It holds the PRIVATE key (in
// .keys/, never committed). The token format, canonicalization and the public
// key it produces MUST stay byte-identical with:
//     server/licenseCore.ts   (Node verify)
//     src/shared/license.ts    (browser verify)
//
// Token format: AX1.<base64url(payloadJSON)>.<base64url(ed25519-signature)>
// The signature is over the EXACT payload-JSON bytes embedded in the token.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const TOKEN_PREFIX = 'AX1';
export const KEYS_DIR = path.join(HERE, '.keys');
export const OUT_DIR = path.join(HERE, 'out');
export const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'ed25519-private.pem');
export const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'ed25519-public.pem');
export const REGISTRY_PATH = path.join(HERE, 'registry.json');
export const CRL_PATH = path.join(OUT_DIR, 'revocations.json');

export function b64urlEncode(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// Canonical payload — keep field order identical to server/licenseCore.ts.
export function canonicalizePayload(p) {
  return JSON.stringify({
    v: p.v,
    license_id: p.license_id,
    company_name: p.company_name,
    email: p.email,
    cui: p.cui,
    issued_at: p.issued_at,
  });
}

// Canonical CRL body — keep identical to server/licenseCore.ts.
export function canonicalizeCrlBody(generated_at, revoked) {
  return JSON.stringify({
    generated_at,
    revoked: revoked.map((r) => ({
      license_id: r.license_id,
      revoked_at: r.revoked_at,
      reason: r.reason ?? '',
    })),
  });
}

export function ensureDirs() {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

export function loadPrivateKey() {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    throw new Error(
      `Cheia privată lipsește (${PRIVATE_KEY_PATH}).\n` +
      `Rulează mai întâi: node init-keys.mjs`,
    );
  }
  return crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'));
}

export function signLicense(payload, privateKey) {
  const bytes = Buffer.from(canonicalizePayload(payload), 'utf8');
  const sig = crypto.sign(null, bytes, privateKey);
  return `${TOKEN_PREFIX}.${b64urlEncode(bytes)}.${b64urlEncode(sig)}`;
}

export function signCrl(generated_at, revoked, privateKey) {
  const body = Buffer.from(canonicalizeCrlBody(generated_at, revoked), 'utf8');
  const sig = crypto.sign(null, body, privateKey);
  return { generated_at, revoked, sig: b64urlEncode(sig) };
}

export function readRegistry() {
  try { return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')); }
  catch { return { issued: [], revoked: [] }; }
}

export function writeRegistry(reg) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2));
}

export function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
