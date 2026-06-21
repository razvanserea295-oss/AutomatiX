// Source-archive UPLOAD + in-place app update — admin-only, with backup/rollback.
//
// Round-trip companion to sourceArchive.ts: an admin downloads the source zip,
// edits the files on any device, then uploads the zip back here to UPDATE the
// running app. Flow (apply + rebuild + restart, NO npm install):
//   1. auth admin · 2. stash upload · 3. BACKUP current source (rollback safety)
//   4. extract (zip-slip guarded, via extract-zip) · 5. validate it looks like the app
//   6. overwrite source files (NEVER data/secrets/builds) · 7. rebuild (tsc emit + vite)
//   8. if build fails → ROLLBACK from backup, stay on old code
//   9. if build ok → respond, then respawn the server so new code loads.
//
// Plus `app_restart`: a manual restart restricted to a username allowlist
// (default: "razvan"), so only that user can restart from the UI.

import type { Express, Request, Response } from 'express';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import extract from 'extract-zip';
import { ipcRegister } from '../electron/commands/registry';
import { CommandError } from '../electron/middleware/errors';
import { AuthService } from '../electron/services/authService';
import { getDb, flushDatabase } from './db';
import { findProjectRoot, isExcludedDir, isExcludedFile, createSourceZipFile } from './sourceArchive';

// Max source-zip upload size for an in-place app update. NOTE: express.raw
// buffers the whole body into memory (req.body Buffer) before it is written to
// disk, so this also sets the peak RAM the receive needs — a 2 GB upload needs
// ~2 GB free RAM on the server. Admin-only + rare, so that's acceptable.
// Override at runtime with PROMIX_UPDATE_MAX_MB (in megabytes).
const MAX_UPLOAD_BYTES = Number(process.env.PROMIX_UPDATE_MAX_MB || 2048) * 1024 * 1024; // default 2 GB
const BUILD_TIMEOUT_MS = 5 * 60 * 1000;

// Usernames allowed to restart the server from the UI (case-insensitive).
function restartAllowlist(): Set<string> {
  const raw = (process.env.PROMIX_RESTART_USERS || 'razvan').split(',');
  return new Set(raw.map((s) => s.trim().toLowerCase()).filter(Boolean));
}

let updateInProgress = false;

// ── shared respawn (mirrors restart_server in commandRouter.ts) ─────────────
function scheduleRespawn(byName: string, reason: string): void {
  const node = process.execPath;
  const entry = process.argv[1];
  const cwd = process.cwd();
  const isWin = process.platform === 'win32';
  if (!entry) throw CommandError.internal('Nu pot determina scriptul serverului (process.argv[1] lipsă).');

  try {
    fs.writeFileSync(path.join(cwd, '.restart-marker'), JSON.stringify({
      at: new Date().toISOString(), by: byName, old_pid: process.pid, entry, reason,
    }, null, 2));
  } catch (e) { console.warn('[update/restart] marker write failed (continuing):', e); }

  const child = isWin
    ? spawn('cmd.exe', ['/c', `ping -n 3 127.0.0.1 >nul & "${node}" "${entry}"`],
        { cwd, detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true })
    : spawn('sh', ['-c', `sleep 2; exec "${node}" "${entry}"`], { cwd, detached: true, stdio: 'ignore' });
  child.unref();
  console.log(`[update/restart] respawn scheduled (child pid ${child.pid}) — ${reason}`);

  setTimeout(() => {
    try { flushDatabase(); } catch (e) { console.error('[update/restart] DB flush failed:', e); }
    console.log('[update/restart] exiting now for respawn.');
    process.exit(0);
  }, 1200);
}

// ── helpers ─────────────────────────────────────────────────────────────────
function requireAdmin(req: Request): { id: number; username: string; role_name?: string } {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!token) throw CommandError.unauthorized('token lipsă');
  const user = AuthService.validateSession(getDb(), token) as { id: number; username: string; role_name?: string } | null;
  if (!user) throw CommandError.unauthorized('token invalid');
  if ((user.role_name || '').toLowerCase() !== 'admin') throw CommandError.forbidden('necesită admin');
  return user;
}

function rmrf(p: string): void { try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* noop */ } }
function rmrf_recreate(staging: string, extractedDir: string): void { rmrf(staging); fs.mkdirSync(extractedDir, { recursive: true }); }
function rmrf_recreate_one(dir: string): void { rmrf(dir); fs.mkdirSync(dir, { recursive: true }); }

