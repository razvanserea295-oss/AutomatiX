





















import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import extract from 'extract-zip';
import { getDb, saveDatabase, flushDatabase, getDataDir } from './db';


const INCLUDE_DIRS = ['briefing-files', 'uploads', 'documents'];

interface BackupConfig {
  enabled: boolean;
  hour: number;          
  keepDaily: number;
  keepWeekly: number;
  keepMonthly: number;
  cloudEnabled: boolean; 
  lastRunAt: number | null;
}

const DEFAULTS: BackupConfig = {
  enabled: true,
  hour: 3,
  keepDaily: 7,
  keepWeekly: 4,
  keepMonthly: 12,
  cloudEnabled: false,
  lastRunAt: null,
};





function dataDir(): string {
  
  
  return getDataDir();
}

function autoDir(): string {
  
  const dir = path.join(path.dirname(getDataDir()), 'backups', 'auto');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getAutoBackupDirectory(): string {
  return autoDir();
}

function stampNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}





function getSetting(key: string): string | null {
  try {
    const db = getDb();
    const st = db.prepare('SELECT value FROM app_settings WHERE key = ?');
    st.bind([key]);
    const val = st.step() ? (st.getAsObject().value as string | null) : null;
    st.free();
    return val ?? null;
  } catch {
    
    return null;
  }
}

function setSetting(key: string, value: string): void {
  const db = getDb();
  db.run(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value],
  );
  saveDatabase();
}

const K = {
  enabled: 'auto_backup.enabled',
  hour: 'auto_backup.hour',
  keepDaily: 'auto_backup.keep_daily',
  keepWeekly: 'auto_backup.keep_weekly',
  keepMonthly: 'auto_backup.keep_monthly',
  cloud: 'auto_backup.cloud_enabled',
  lastRun: 'auto_backup.last_run_at',
};

function num(v: string | null, def: number): number {
  const n = v == null ? NaN : parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

export function getConfig(): BackupConfig {
  return {
    enabled: (getSetting(K.enabled) ?? (DEFAULTS.enabled ? '1' : '0')) === '1',
    hour: Math.min(Math.max(num(getSetting(K.hour), DEFAULTS.hour), 0), 23),
    keepDaily: Math.max(num(getSetting(K.keepDaily), DEFAULTS.keepDaily), 0),
    keepWeekly: Math.max(num(getSetting(K.keepWeekly), DEFAULTS.keepWeekly), 0),
    keepMonthly: Math.max(num(getSetting(K.keepMonthly), DEFAULTS.keepMonthly), 0),
    cloudEnabled: (getSetting(K.cloud) ?? '0') === '1',
    lastRunAt: getSetting(K.lastRun) ? num(getSetting(K.lastRun), 0) : null,
  };
}

function getConfigSafe(): BackupConfig {
  try { return getConfig(); } catch { return { ...DEFAULTS }; }
}

export interface BackupConfigPatch {
  enabled?: boolean;
  hour?: number;
  keepDaily?: number;
  keepWeekly?: number;
  keepMonthly?: number;
  cloudEnabled?: boolean;
}

export function setConfig(patch: BackupConfigPatch): BackupConfig {
  if (patch.enabled !== undefined) setSetting(K.enabled, patch.enabled ? '1' : '0');
  if (patch.hour !== undefined) {
    const h = Math.min(Math.max(Math.trunc(patch.hour), 0), 23);
    setSetting(K.hour, String(h));
  }
  if (patch.keepDaily !== undefined) setSetting(K.keepDaily, String(Math.max(Math.trunc(patch.keepDaily), 0)));
  if (patch.keepWeekly !== undefined) setSetting(K.keepWeekly, String(Math.max(Math.trunc(patch.keepWeekly), 0)));
  if (patch.keepMonthly !== undefined) setSetting(K.keepMonthly, String(Math.max(Math.trunc(patch.keepMonthly), 0)));
  if (patch.cloudEnabled !== undefined) setSetting(K.cloud, patch.cloudEnabled ? '1' : '0');
  
  rescheduleAutoBackup();
  return getConfig();
}





export interface AutoBackupItem { name: string; size: number; mtime: number; kind: 'auto' | 'pre-restore'; }

export function listAutoBackups(): AutoBackupItem[] {
  const dir = autoDir();
  const out: AutoBackupItem[] = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.zip')) continue;
    try {
      const st = fs.statSync(path.join(dir, f));
      out.push({ name: f, size: st.size, mtime: st.mtimeMs, kind: f.startsWith('pre-restore_') ? 'pre-restore' : 'auto' });
    } catch {  }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

async function buildZip(destName: string): Promise<{ name: string; file: string; size: number }> {
  
  
  flushDatabase();

  const dir = dataDir();
  const file = path.join(autoDir(), destName);

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(file);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (err) => { if (err.code !== 'ENOENT') reject(err); });
    archive.pipe(output);

    const db = path.join(dir, 'promix.db');
    if (fs.existsSync(db)) archive.file(db, { name: 'promix.db' });
    
    const key = path.join(dir, '.dbkey');
    if (fs.existsSync(key)) archive.file(key, { name: '.dbkey' });
    for (const d of INCLUDE_DIRS) {
      const p = path.join(dir, d);
      if (fs.existsSync(p)) archive.directory(p, d);
    }
    void archive.finalize();
  });

  const size = fs.statSync(file).size;
  return { name: destName, file, size };
}

