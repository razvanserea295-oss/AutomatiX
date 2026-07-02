// License module — verification, activation, revocation and the per-tenant gate.
//
// Endpoints (registered on the host AND on every tenant process):
//   POST /api/license/verify        — stateless: is this key signed + not revoked?
//                                     (used by the landing download gate)
//   GET  /api/license/status/:id    — revocation status of one license
//                                     (polled by the desktop app)
//   GET  /api/license/tenant-state  — is THIS instance licensed? (broker hint)
//   POST /api/license/crl/import    — admin Bearer: import a SIGNED revocation list
// Commands (via /api/cmd, admin-gated):
//   import_license   — verify a key's signature and bind it to this tenant
//   revoke_license   — manual revoke (source='admin')
//   unrevoke_license — undo a manual revoke (cannot undo a CRL entry)
//   list_licenses    — list licenses + revocations on this instance
//   get_license_status — read one license status
//
// The actual access GATE lives in server/index.ts: /api/cmd is blocked (402)
// while instanceLicensed() is false, except for the ACTIVATION_ALLOWLIST below —
// so an admin can log in and activate, but nothing else runs until licensed.
// Because every firm runs its own process + promix.db, this is per-tenant for
// free: instanceLicensed() reads the current process's DB.

import type { Express, Request, Response } from 'express';
import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { getDb, saveDatabase } from './db';
import { ipcRegister } from '../electron/commands/registry';
import { withAdminUser, withAuthenticatedUser } from '../electron/middleware/auth';
import { CommandError } from '../electron/middleware/errors';
import { AuthService } from '../electron/services/authService';
import { verifyLicenseToken, verifyCrl, signLicenseToken, type SignedCrl, type LicensePayload } from './licenseCore';

// ── In-app license issuing (Settings → Licențe) ─────────────────────────────
// Restricted to the configured issuers (Razvan + Vlad) — NOT every admin. The
// allowlist matches the logged-in user's email OR username (case-insensitive).
// Default allowlist = Razvan (username `razvan` + his email) and Vlad (`vlad`).
// Override/extend via AUTOMATIX_LICENSE_ISSUERS (comma-separated emails/usernames).
const LICENSE_ISSUERS = new Set(
  (process.env.AUTOMATIX_LICENSE_ISSUERS || 'admin,razvan,razvanserea295@gmail.com,vlad')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
);
function isLicenseIssuer(user: { email?: string; username?: string } | null | undefined): boolean {
  if (!user || LICENSE_ISSUERS.size === 0) return false;
  const email = String(user.email || '').toLowerCase();
  const uname = String(user.username || '').toLowerCase();
  return (!!email && LICENSE_ISSUERS.has(email)) || (!!uname && LICENSE_ISSUERS.has(uname));
}

// The signing PRIVATE key. Read from env (inline PEM or file path) or the local
// generator keypair on this machine. NEVER bundled in the repo / source archive.
function loadIssuerPrivateKey(): string | null {
  const inline = process.env.AUTOMATIX_LICENSE_PRIVKEY;
  if (inline && inline.includes('PRIVATE KEY')) return inline;
  const candidates = [
    process.env.AUTOMATIX_LICENSE_PRIVKEY_FILE,
    path.join(process.cwd(), 'tools', 'license-generator', '.keys', 'ed25519-private.pem'),
    path.join(process.cwd(), '..', 'tools', 'license-generator', '.keys', 'ed25519-private.pem'),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8'); } catch { /* keep trying */ }
  }
  return null;
}

// Commands allowed BEFORE the instance is licensed (the activation surface).
export const ACTIVATION_ALLOWLIST = new Set<string>([
  'login', 'logout', 'login_verify_2fa', 'change_password', 'validate_session',
  'import_license', 'list_licenses', 'get_license_status',
]);

// ── tiny sql.js helpers ──────────────────────────────────────────────────────
function queryOne(db: Database, sql: string, params: unknown[] = []): Record<string, unknown> | null {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as never);
    return stmt.step() ? (stmt.getAsObject() as Record<string, unknown>) : null;
  } finally {
    stmt.free();
  }
}
function queryAll(db: Database, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  const out: Record<string, unknown>[] = [];
  try {
    stmt.bind(params as never);
    while (stmt.step()) out.push(stmt.getAsObject() as Record<string, unknown>);
    return out;
  } finally {
    stmt.free();
  }
}