// Find the real source root inside an extracted archive: the dir holding
// package.json + src + server (handles the `automatix-source/` wrapper or none).
function detectSourceRoot(extractedDir: string): string | null {
  const looksLikeApp = (d: string) =>
    fs.existsSync(path.join(d, 'package.json')) &&
    fs.existsSync(path.join(d, 'src')) &&
    fs.existsSync(path.join(d, 'server'));
  if (looksLikeApp(extractedDir)) return extractedDir;
  let kids: fs.Dirent[] = [];
  try { kids = fs.readdirSync(extractedDir, { withFileTypes: true }); } catch { return null; }
  for (const k of kids) {
    if (k.isDirectory()) {
      const cand = path.join(extractedDir, k.name);
      if (looksLikeApp(cand)) return cand;
    }
  }
  return null;
}

// Copy every non-excluded file from srcRoot over destRoot at the same relative
// path. Guards against zip-slip. Never touches data/secrets/builds/node_modules.
function applyTreeOverRoot(srcRoot: string, destRoot: string): { applied: number; skipped: number } {
  let applied = 0, skipped = 0;
  const destResolved = path.resolve(destRoot);
  const walk = (absDir: string, relDir: string): void => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(absDir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const abs = path.join(absDir, ent.name);
      const relPosix = relDir ? `${relDir}/${ent.name}` : ent.name;
      if (ent.isSymbolicLink()) { skipped++; continue; }
      if (ent.isDirectory()) {
        if (isExcludedDir(ent.name)) { skipped++; continue; }
        walk(abs, relPosix);
      } else if (ent.isFile()) {
        if (isExcludedFile(relPosix, ent.name)) { skipped++; continue; }
        const dest = path.resolve(destRoot, relPosix);
        if (dest !== destResolved && !dest.startsWith(destResolved + path.sep)) { skipped++; continue; } // zip-slip
        try {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(abs, dest);
          applied++;
        } catch (e) { console.warn('[update] copy failed', relPosix, e instanceof Error ? e.message : e); skipped++; }
      }
    }
  };
  walk(srcRoot, '');
  return { applied, skipped };
}

