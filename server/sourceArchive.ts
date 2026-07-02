// Source-archive download — admin-only, temporary, secret-free.
//
// Lets an authenticated ADMIN mint a short-lived link from the Instrumente page
// and download a zip of the project SOURCE from any device. The archive is
// streamed (never written to disk) and HARD-EXCLUDES heavy folders and every
// secret (node_modules/, data/, .git/, builds, .env*, .dbkey, *.key, the
// ai-service/config.toml plaintext-admin file, …). See the EXCLUDE_* sets.
//
// Two ways to authenticate the download:
//   • ?dlt=<temp-token>   — minted via the `create_source_archive_link` command
//                           (works on any device/browser, expires).
//   • Authorization: Bearer <admin session token> — a logged-in admin directly.

import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ipcRegister } from '../electron/commands/registry';
import { withAdminUser } from '../electron/middleware/auth';
import { AuthService } from '../electron/services/authService';
import { getDb } from './db';

// ── archiver (v8 is ESM-only with a class API — use `new ZipArchive(opts)`,
// NOT the legacy `archiver('zip')` vending function which no longer exists) ──
interface ArchiverInstance {
  on(event: 'warning' | 'error', cb: (err: Error) => void): void;
  pipe(stream: NodeJS.WritableStream): void;
  file(absolutePath: string, opts: { name: string }): ArchiverInstance;
  append(content: string | Buffer, opts: { name: string }): ArchiverInstance;
  finalize(): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ZipArchive } = require('archiver') as {
  ZipArchive: new (opts?: { store?: boolean; zlib?: { level: number } }) => ArchiverInstance;
};

// ── what NEVER goes into the archive ───────────────────────────────────────
// Directory names pruned wherever they appear (never descended into).
const EXCLUDE_DIRS = new Set<string>([
  'node_modules', '.git', '.svn', '.hg',
  'dist', 'dist-server', 'dist-electron', 'dist-installer', 'release',
  'data', 'backups', 'updates', '.update-staging',
  '.preview-data', '.demo-preview-data', // local preview/demo DBs + their .dbkey
  'target', 'target-linux', 'target-win',
  'playwright-report', 'test-results', 'coverage',
  '.vite', '.cache', '.turbo', '.next', '.idea', '.vscode-test',
  '.claude',
]);
// Directory name PREFIXES pruned (local backup/scratch folders).
const EXCLUDE_DIR_PREFIXES = ['_comments_backup', '_codex_current_ui_backup', '_filterbar_backup', '_upload-bundles'];
// Exact relative paths (POSIX-style) that hold secrets — dropped explicitly.
const EXCLUDE_RELPATHS = new Set<string>([
  'ai-service/config.toml', // plaintext admin creds — NEVER ship this
  '.npmrc',                 // may carry registry auth tokens
  '.dbkey',
  'data/.dbkey',
]);
// File extensions that are secrets / heavy binaries / build leftovers.
const EXCLUDE_EXT = new Set<string>([
  '.db', '.sqlite', '.sqlite3',
  '.key', '.pem', '.keystore', '.jks', '.p12', '.pfx', '.minisign', '.crt', '.cer',
  '.apk', '.aab', '.exe', '.dll', '.so', '.dylib', '.node',
  '.zip', '.7z', '.rar', '.gz', '.tar',
  '.tsbuildinfo', '.log',
]);
// Files whose name starts with one of these is dropped (env/secret families).
const EXCLUDE_NAME_PREFIXES = ['.env'];
// Anything that looks like a DB sidecar: promix.db-shm / promix.db-wal etc.
const DB_SIDECAR = /\.db(-shm|-wal|-journal|\d*)$/i;
// Skip individual files larger than this (avoids accidental giant binaries).
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export function isExcludedDir(name: string): boolean {
  if (EXCLUDE_DIRS.has(name)) return true;
  return EXCLUDE_DIR_PREFIXES.some((p) => name.startsWith(p));
}

export function isExcludedFile(relPosix: string, baseName: string): boolean {
  if (EXCLUDE_RELPATHS.has(relPosix)) return true;
  // Any .dbkey anywhere is a DB encryption key — never ship it (path.extname
  // returns '' for dotfiles, so an extension rule would miss these).
  if (baseName === '.dbkey') return true;
  if (EXCLUDE_NAME_PREFIXES.some((p) => baseName.startsWith(p))) return true;
  if (DB_SIDECAR.test(baseName)) return true;
  const ext = path.extname(baseName).toLowerCase();
  if (EXCLUDE_EXT.has(ext)) return true;
  return false;
}

// ── locate the project root (folder that holds package.json) ───────────────
export function findProjectRoot(): string {
  const candidates = [process.cwd(), __dirname];
  for (const start of candidates) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return process.cwd();
}

// ── create a zip of the project source and write it to destPath ────────────
export async function createSourceZipFile(destPath: string, createdBy = 'system'): Promise<{ added: number; bytes: number }> {
  const root = findProjectRoot();
  const zip = new ZipArchive({ zlib: { level: 6 } });
  const out = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    zip.on('error', reject);
    zip.pipe(out);
    const stats: WalkStats = { added: 0, skippedSecret: 0, skippedBig: 0, bytes: 0 };
    addTreeToZip(zip, root, stats);
    const readme =
      `Automatix — arhivă cod sursă\n` +
      `Generat la: ${new Date().toISOString()}\n` +
      `De către: ${createdBy}\n` +
      `Rădăcină: ${root}\n\n` +
      `Fișiere incluse: ${stats.added} (~${(stats.bytes / 1024 / 1024).toFixed(1)} MB necomprimat)\n`;
    zip.append(readme, { name: 'automatix-source/ARHIVA-README.txt' });
    zip.finalize().then(() => {
      out.on('finish', () => resolve({ added: stats.added, bytes: stats.bytes }));
      out.on('error', reject);
    }).catch(reject);
  });
}

