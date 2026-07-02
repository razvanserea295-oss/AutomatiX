














import type { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { assertLicenseUsable } from './license';
import { AuthService } from '../electron/services/authService';
import { getDb } from './db';

// Per-platform installer filename patterns. The capture group is the version.
//   Windows → Automatix-Setup-<ver>.exe
//   macOS   → Automatix-<ver>[-arch].dmg
//   Linux   → Automatix-<ver>[-arch].AppImage
type Platform = 'windows' | 'mac' | 'linux';
const PLATFORMS: Platform[] = ['windows', 'mac', 'linux'];
const PATTERNS: Record<Platform, RegExp> = {
  windows: /^Automatix-Setup-(.+?)\.exe$/i,
  mac: /^Automati[xX]-(.+?)(?:-(?:arm64|x64|x86_64|universal|intel))?\.dmg$/i,
  linux: /^Automati[xX]-(.+?)(?:-(?:x64|x86_64|arm64))?\.AppImage$/i,
};

function classify(file: string): { platform: Platform; version: string } | null {
  for (const p of PLATFORMS) {
    const m = PATTERNS[p].exec(file);
    if (m) return { platform: p, version: m[1] };
  }
  return null;
}

function isInstallerFile(file: string): boolean {
  return classify(file) !== null;
}

function normalizePlatform(value: unknown): Platform {
  const v = String(value || '').toLowerCase();
  if (v === 'mac' || v === 'macos' || v === 'darwin') return 'mac';
  if (v === 'linux') return 'linux';
  return 'windows';
}

// ── one-time, short-lived download grants ────────────────────────────────────
// The marketing landing posts a license key to /api/download/authorize; on a
// valid, non-revoked key we mint a single-use token (dlt) embedded in the
// download URL. /downloads/:file accepts that dlt OR a logged-in session token
// (in-app download for already-authenticated, hence already-licensed, users).
interface Grant { expires: number; file: string }
const grants = new Map<string, Grant>();
const GRANT_TTL_MS = 5 * 60_000;

function purgeGrants(now: number): void {
  for (const [k, g] of grants) if (g.expires <= now) grants.delete(k);
}
function mintGrant(file: string, now: number): string {
  purgeGrants(now);
  const token = crypto.randomBytes(24).toString('hex');
  grants.set(token, { expires: now + GRANT_TTL_MS, file });
  return token;
}
function consumeGrant(token: string, now: number): Grant | null {
  purgeGrants(now);
  const g = grants.get(token);
  if (!g || g.expires <= now) return null;
  grants.delete(token); // single use
  return g;
}
function sessionTokenFrom(req: Request): string {
  return (req.headers.authorization?.replace('Bearer ', '') || '')
    || (typeof req.query.token === 'string' ? req.query.token : '')
    || (req.body && typeof req.body.token === 'string' ? req.body.token : '');
}
function hasValidSession(req: Request): boolean {
  const t = sessionTokenFrom(req);
  if (!t) return false;
  try { return !!AuthService.validateSession(getDb(), t); }
  catch { return false; }
}


function readAppVersion(): string {
  const candidates = [
    path.join(process.cwd(), 'VERSION.txt'),
    path.join(__dirname, '../../VERSION.txt'),
    path.join(__dirname, '../../../VERSION.txt'),
  ];
  for (const p of candidates) {
    try {
      const v = fs.readFileSync(p, 'utf8').trim();
      if (v) return v;
    } catch { /* try next */ }
  }
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function downloadsDir(): string {
  const candidates = [
    path.join(process.cwd(), 'public', 'downloads'),
    path.join(__dirname, '../../public/downloads'),
    path.join(__dirname, '../../../public/downloads'),
    path.join(process.cwd(), 'dist', 'downloads'),
    path.join(__dirname, '../../dist/downloads'),
  ];
  return candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || candidates[0];
}

interface InstallerMeta { file: string; platform: Platform; version: string; size: number; mtime: number; }


function parseSemver(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa && !pb) return 0;
  if (!pa) return -1;
  if (!pb) return 1;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function findLatest(platform?: Platform): InstallerMeta | null {
  const dir = downloadsDir();
  let entries: string[] = [];
  try { entries = fs.readdirSync(dir); } catch { return null; }
  const matches: InstallerMeta[] = [];
  for (const f of entries) {
    const c = classify(f);
    if (!c) continue;
    if (platform && c.platform !== platform) continue;
    try {
      const st = fs.statSync(path.join(dir, f));
      matches.push({ file: f, platform: c.platform, version: c.version, size: st.size, mtime: st.mtimeMs });
    } catch {  }
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const byVer = compareSemver(b.version, a.version);
    return byVer !== 0 ? byVer : b.mtime - a.mtime;
  });
  return matches[0];
}

export function registerDownloads(app: Express): void {
  
  
  app.get('/download', (_req: Request, res: Response) => {
    res.redirect(302, '/#/download');
  });

  
  app.get('/api/download/latest', (req: Request, res: Response) => {
    const appVersion = readAppVersion();
    res.set('Cache-Control', 'no-store');
    // Platform-scoped when ?platform= is given (windows|mac|linux); defaults to
    // Windows so older callers that don't pass a platform keep their behaviour.
    const platform = normalizePlatform(req.query.platform);
    const latest = findLatest(platform);
    if (!latest) {
      res.json({ available: false, platform, version: appVersion, file: null, url: null, size: null });
      return;
    }
    res.json({
      available: true,
      platform: latest.platform,
      version: latest.version,
      file: latest.file,
      url: `/downloads/${encodeURIComponent(latest.file)}`,
      size: latest.size,
    });
  });

  // Exchange a valid license key for a single-use download grant. Used by the
  // public marketing landing (automatix.online) to gate the .exe download.
  app.post('/api/download/authorize', (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    // Two ways in: a license KEY (public landing) or a valid SESSION (an in-app
    // user, already on a licensed tenant — no key re-entry needed).
    const key = String(req.body?.key || req.body?.license_token || '').trim();
    let company: string | undefined;
    let authorized = false;
    if (key) {
      const lic = assertLicenseUsable(key);
      if (!lic.ok) { res.status(403).json({ ok: false, error: lic.reason || 'invalid' }); return; }
      authorized = true;
      company = lic.payload?.company_name;
    } else if (hasValidSession(req)) {
      authorized = true;
    }
    if (!authorized) { res.status(403).json({ ok: false, error: 'unauthorized' }); return; }

    const platform = normalizePlatform(req.body?.platform);
    const latest = findLatest(platform);
    if (!latest) { res.status(404).json({ ok: false, error: 'no_build' }); return; }
    const dlt = mintGrant(latest.file, Date.now());
    res.json({
      ok: true,
      platform: latest.platform,
      version: latest.version,
      size: latest.size,
      url: `/downloads/${encodeURIComponent(latest.file)}?dlt=${dlt}`,
      company_name: company,
    });
  });

  // Serve the installer. Requires a single-use grant (?dlt=, from the landing)
  // OR a valid session token (an already-authenticated in-app user). Never open.
  app.get('/downloads/:file', (req: Request, res: Response) => {
    const file = path.basename(String(req.params.file || ''));
    if (!isInstallerFile(file)) { res.status(404).json({ message: 'not found' }); return; }

    const dlt = typeof req.query.dlt === 'string' ? req.query.dlt : '';
    let authorized = false;
    if (dlt) {
      const g = consumeGrant(dlt, Date.now());
      authorized = !!g && g.file === file;
    }
    if (!authorized && hasValidSession(req)) authorized = true;
    if (!authorized) { res.status(403).json({ message: 'Necesită o cheie de licență validă.' }); return; }

    const full = path.join(downloadsDir(), file);
    if (!fs.existsSync(full)) { res.status(404).json({ message: 'not found' }); return; }
    res.download(full, file, (err) => {
      if (err && !res.headersSent) res.status(500).end();
    });
  });
}
