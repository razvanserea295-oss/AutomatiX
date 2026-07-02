// Neutralize seeded/default credentials so a released or licensed instance is
// never reachable with a publicly-known password.
//
// Two shapes of default credential exist in the seed history:
//   1. The id=1 admin on the Argon2id hash of "1234" (migrations/001).
//   2. Bulk demo/sample users that all share ONE seeded password hash (the demo
//      reseed creates ~10 such accounts). Two accounts can only share an Argon2
//      hash if seeded identically — real passwords get a random per-user salt —
//      so a group of identical hashes is, by construction, a default credential.
//
// must_change_password (migrations 078/099/108, now also enforced server-side)
// only *flags* these; a flag doesn't stop someone who knows the default from
// logging in and changing the password first. So at boot we INVALIDATE them:
//   • the factory admin (hash == the "1234" literal) → rotated to a strong
//     RANDOM password, printed once to the server console, must_change_password=1;
//   • non-admin accounts in a large shared-hash group (>= SHARED_MIN) or on the
//     legacy "Promix2024!" hash → DEACTIVATED (sample logins; the data they own
//     stays intact, re-enable + set a real password from Sistem → Utilizatori).
//
// Admin-role accounts are NEVER auto-deactivated (no lockout) and are not touched
// by the shared-hash rule beyond a loud warning — so real admins (e.g. created
// by the operator) are safe. Idempotent: after rotation/deactivation nothing
// matches, so re-running is a no-op.
//
// Escape hatches: PROMIX_DEMO=1 (showcase keeps its seeded creds) and
// PROMIX_ALLOW_DEFAULT_CREDS=1 (explicit opt-out for local dev/testing).

import type { Database } from 'sql.js';
import crypto from 'crypto';
import { hashPassword } from '../electron/security/password';

const FACTORY_ADMIN_1234 =
  '$argon2id$v=19$m=19456,t=2,p=1$EK6meEuFaNQD4sZJmbfAiA$sFxmzCJQaYWHnsvidB3y/AKF46XJ0n1KhcoJ7NJoZnk';
const FACTORY_DEMO_PROMIX2024 =
  '$argon2id$v=19$m=19456,t=2,p=1$t/+1SCI6YLJRSCufCaYbgw$qHxwAnu1P3SpJ7cPfxtUD8rS5Kx2xIc79OJz2WVew+o';

// A hash shared by this many active users is treated as a bulk seed default.
// >=3 avoids ever touching a coincidental real pair while catching demo seeds.
const SHARED_MIN = 3;

function randomPassword(): string {
  return crypto.randomBytes(16).toString('base64').replace(/[+/=]/g, '').slice(0, 18) + 'A9';
}

type Row = { id: number; username: string; role: string; hash: string };

function activeUsers(db: Database): Row[] {
  const stmt = db.prepare(
    `SELECT u.id, u.username, r.name AS role, u.password_hash AS hash
       FROM users u LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.active = 1`,
  );
  try {
    const out: Row[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      out.push({ id: Number(r.id), username: String(r.username), role: String(r.role || '').toLowerCase(), hash: String(r.hash || '') });
    }
    return out;
  } finally {
    stmt.free();
  }
}

export async function neutralizeFactoryCredentials(db: Database, save: () => void): Promise<void> {
  if (process.env.PROMIX_DEMO === '1') return; // demo showcase intentionally keeps seeded creds

  let users: Row[];
  try { users = activeUsers(db); } catch { return; } // users table not ready
  if (users.length === 0) return;

  // Count active users per hash to spot bulk shared-password seed groups.
  const perHash = new Map<string, number>();
  for (const u of users) perHash.set(u.hash, (perHash.get(u.hash) || 0) + 1);

  const isDefaultCred = (u: Row) =>
    u.hash === FACTORY_DEMO_PROMIX2024 || (perHash.get(u.hash) || 0) >= SHARED_MIN;

  const toRotate: Row[] = [];      // admins we keep usable but force off the default
  const toDeactivate: Row[] = [];  // non-admin sample logins
  const adminsOnSharedDefault: Row[] = [];

  for (const u of users) {
    if (u.hash === FACTORY_ADMIN_1234) { toRotate.push(u); continue; } // canonical factory admin
    if (!isDefaultCred(u)) continue;
    if (u.role === 'admin') { adminsOnSharedDefault.push(u); continue; } // never auto-disable an admin
    toDeactivate.push(u);
  }

  if (toRotate.length === 0 && toDeactivate.length === 0 && adminsOnSharedDefault.length === 0) return;

  if (process.env.PROMIX_ALLOW_DEFAULT_CREDS === '1') {
    const all = [...toRotate, ...toDeactivate, ...adminsOnSharedDefault].map((u) => u.username);
    console.warn(`\n[security] ⚠  ${all.length} account(s) still use seeded/default passwords (${all.join(', ')}). ` +
      `Left as-is because PROMIX_ALLOW_DEFAULT_CREDS=1. NEVER set this in production.\n`);
    return;
  }

  const rotated: Array<{ username: string; password: string }> = [];
  for (const u of toRotate) {
    const pw = randomPassword();
    db.run('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?', [await hashPassword(pw), u.id]);
    rotated.push({ username: u.username, password: pw });
  }
  for (const u of toDeactivate) db.run('UPDATE users SET active = 0 WHERE id = ?', [u.id]);
  try { save(); } catch { /* the debounced save will catch it */ }

  console.warn('\n========================================================');
  console.warn('[security] Seeded/default credentials neutralized.');
  if (toDeactivate.length > 0) {
    console.warn(`  • ${toDeactivate.length} demo/sample account(s) DEACTIVATED (shared default password):`);
    console.warn(`    ${toDeactivate.map((u) => u.username).join(', ')}`);
    console.warn('    Re-enable + set a real password from Sistem → Utilizatori if needed.');
  }
  for (const r of rotated) {
    console.warn(`  • Admin "${r.username}" password was reset. Log in with:`);
    console.warn(`\n        ${r.password}\n`);
    console.warn('    You must change it immediately on first login.');
  }
  if (adminsOnSharedDefault.length > 0) {
    console.warn(`  • ⚠  ${adminsOnSharedDefault.length} ADMIN account(s) appear to share a default password ` +
      `(${adminsOnSharedDefault.map((u) => u.username).join(', ')}) — not auto-disabled to avoid lockout. ` +
      'Change their passwords now.');
  }
  console.warn('  Set PROMIX_ALLOW_DEFAULT_CREDS=1 only for local dev to skip this.');
  console.warn('========================================================\n');
}