function isRevoked(db: Database, licenseId: string): boolean {
  return !!queryOne(db, 'SELECT 1 FROM license_revocations WHERE license_id = ?', [licenseId]);
}

// ── instance-licensed cache (avoid a query on every command) ─────────────────
let _licCache: { ok: boolean; at: number } | null = null;
const LIC_TTL_MS = 8_000;

export function invalidateLicenseCache(): void { _licCache = null; }

export function instanceLicensed(): boolean {
  const now = Date.now();
  if (_licCache && now - _licCache.at < LIC_TTL_MS) return _licCache.ok;
  let ok = false;
  try {
    const db = getDb();
    const row = queryOne(
      db,
      `SELECT 1 FROM licenses l
        WHERE l.status = 'active'
          AND NOT EXISTS (SELECT 1 FROM license_revocations r WHERE r.license_id = l.license_id)
        LIMIT 1`,
    );
    ok = !!row;
  } catch {
    ok = false; // table missing / DB not ready → treat as unlicensed (fail closed)
  }
  _licCache = { ok, at: now };
  return ok;
}

/** Verify a key's signature AND check it isn't revoked on this instance. */
export function assertLicenseUsable(token: string): {
  ok: boolean;
  reason?: string;
  payload?: { license_id: string; company_name: string; cui: string; email: string };
} {
  const res = verifyLicenseToken(token);
  if (!res.ok || !res.payload) return { ok: false, reason: res.reason || 'invalid' };
  try {
    if (isRevoked(getDb(), res.payload.license_id)) return { ok: false, reason: 'revoked' };
  } catch { /* no DB → signature alone is the verdict */ }
  return { ok: true, payload: res.payload };
}

/** Apply a (already signature-verified) CRL into a DB. Returns entries applied. */
function applyCrl(db: Database, crl: SignedCrl): number {
  db.run(`DELETE FROM license_revocations WHERE source = 'crl'`);
  for (const e of crl.revoked) {
    const at = e.revoked_at || new Date().toISOString();
    db.run(
      `INSERT OR REPLACE INTO license_revocations (license_id, revoked_at, reason, source)
       VALUES (?, ?, ?, 'crl')`,
      [e.license_id, at, e.reason || ''],
    );
    db.run(`UPDATE licenses SET status='revoked', revoked_at=?, revoked_reason=? WHERE license_id=?`,
      [at, e.reason || '', e.license_id]);
  }
  saveDatabase();
  invalidateLicenseCache();
  return crl.revoked.length;
}

// Automatic revocation: periodically fetch a SIGNED CRL from PROMIX_CRL_URL and
// import it. This is the "online check" — works for the host, every tenant and
// the embedded desktop server (each pulls when it has internet; offline it keeps
// the last synced list). The signature is verified before anything is applied,
// so the CRL can be served over plain HTTP/CDN without trust concerns. Opt-in:
// no URL → no puller (so dev/local makes no surprise outbound calls).
const CRL_URL = (process.env.PROMIX_CRL_URL || '').trim();
const CRL_INTERVAL_MS = Math.max(5, parseInt(process.env.PROMIX_CRL_INTERVAL_MIN || '360', 10)) * 60_000;

function startCrlPuller(): void {
  if (!CRL_URL) return;
  const pull = async () => {
    try {
      const r = await fetch(CRL_URL, { cache: 'no-store' as RequestCache });
      if (!r.ok) return;
      const crl = await r.json() as SignedCrl;
      if (!verifyCrl(crl)) { console.warn('[license] fetched CRL failed signature check — ignored'); return; }
      const n = applyCrl(getDb(), crl);
      console.log(`[license] CRL synced from ${CRL_URL}: ${n} revocations`);
    } catch { /* offline / unreachable → keep last known list */ }
  };
  // First pull shortly after boot (let the DB settle), then on the interval.
  setTimeout(pull, 15_000).unref?.();
  setInterval(pull, CRL_INTERVAL_MS).unref?.();
}

const licLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: 'Prea multe cereri. Așteaptă un minut.' },
});

