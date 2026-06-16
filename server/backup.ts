






















import fs from 'fs';
import path from 'path';
import { getDbPath, getDataDir } from './db';

const KEEP_BACKUPS = 14;
const COOLDOWN_MS  = 24 * 60 * 60 * 1000;       
const INTERVAL_MS  = 6  * 60 * 60 * 1000;       

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

  return { skipped: false, file: dest };
}

let timer: NodeJS.Timeout | null = null;





export function startBackupScheduler(): void {
  if (timer) return;

  
  runRollingBackupServer().then(r => {
    if (r.skipped) console.log(`[backup] startup: skipped (${r.reason})`);
    else            console.log(`[backup] startup: created ${r.file}`);
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