interface WalkStats { added: number; skippedSecret: number; skippedBig: number; bytes: number }

function addTreeToZip(zip: ArchiverInstance, root: string, stats: WalkStats): void {
  const walk = (absDir: string, relDir: string): void => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(absDir, { withFileTypes: true }); }
    catch { return; }
    for (const ent of entries) {
      const abs = path.join(absDir, ent.name);
      const relPosix = relDir ? `${relDir}/${ent.name}` : ent.name;
      if (ent.isSymbolicLink()) continue; // never follow links
      if (ent.isDirectory()) {
        if (isExcludedDir(ent.name)) continue;
        walk(abs, relPosix);
      } else if (ent.isFile()) {
        if (isExcludedFile(relPosix, ent.name)) { stats.skippedSecret++; continue; }
        let size = 0;
        try { size = fs.statSync(abs).size; } catch { continue; }
        if (size > MAX_FILE_BYTES) { stats.skippedBig++; continue; }
        zip.file(abs, { name: `automatix-source/${relPosix}` });
        stats.added++;
        stats.bytes += size;
      }
    }
  };
  walk(root, '');
}

// ── temporary download tokens (in-memory, expiring) ────────────────────────
interface TokenRec { expires: number; createdBy: string }
const tokens = new Map<string, TokenRec>();
const DEFAULT_TTL_MIN = 60;
const MAX_TTL_MIN = 240;

function purgeExpired(now: number): void {
  for (const [k, v] of tokens) if (v.expires <= now) tokens.delete(k);
}

function mintToken(createdBy: string, minutes: number, now: number): { token: string; expires: number } {
  purgeExpired(now);
  const ttl = Math.min(Math.max(1, Math.round(minutes)), MAX_TTL_MIN);
  const token = crypto.randomBytes(24).toString('hex');
  const expires = now + ttl * 60_000;
  tokens.set(token, { expires, createdBy });
  return { token, expires };
}

function consumeToken(token: string, now: number): TokenRec | null {
  purgeExpired(now);
  const rec = tokens.get(token);
  if (!rec || rec.expires <= now) return null;
  return rec;
}

// ── public registration ────────────────────────────────────────────────────
export function registerSourceArchive(app: Express): void {
  // Admin mints a temporary link from the Instrumente page.
  ipcRegister('create_source_archive_link', async (args: { token?: string; minutes?: number } | undefined) =>
    withAdminUser(args?.token || '', (_db, user) => {
      const now = Date.now();
      const { token, expires } = mintToken(user.username, args?.minutes ?? DEFAULT_TTL_MIN, now);
      return {
        path: `/api/source-archive/download?dlt=${token}`,
        token,
        expiresAt: new Date(expires).toISOString(),
        expiresInMinutes: Math.round((expires - now) / 60_000),
      };
    }),
  );

  // Stream the archive. Auth via ?dlt= temp token OR admin Bearer token.
  app.get('/api/source-archive/download', (req: Request, res: Response) => {
    const now = Date.now();
    const dlt = (req.query.dlt as string) || '';
    const bearer = req.headers.authorization?.replace('Bearer ', '') || '';

    let who = '';
    if (dlt) {
      const rec = consumeToken(dlt, now);
      if (!rec) { res.status(401).json({ message: 'link invalid sau expirat' }); return; }
      who = rec.createdBy;
    } else if (bearer) {
      try {
        const u = AuthService.validateSession(getDb(), bearer) as { username?: string; role_name?: string } | null;
        if (!u || String(u.role_name || '').toLowerCase() !== 'admin') {
          res.status(403).json({ message: 'necesită admin' }); return;
        }
        who = u.username || 'admin';
      } catch { res.status(401).json({ message: 'token invalid' }); return; }
    } else {
      res.status(401).json({ message: 'link invalid' }); return;
    }

    const root = findProjectRoot();
    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `automatix-source-${stamp}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store');

    const zip = new ZipArchive({ zlib: { level: 6 } });
    zip.on('warning', (err) => console.warn('[source-archive] warning:', err.message));
    zip.on('error', (err) => {
      console.error('[source-archive] fatal:', err);
      if (!res.headersSent) res.status(500).end();
    });
    zip.pipe(res);

    const stats: WalkStats = { added: 0, skippedSecret: 0, skippedBig: 0, bytes: 0 };
    addTreeToZip(zip, root, stats);

    const readme =
      `Automatix — arhivă cod sursă\n` +
      `Generat la: ${new Date().toISOString()}\n` +
      `De către: ${who}\n` +
      `Rădăcină: ${root}\n\n` +
      `Fișiere incluse: ${stats.added} (~${(stats.bytes / 1024 / 1024).toFixed(1)} MB necomprimat)\n` +
      `Excluse (secrete/heavy): ${stats.skippedSecret}, prea mari: ${stats.skippedBig}\n\n` +
      `EXCLUSE intenționat: node_modules/, data/, .git/, build-uri, .env*, .dbkey,\n` +
      `chei (*.key/*.pem/…), ai-service/config.toml, baze de date, log-uri, arhive.\n\n` +
      `Pe alt device: dezarhivează, apoi 'npm install' și 'npx vite build && npm run server'.\n`;
    zip.append(readme, { name: 'automatix-source/ARHIVA-README.txt' });

    console.log(`[source-archive] by=${who} added=${stats.added} skippedSecret=${stats.skippedSecret} skippedBig=${stats.skippedBig}`);
    zip.finalize();
  });
}
