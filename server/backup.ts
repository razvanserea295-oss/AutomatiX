






















import fs from 'fs';
import path from 'path';
import { getDbPath, getDataDir } from './db';

const KEEP_BACKUPS = 14;
const COOLDOWN_MS  = 24 * 60 * 60 * 1000;
const INTERVAL_MS  = 6  * 60 * 60 * 1000;

// Off-site mirror: a directory on ANOTHER disk / a NAS-UNC share / a cloud-synced
// folder (OneDrive, Google Drive, Dropbox). All local backups otherwise sit on
// the SAME disk as the live DB — one disk failure or ransomware loses everything.
// We mirror only the ENCRYPTED .db snapshot, never .dbkey, so an off-machine copy
// is useless without the separately-held key.
const MIRROR_DIR = (process.env.PROMIX_BACKUP_MIRROR_DIR || '').trim();

export const BACKUP_CONFIG = {
  intervalHours: 6,
  cooldownHours: 24,
  keepCount: KEEP_BACKUPS,
};

function dbPath(): string {
  
  return getDbPath();
}

function backupDir(): string {
  
  
  const dir = path.join(path.dirname(getDataDir()), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getBackupDirectory(): string {
  return backupDir();
}

export function listBackupsServer(): Array<{ name: string; size: number; mtime: number; kind: string }> {
  const dir = backupDir();
  const out: Array<{ name: string; size: number; mtime: number; kind: string }> = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.db')) continue;
    let kind = 'other';
    if (f.startsWith('promix-')) kind = 'rolling';
    else if (f.startsWith('pre-migrate-')) kind = 'pre-migrate';
    else if (f.startsWith('pre-clear-')) kind = 'manual';
    try {
      const st = fs.statSync(path.join(dir, f));
      out.push({ name: f, size: st.size, mtime: st.mtimeMs, kind });
    } catch {  }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

function listSnapshots(): Array<{ name: string; mtime: number }> {
  return fs.readdirSync(backupDir())
    .filter(f => f.startsWith('promix-') && f.endsWith('.db'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(backupDir(), f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

export function isMirrorConfigured(): boolean {
  return MIRROR_DIR.length > 0;
}

// Resolve (and create) the mirror dir. Returns null if unset, or if the path is
// currently unreachable (e.g. a NAS share that's offline) — never throws.
function resolveMirrorDir(): string | null {
  if (!MIRROR_DIR) return null;
  try {
    fs.mkdirSync(MIRROR_DIR, { recursive: true });
    return MIRROR_DIR;
  } catch (e) {
    console.error('[backup] off-site mirror unavailable:', MIRROR_DIR, e instanceof Error ? e.message : e);
    return null;
  }
}

// Copy one ENCRYPTED backup off-site (temp + rename so a partial copy is never
// seen as complete), verify size, then rotate the mirror. NEVER copies .dbkey.
// Best-effort: a mirror failure must not break the local backup.
export async function mirrorBackup(srcBackupPath: string): Promise<{ ok: boolean; dest?: string; reason?: string }> {
  const dir = resolveMirrorDir();
  if (!dir) return { ok: false, reason: 'mirror not configured/reachable' };
  const name = path.basename(srcBackupPath);
  const dest = path.join(dir, name);
  const tmp = path.join(dir, `.${name}.tmp`);
  try {
    await fs.promises.copyFile(srcBackupPath, tmp);
    try { await fs.promises.rename(tmp, dest); }
    catch { await fs.promises.copyFile(tmp, dest); await fs.promises.unlink(tmp).catch(() => {}); }

    const srcSize = fs.statSync(srcBackupPath).size;
    const dstSize = fs.statSync(dest).size;
    if (srcSize !== dstSize) {
      console.error(`[backup] off-site mirror size mismatch for ${name} (${srcSize} vs ${dstSize})`);
      return { ok: false, reason: 'size mismatch' };
    }

    const snaps = fs.readdirSync(dir)
      .filter(f => f.startsWith('promix-') && f.endsWith('.db'))
      .map(f => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    for (const old of snaps.slice(KEEP_BACKUPS)) {
      try { fs.unlinkSync(path.join(dir, old.f)); } catch { /* ignore */ }
    }
    console.log(`[backup] off-site mirror updated: ${dest}`);
    return { ok: true, dest };
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    console.error('[backup] off-site mirror failed:', e instanceof Error ? e.message : e);
    return { ok: false, reason: 'copy failed' };
  }
}







export async function runRollingBackupServer(): Promise<{ skipped: boolean; file?: string; reason?: string }> {
  const src = dbPath();
  if (!fs.existsSync(src)) return { skipped: true, reason: 'no db file yet' };

  const dir = backupDir();
  const existing = listSnapshots();

  
  if (existing[0] && Date.now() - existing[0].mtime < COOLDOWN_MS) {
    return { skipped: true, reason: 'recent backup exists' };
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(dir, `promix-${stamp}.db`);
  try {
    await fs.promises.copyFile(src, dest);
  } catch (e) {
    
    
    console.error('[backup] copy failed:', e);
    return { skipped: true, reason: 'copy failed' };
  }


  const updated = listSnapshots();
  for (const old of updated.slice(KEEP_BACKUPS)) {
    try { fs.unlinkSync(path.join(dir, old.name)); } catch {  }
  }

  // Push the fresh (encrypted) snapshot off-site. Never blocks/fails the local backup.
  await mirrorBackup(dest).catch(() => {});

  return { skipped: false, file: dest };
}

let timer: NodeJS.Timeout | null = null;





export function startBackupScheduler(): void {
  if (timer) return;

  if (MIRROR_DIR) {
    console.log(`[backup] off-site mirror ON → ${MIRROR_DIR} (encrypted .db only, key NOT copied)`);
  } else {
    console.warn('[backup] ⚠  off-site mirror OFF — every backup is on the SAME disk as the DB. A disk failure or ransomware loses the database AND all backups. Set PROMIX_BACKUP_MIRROR_DIR to a 2nd drive, a NAS share, or a OneDrive/Google Drive synced folder.');
  }


  runRollingBackupServer().then(r => {
    if (r.skipped) {
      console.log(`[backup] startup: skipped (${r.reason})`);
      // Even when a fresh local backup was skipped, make sure the latest snapshot
      // is mirrored — so enabling the mirror copies off-site immediately.
      const latest = listSnapshots()[0];
      if (latest) mirrorBackup(path.join(backupDir(), latest.name)).catch(() => {});
    } else {
      console.log(`[backup] startup: created ${r.file}`);
    }
  }).catch(e => console.error('[backup] startup failed:', e));

  
  
  timer = setInterval(() => {
    runRollingBackupServer().then(r => {
      if (!r.skipped) console.log(`[backup] tick: created ${r.file}`);
    }).catch(e => console.error('[backup] tick failed:', e));
  }, INTERVAL_MS);

  
  if (typeof timer.unref === 'function') timer.unref();
}

export function stopBackupScheduler(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
