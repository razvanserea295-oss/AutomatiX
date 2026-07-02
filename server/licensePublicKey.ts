// Automatix license PUBLIC key (Ed25519, SPKI PEM).
//
// This is NOT a secret — it is safe to ship inside the server, the desktop app
// and the marketing site. It is the counterpart of the PRIVATE key that lives
// ONLY in the standalone generator (tools/license-generator/.keys/) and signs
// every license. Anyone holding this public key can VERIFY a license offline
// but cannot MINT one.
//
// To (re)generate the pair, run once on the owner's machine:
//     node tools/license-generator/init-keys.mjs
// then paste the printed PUBLIC pem here AND in src/shared/license.ts so the
// server, the desktop frontend and the landing page all trust the same signer.
//
// An env override (AUTOMATIX_LICENSE_PUBKEY) is honoured first so the key can be
// rotated without a rebuild. If neither the env nor the constant holds a real
// key, verification fails CLOSED (every license is rejected) — never open.

export const LICENSE_PUBLIC_KEY_PEM: string =
  process.env.AUTOMATIX_LICENSE_PUBKEY ||
  `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAq7pqNFTN6pyirVavqow/MNCcE1trcDno05klMTjF7gY=
-----END PUBLIC KEY-----`;

export function hasRealPublicKey(): boolean {
  return !LICENSE_PUBLIC_KEY_PEM.includes('PLACEHOLDER_RUN_init-keys');
}