function runBuild(label: string, root: string, binRel: string, buildArgs: string[]): { ok: boolean; tail: string } {
  const bin = path.join(root, binRel);
  if (!fs.existsSync(bin)) return { ok: false, tail: `${label}: lipsește ${binRel} (rulează npm install)` };
  const r = spawnSync(process.execPath, [bin, ...buildArgs], {
    cwd: root, encoding: 'utf-8', timeout: BUILD_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NODE_ENV: 'production' },
  });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`.trim();
  const tail = out.split('\n').slice(-25).join('\n');
  if (r.status !== 0) return { ok: false, tail: `${label} exit=${r.status ?? 'timeout'}\n${tail}` };
  return { ok: true, tail: `${label}: OK` };
}

const TSC_BIN = path.join('node_modules', 'typescript', 'bin', 'tsc');
const VITE_BIN = path.join('node_modules', 'vite', 'bin', 'vite.js');

// ── registration ────────────────────────────────────────────────────────────
export function registerSourceUpdate(app: Express): void {
  // Manual restart, restricted to the username allowlist (default: razvan).
  ipcRegister('app_restart', async (args: { token?: string } | undefined) => {
    const token = args?.token || '';
    if (!token) throw CommandError.unauthorized('token lipsă');
    const user = AuthService.validateSession(getDb(), token) as { username: string; role_name?: string } | null;
    if (!user) throw CommandError.unauthorized('token invalid');
    if ((user.role_name || '').toLowerCase() !== 'admin' || !restartAllowlist().has((user.username || '').toLowerCase())) {
      throw CommandError.forbidden('Restart permis doar pentru utilizatorul autorizat.');
    }
    scheduleRespawn(user.username, 'app_restart command');
    return { ok: true, message: 'Restart inițiat — serverul revine în câteva secunde.', eta_seconds: 3 };
  });

  // Tells the UI whether the current user may see the restart button.
  ipcRegister('app_restart_allowed', async (args: { token?: string } | undefined) => {
    const token = args?.token || '';
    if (!token) return { allowed: false };
    try {
      const user = AuthService.validateSession(getDb(), token) as { username: string; role_name?: string } | null;
      const ok = !!user && (user.role_name || '').toLowerCase() === 'admin'
        && restartAllowlist().has((user.username || '').toLowerCase());
      return { allowed: ok, username: user?.username ?? null };
    } catch { return { allowed: false }; }
  });

  // Upload a source zip and update the app in place.
  const rawParser = express.raw({ type: 'application/octet-stream', limit: MAX_UPLOAD_BYTES });
  app.post('/api/source-archive/upload', rawParser, async (req: Request, res: Response) => {
    let user;
    try { user = requireAdmin(req); }
    catch (e) {
      const ce = e as CommandError;
      return res.status(ce.code || 401).json({ ok: false, code: ce.code || 401, message: ce.message });
    }

    if (updateInProgress) return res.status(409).json({ ok: false, code: 409, message: 'Un update este deja în curs.' });

    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return res.status(400).json({ ok: false, code: 400, message: 'corp gol — trimite zip-ul ca application/octet-stream' });
    }

    updateInProgress = true;
    const root = findProjectRoot();
    const stampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const staging = path.join(root, '.update-staging');
    const extractedDir = path.join(staging, 'extracted');
    const uploadZip = path.join(staging, `upload-${stampStr}.zip`);
    const backupZip = path.join(root, 'backups', `source-pre-update-${stampStr}.zip`);
    const log: string[] = [];

    try {
      rmrf_recreate(staging, extractedDir);
      fs.writeFileSync(uploadZip, body);
      log.push(`upload primit: ${(body.length / 1024 / 1024).toFixed(1)} MB`);

      // 1) backup current source for rollback
      const bstats = await createSourceZipFile(backupZip, user.username);
      log.push(`backup creat: backups/${path.basename(backupZip)} (${bstats.added} fișiere)`);

      // 2) extract upload (extract-zip sanitizes entry paths)
      await extract(uploadZip, { dir: extractedDir });
      const srcRoot = detectSourceRoot(extractedDir);
      if (!srcRoot) {
        updateInProgress = false;
        return res.status(400).json({ ok: false, code: 400, message: 'Arhivă invalidă: nu conține package.json + src/ + server/.', log });
      }
      log.push(`sursă detectată în arhivă: ${path.relative(extractedDir, srcRoot) || '(rădăcină)'}`);

      // 3) apply over the live source (data/secrets/builds protected)
      const { applied, skipped } = applyTreeOverRoot(srcRoot, root);
      log.push(`fișiere aplicate: ${applied} (sărite/protejate: ${skipped})`);

      // 4) rebuild — server (emit dist-server) then frontend. NO npm install.
      const b1 = runBuild('tsc (server)', root, TSC_BIN, ['-p', 'tsconfig.server.json']);
      log.push(b1.tail);
      const b2 = b1.ok ? runBuild('vite (frontend)', root, VITE_BIN, ['build']) : { ok: false, tail: 'vite: sărit (tsc a eșuat)' };
      if (b1.ok) log.push(b2.tail);

      if (!b1.ok || !b2.ok) {
        // 5) ROLLBACK from backup
        log.push('BUILD EȘUAT → rollback din backup…');
        const rbDir = path.join(staging, 'rollback');
        rmrf_recreate_one(rbDir);
        await extract(backupZip, { dir: rbDir });
        const rbRoot = detectSourceRoot(rbDir);
        if (rbRoot) {
          const rb = applyTreeOverRoot(rbRoot, root);
          log.push(`rollback: ${rb.applied} fișiere restaurate`);
          runBuild('tsc (rollback)', root, TSC_BIN, ['-p', 'tsconfig.server.json']);
          runBuild('vite (rollback)', root, VITE_BIN, ['build']);
        } else {
          log.push('!!! rollback root negăsit — restaurează manual din ' + backupZip);
        }
        updateInProgress = false;
        return res.status(422).json({ ok: false, code: 422, message: 'Build eșuat — modificările au fost anulate (rollback). Aplicația rulează codul anterior.', log });
      }

      // 6) success → respond, then respawn so the new server code loads
      log.push('build OK — repornesc serverul…');
      console.log(`[update] applied by ${user.username}: ${applied} files, build OK, restarting`);
      res.json({ ok: true, applied, skipped, backup: `backups/${path.basename(backupZip)}`, restarting: true, log });
      setTimeout(() => { try { scheduleRespawn(user!.username, 'source update applied'); } catch (e) { console.error('[update] respawn failed:', e); } }, 400);
      updateInProgress = false;
      return;
    } catch (err) {
      updateInProgress = false;
      console.error('[update] failed:', err);
      const ce = err as CommandError;
      const code = Number.isInteger(ce?.code) ? ce.code : 500;
      return res.status(code).json({ ok: false, code, message: ce?.message || 'update eșuat', log });
    } finally {
      rmrf(uploadZip);
    }
  });
}