export function registerLicense(app: Express): void {
  // ── Stateless verify (landing download gate) ───────────────────────────────
  app.post('/api/license/verify', licLimiter, (req: Request, res: Response) => {
    const token = String(req.body?.token || req.body?.key || '').trim();
    if (!token) { res.status(400).json({ valid: false, reason: 'empty' }); return; }
    const r = assertLicenseUsable(token);
    res.set('Cache-Control', 'no-store');
    if (!r.ok) { res.json({ valid: false, reason: r.reason }); return; }
    res.json({
      valid: true,
      license_id: r.payload!.license_id,
      company_name: r.payload!.company_name,
      cui: r.payload!.cui,
    });
  });

  // ── Revocation status for one license (desktop poll) ───────────────────────
  app.get('/api/license/status/:id', licLimiter, (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    res.set('Cache-Control', 'no-store');
    try {
      const rev = queryOne(getDb(), 'SELECT revoked_at, reason FROM license_revocations WHERE license_id = ?', [id]);
      if (rev) { res.json({ license_id: id, status: 'revoked', revoked_at: rev.revoked_at }); return; }
      const lic = queryOne(getDb(), 'SELECT 1 FROM licenses WHERE license_id = ?', [id]);
      res.json({ license_id: id, status: lic ? 'active' : 'unknown' });
    } catch {
      res.json({ license_id: id, status: 'unknown' });
    }
  });

  // ── Is THIS instance licensed? (broker queries this over loopback) ─────────
  app.get('/api/license/tenant-state', (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    const gate = process.env.PROMIX_LICENSE_GATE === '1' && process.env.PROMIX_DEMO !== '1';
    const licensed = instanceLicensed();
    let company = '';
    if (licensed) {
      try {
        const row = queryOne(
          getDb(),
          `SELECT company_name FROM licenses l
            WHERE l.status='active'
              AND NOT EXISTS (SELECT 1 FROM license_revocations r WHERE r.license_id = l.license_id)
            ORDER BY datetime(created_at) DESC LIMIT 1`,
        );
        company = String(row?.company_name || '');
      } catch { /* ignore */ }
    }
    res.json({ licensed, gate, company_name: company });
  });

  // ── First-run activation BEFORE login (public, unlicensed-only) ────────────
  // The login screen is blocked until this instance is licensed (when the gate
  // is armed). On a brand-new / from-other-sources install there is no session
  // yet, so activation must be possible pre-auth — but ONLY while the instance
  // is still unlicensed. Once licensed, changing the key requires an admin
  // (import_license); this endpoint then refuses, so an already-activated
  // instance can't be hijacked. A valid SIGNED key is required regardless, so an
  // attacker without a real key can do nothing.
  app.post('/api/license/activate', licLimiter, (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    if (instanceLicensed()) { res.status(409).json({ ok: false, error: 'already_licensed' }); return; }
    const token = String(req.body?.token || req.body?.key || req.body?.license_token || '').trim();
    if (!token) { res.status(400).json({ ok: false, error: 'empty' }); return; }
    const r = verifyLicenseToken(token);
    if (!r.ok || !r.payload) {
      res.status(400).json({ ok: false, error: r.reason === 'nokey' ? 'nokey' : 'invalid' });
      return;
    }
    let db: Database;
    try { db = getDb(); } catch { res.status(503).json({ ok: false, error: 'db' }); return; }
    if (isRevoked(db, r.payload.license_id)) { res.status(403).json({ ok: false, error: 'revoked' }); return; }
    const p = r.payload;
    try {
      const existing = queryOne(db, 'SELECT id FROM licenses WHERE license_id = ?', [p.license_id]);
      if (existing) {
        db.run(
          `UPDATE licenses SET company_name=?, email=?, cui=?, issued_at=?, token=?,
             status='active', revoked_at=NULL, revoked_reason=NULL, imported_by='self-activation',
             updated_at=CURRENT_TIMESTAMP WHERE license_id=?`,
          [p.company_name, p.email, p.cui, p.issued_at, token, p.license_id],
        );
      } else {
        db.run(
          `INSERT INTO licenses (license_id, tenant_slug, company_name, email, cui, issued_at, token, status, imported_by)
           VALUES (?, '', ?, ?, ?, ?, ?, 'active', 'self-activation')`,
          [p.license_id, p.company_name, p.email, p.cui, p.issued_at, token],
        );
      }
      saveDatabase();
      invalidateLicenseCache();
    } catch {
      // Almost always the licenses table is missing (migrations not yet applied).
      res.status(500).json({ ok: false, error: 'store', message: 'Instanța nu e migrată complet — repornește serverul.' });
      return;
    }
    console.log(`[license] self-activated for "${p.company_name}" (${p.license_id})`);
    res.json({ ok: true, company_name: p.company_name, license_id: p.license_id });
  });

  // ── Import a SIGNED CRL (admin Bearer) ─────────────────────────────────────
  app.post('/api/license/crl/import', (req: Request, res: Response) => {
    const bearer = req.headers.authorization?.replace('Bearer ', '') || '';
    try {
      const u = AuthService.validateSession(getDb(), bearer) as { role_name?: string } | null;
      if (!u || String(u.role_name || '').toLowerCase() !== 'admin') {
        res.status(403).json({ message: 'necesită admin' }); return;
      }
    } catch { res.status(401).json({ message: 'token invalid' }); return; }

    const crl = req.body as SignedCrl;
    if (!verifyCrl(crl)) { res.status(400).json({ message: 'CRL invalid sau semnătură greșită' }); return; }
    const n = applyCrl(getDb(), crl);
    res.json({ ok: true, imported: n });
  });

  // ── Activate: bind a verified key to this tenant (admin) ───────────────────
  ipcRegister('import_license', async (args: { token?: string; license_token?: string; key?: string; tenant_slug?: string } | undefined) =>
    withAdminUser(args?.token || '', (db, user) => {
      const licenseToken = String(args?.license_token || args?.key || '').trim();
      if (!licenseToken) throw CommandError.badRequest('Cheia de licență lipsește');
      const r = verifyLicenseToken(licenseToken);
      if (!r.ok || !r.payload) {
        throw CommandError.badRequest(
          r.reason === 'nokey'
            ? 'Serverul nu are cheia publică de licență configurată.'
            : 'Cheie de licență invalidă (semnătură greșită).',
        );
      }
      if (isRevoked(db, r.payload.license_id)) {
        throw CommandError.forbidden('Această licență a fost revocată.');
      }
      const p = r.payload;
      const tenant = String(args?.tenant_slug || '').trim();
      const existing = queryOne(db, 'SELECT id FROM licenses WHERE license_id = ?', [p.license_id]);
      if (existing) {
        db.run(
          `UPDATE licenses SET tenant_slug=?, company_name=?, email=?, cui=?, issued_at=?, token=?,
             status='active', revoked_at=NULL, revoked_reason=NULL, imported_by=?, updated_at=CURRENT_TIMESTAMP
           WHERE license_id=?`,
          [tenant, p.company_name, p.email, p.cui, p.issued_at, licenseToken, user.username, p.license_id],
        );
      } else {
        db.run(
          `INSERT INTO licenses (license_id, tenant_slug, company_name, email, cui, issued_at, token, status, imported_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
          [p.license_id, tenant, p.company_name, p.email, p.cui, p.issued_at, licenseToken, user.username],
        );
      }
      invalidateLicenseCache();
      return { ok: true, company_name: p.company_name, license_id: p.license_id };
    }),
  );

  // ── Manual revoke / unrevoke (admin) ───────────────────────────────────────
  ipcRegister('revoke_license', async (args: { token?: string; license_id?: string; reason?: string } | undefined) =>
    withAdminUser(args?.token || '', (db) => {
      const id = String(args?.license_id || '').trim();
      if (!id) throw CommandError.badRequest('license_id lipsește');
      const at = new Date().toISOString();
      db.run(
        `INSERT OR REPLACE INTO license_revocations (license_id, revoked_at, reason, source)
         VALUES (?, ?, ?, 'admin')`,
        [id, at, String(args?.reason || '')],
      );
      db.run(`UPDATE licenses SET status='revoked', revoked_at=?, revoked_reason=? WHERE license_id=?`,
        [at, String(args?.reason || ''), id]);
      invalidateLicenseCache();
      return { ok: true };
    }),
  );

  ipcRegister('unrevoke_license', async (args: { token?: string; license_id?: string } | undefined) =>
    withAdminUser(args?.token || '', (db) => {
      const id = String(args?.license_id || '').trim();
      if (!id) throw CommandError.badRequest('license_id lipsește');
      // Only admin-sourced revocations can be undone; CRL entries are authoritative.
      const crl = queryOne(db, `SELECT 1 FROM license_revocations WHERE license_id=? AND source='crl'`, [id]);
      if (crl) throw CommandError.forbidden('Licență revocată prin CRL — nu poate fi reactivată local.');
      db.run(`DELETE FROM license_revocations WHERE license_id=? AND source='admin'`, [id]);
      db.run(`UPDATE licenses SET status='active', revoked_at=NULL, revoked_reason=NULL WHERE license_id=?`, [id]);
      invalidateLicenseCache();
      return { ok: true };
    }),
  );

  ipcRegister('list_licenses', async (args: { token?: string } | undefined) =>
    withAdminUser(args?.token || '', (db) => {
      const licenses = queryAll(db,
        `SELECT license_id, tenant_slug, company_name, email, cui, issued_at, status,
                revoked_at, revoked_reason, imported_by, created_at
           FROM licenses ORDER BY datetime(created_at) DESC`);
      const revocations = queryAll(db,
        `SELECT license_id, revoked_at, reason, source FROM license_revocations`);
      return { licenses, revocations, licensed: instanceLicensed() };
    }),
  );

  ipcRegister('get_license_status', async (args: { token?: string; license_id?: string } | undefined) =>
    withAdminUser(args?.token || '', (db) => {
      const id = String(args?.license_id || '').trim();
      const rev = queryOne(db, 'SELECT revoked_at, reason FROM license_revocations WHERE license_id=?', [id]);
      if (rev) return { license_id: id, status: 'revoked', revoked_at: rev.revoked_at };
      const lic = queryOne(db, 'SELECT 1 FROM licenses WHERE license_id=?', [id]);
      return { license_id: id, status: lic ? 'active' : 'unknown' };
    }),
  );

  // ── In-app license generation (Settings → Licențe), issuer-restricted ──────
  // Any authenticated user may check whether THEY can issue (drives the UI).
  ipcRegister('get_license_issuer_state', async (args: { token?: string } | undefined) =>
    withAuthenticatedUser(args?.token || '', (_db, user) => ({
      can_issue: isLicenseIssuer(user),
      key_ready: !!loadIssuerPrivateKey(),
    })),
  );

  // Generate + sign a license for a company. Restricted to the issuer allowlist.
  ipcRegister('create_license', async (args: { token?: string; company_name?: string; company?: string; email?: string; cui?: string } | undefined) =>
    withAuthenticatedUser(args?.token || '', (db, user) => {
      if (!isLicenseIssuer(user)) throw CommandError.forbidden('Nu ai dreptul să generezi licențe.');
      const company = String(args?.company_name ?? args?.company ?? '').trim();
      if (!company) throw CommandError.badRequest('Numele firmei este obligatoriu.');
      const priv = loadIssuerPrivateKey();
      if (!priv) throw CommandError.internal('Cheia privată de semnare nu este configurată pe acest server.');
      const payload: LicensePayload = {
        v: 1,
        license_id: crypto.randomUUID(),
        company_name: company,
        email: String(args?.email ?? '').trim(),
        cui: String(args?.cui ?? '').trim(),
        issued_at: new Date().toISOString(),
      };
      let token: string;
      try { token = signLicenseToken(payload, priv); }
      catch { throw CommandError.internal('Semnare eșuată — cheia privată este invalidă.'); }
      db.run(
        `INSERT INTO issued_licenses (license_id, company_name, email, cui, issued_at, token, issued_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [payload.license_id, payload.company_name, payload.email, payload.cui, payload.issued_at, token, user.username],
      );
      return { ok: true, token, ...payload };
    }),
  );

  // List previously issued licenses (issuer-restricted) — re-copy keys later.
  ipcRegister('list_issued_licenses', async (args: { token?: string } | undefined) =>
    withAuthenticatedUser(args?.token || '', (db, user) => {
      if (!isLicenseIssuer(user)) throw CommandError.forbidden('Nu ai dreptul să vezi licențele emise.');
      const issued = queryAll(db,
        `SELECT license_id, company_name, email, cui, issued_at, token, issued_by, created_at
           FROM issued_licenses ORDER BY datetime(created_at) DESC LIMIT 1000`);
      return { issued };
    }),
  );

  startCrlPuller();
}
