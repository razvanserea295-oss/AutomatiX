import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';





let electronApp: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('electron');
  if (electron && typeof electron === 'object' && electron.app) {
    electronApp = electron.app;
  }
} catch {
  
}

let _db: Database | null = null;
let _externalSave: (() => void) | null = null;

function getDbPath(): string {
  if (!electronApp) {
    throw new Error('[db/connection] electron.app unavailable; call installExternalDb() before initDatabase() in non-Electron mode.');
  }
  const dataDir = path.join(electronApp.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'promix.db');
}

export async function initDatabase(): Promise<Database> {
  if (_db) return _db;

  const SQL = await initSqlJs();
  const dbPath = getDbPath();

  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    _db = new SQL.Database(buffer);
  } else {
    _db = new SQL.Database();
  }

  
  _db.run('PRAGMA foreign_keys = ON');
  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA busy_timeout = 5000');

  return _db;
}









export function installExternalDb(db: Database, save: () => void): void {
  _db = db;
  _externalSave = save;
}

export function getDb(): Database {
  if (!_db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return _db;
}

let _saveTimer: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 500;


function saveDatabaseNow(): void {
  if (!_db) return;
  if (_externalSave) {
    _externalSave();
    return;
  }
  const data = _db.export();
  const buffer = Buffer.from(data);
  atomicWrite(getDbPath(), buffer);
}












function atomicWrite(targetPath: string, data: Buffer): void {
  const dir = path.dirname(targetPath);
  const tmp = path.join(dir, `.${path.basename(targetPath)}.tmp-${process.pid}-${Date.now()}`);
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  
  
  
  try {
    fs.renameSync(tmp, targetPath);
  } catch {
    fs.copyFileSync(tmp, targetPath);
    try { fs.unlinkSync(tmp); } catch {  }
  }
}






export function saveDatabase(): void {
  if (!_db) return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    try { saveDatabaseNow(); } catch (e) { console.error('[db] save failed:', e); }
  }, SAVE_DEBOUNCE_MS);
}


export function flushDatabase(): void {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  saveDatabaseNow();
}

export function closeDatabase(): void {
  if (_db) {
    flushDatabase();
    _db.close();
    _db = null;
  }
}
