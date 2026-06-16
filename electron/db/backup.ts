

let app: any = undefined;
try {
  const _e = require('electron');
  if (_e && typeof _e === 'object') { app = _e.app; }
} catch {  }
import fs from 'fs';
import path from 'path';

const KEEP_BACKUPS = 7;
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function backupDir(): string {
  
  const base = app ? path.join(app.getPath('userData'), 'backups') : path.join(process.cwd(), 'backups');
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function dbPath(): string {
  
  return app
    ? path.join(app.getPath('userData'), 'data', 'promix.db')
    : path.join(process.cwd(), 'data', 'promix.db');
}










export function runRollingBackup(): { skipped: boolean; file?: string; reason?: string } {
  const src = dbPath();
  if (!fs.existsSync(src)) return { skipped: true, reason: 'no db file yet' };

  const dir = backupDir();
  const existing = fs.readdirSync(dir)
    .filter(f => f.startsWith('promix-') && f.endsWith('.db'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const now = Date.now();
  if (existing[0] && now - existing[0].mtime < BACKUP_INTERVAL_MS) {
    return { skipped: true, reason: 'recent backup exists' };
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(dir, `promix-${stamp}.db`);
  try {
    fs.copyFileSync(src, dest);
  } catch (e) {
    return { skipped: true, reason: `copy failed: ${String(e)}` };
  }

  
  const updated = fs.readdirSync(dir)
    .filter(f => f.startsWith('promix-') && f.endsWith('.db'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const old of updated.slice(KEEP_BACKUPS)) {
    try { fs.unlinkSync(path.join(dir, old.name)); } catch {  }
  }

  return { skipped: false, file: dest };
}

export function listBackups(): Array<{ name: string; size: number; mtime: number }> {
  const dir = backupDir();
  return fs.readdirSync(dir)
    .filter(f => f.startsWith('promix-') && f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(dir, f));
      return { name: f, size: stat.size, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}