export async function createZipBackup(): Promise<{ name: string; file: string; size: number }> {
  const res = await buildZip(`${stampNow()}.zip`);
  setSetting(K.lastRun, String(Date.now()));
  rotate();
  return res;
}





function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isoWeekKey(d: Date): string {
  
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function rotate(): void {
  const cfg = getConfigSafe();
  
  const items = listAutoBackups().filter(i => i.kind === 'auto'); 
  if (!items.length) return;

  const firstByDay = new Map<string, string>();
  const firstByWeek = new Map<string, string>();
  const firstByMonth = new Map<string, string>();
  for (const it of items) {
    const d = new Date(it.mtime);
    const dayKey = ymd(d);
    const weekKey = isoWeekKey(d);
    const monthKey = dayKey.slice(0, 7);
    if (!firstByDay.has(dayKey)) firstByDay.set(dayKey, it.name);
    if (!firstByWeek.has(weekKey)) firstByWeek.set(weekKey, it.name);
    if (!firstByMonth.has(monthKey)) firstByMonth.set(monthKey, it.name);
  }

  const keep = new Set<string>();
  [...firstByDay.values()].slice(0, cfg.keepDaily).forEach(n => keep.add(n));
  [...firstByWeek.values()].slice(0, cfg.keepWeekly).forEach(n => keep.add(n));
  [...firstByMonth.values()].slice(0, cfg.keepMonthly).forEach(n => keep.add(n));

  for (const it of items) {
    if (keep.has(it.name)) continue;
    try { fs.unlinkSync(path.join(autoDir(), it.name)); } catch {  }
  }
}





export function readAutoBackup(name: string): { name: string; base64: string; size: number } {
  const safe = path.basename(String(name)); 
  const file = path.join(autoDir(), safe);
  if (!safe.endsWith('.zip') || !fs.existsSync(file)) throw new Error('Backup inexistent');
  const buf = fs.readFileSync(file);
  return { name: safe, base64: buf.toString('base64'), size: buf.length };
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export async function restoreInPlace(name: string): Promise<{ requiresRestart: boolean; safety: string }> {
  const safe = path.basename(String(name));
  const zip = path.join(autoDir(), safe);
  if (!safe.endsWith('.zip') || !fs.existsSync(zip)) throw new Error('Backup inexistent');

  
  const safety = await buildZip(`pre-restore_${stampNow()}.zip`);

  
  flushDatabase();
  const tmp = path.join(path.dirname(getDataDir()), 'backups', '_restore_tmp');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  await extract(zip, { dir: tmp });

  
  
  const dir = dataDir();
  const stagedDb = path.join(tmp, 'promix.db');
  const stagedKey = path.join(tmp, '.dbkey');
  if (fs.existsSync(stagedDb)) fs.copyFileSync(stagedDb, path.join(dir, 'promix.db'));
  if (fs.existsSync(stagedKey)) fs.copyFileSync(stagedKey, path.join(dir, '.dbkey'));
  for (const d of INCLUDE_DIRS) {
    const s = path.join(tmp, d);
    if (fs.existsSync(s)) copyDir(s, path.join(dir, d));
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  
  
  return { requiresRestart: true, safety: path.basename(safety.file) };
}





let scheduleTimer: NodeJS.Timeout | null = null;

function scheduleNext(): void {
  const cfg = getConfigSafe();
  const now = new Date();
  const target = new Date(now);
  target.setHours(cfg.hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  const delay = Math.max(target.getTime() - now.getTime(), 1000);

  scheduleTimer = setTimeout(() => {
    scheduleTimer = null;
    const c = getConfigSafe();
    if (c.enabled) {
      createZipBackup()
        .then(r => console.log(`[autoBackup] scheduled archive created: ${r.name} (${r.size} bytes)`))
        .catch(e => console.error('[autoBackup] scheduled run failed:', e))
        .finally(scheduleNext);
    } else {
      console.log('[autoBackup] scheduled run skipped (disabled)');
      scheduleNext();
    }
  }, delay);
  if (typeof scheduleTimer.unref === 'function') scheduleTimer.unref();
}

export function rescheduleAutoBackup(): void {
  if (scheduleTimer) { clearTimeout(scheduleTimer); scheduleTimer = null; }
  scheduleNext();
}

export function startAutoBackupScheduler(): void {
  if (scheduleTimer) return; 
  scheduleNext();
  const cfg = getConfigSafe();
  console.log(`[autoBackup] scheduler armed — daily at ${String(cfg.hour).padStart(2, '0')}:00, enabled=${cfg.enabled}`);
}

export function stopAutoBackupScheduler(): void {
  if (scheduleTimer) { clearTimeout(scheduleTimer); scheduleTimer = null; }
}
