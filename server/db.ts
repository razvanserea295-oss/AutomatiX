










import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { getDbKey, isEncryptedBuffer, encryptDb, decryptDb } from './dbCrypto';

let _db: Database | null = null;



let _freshlyCreated = false;


export function isFreshDatabase(): boolean {
  return _freshlyCreated;
}











export function getDataDir(): string {
  return process.env.PROMIX_DATA_DIR
    ? path.resolve(process.env.PROMIX_DATA_DIR)
    : path.join(process.cwd(), 'data');
}

export function getDbPath(): string {
  const dataDir = getDataDir();
  fs.mkdirSync(dataDir, { recursive: true });
  
  
  
  const file = process.env.PROMIX_DEMO === '1' ? 'promix-demo.db' : 'promix.db';
  return path.join(dataDir, file);
}

export async function initDatabaseForServer(): Promise<Database> {
  if (_db) return _db;

  const SQL = await initSqlJs();
  const dbPath = getDbPath();
  const key = getDbKey(getDataDir());

  if (fs.existsSync(dbPath)) {
    const blob = fs.readFileSync(dbPath);
    let plaintext: Buffer;
    if (isEncryptedBuffer(blob)) {
      if (!key) {
        throw new Error('[db] DB file is encrypted but no key available (PROMIX_DB_KEY / data/.dbkey)');
      }
      plaintext = decryptDb(blob, key);
      console.log(`[db] Loaded encrypted database from ${dbPath}`);
    } else {
      plaintext = blob;
      console.log(`[db] Loaded existing (plain) database from ${dbPath} — will re-save encrypted`);
    }
    _db = new SQL.Database(plaintext);
  } else {
    _db = new SQL.Database();
    _freshlyCreated = true;
    console.log(`[db] Created new database at ${dbPath}`);
  }

  _db.run('PRAGMA foreign_keys = ON');
  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA busy_timeout = 5000');

  return _db;
}

export function getDb(): Database {
  if (!_db) throw new Error('Database not initialized');
  return _db;
}











const SAVE_DEBOUNCE_MS = 500;
let _saveTimer: NodeJS.Timeout | null = null;

export function saveDatabase(): void {
  if (!_db) return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    try { saveDatabaseNow(); }
    catch (e) { console.error('[db] debounced save failed:', e instanceof Error ? e.message : e); }
  }, SAVE_DEBOUNCE_MS);
  _saveTimer.unref?.();
}


export function flushDatabase(): void {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  saveDatabaseNow();
}

function saveDatabaseNow(): void {
  if (!_db) return;
  const plaintext = Buffer.from(_db.export());
  const key = getDbKey(getDataDir());
  
  
  
  const blob = key ? encryptDb(plaintext, key) : plaintext;
  atomicWrite(getDbPath(), blob);
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

export function closeDatabase(): void {
  if (_db) {
    flushDatabase(); 
    _db.close();
    _db = null;
  }
}
