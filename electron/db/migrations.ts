import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';



let app: any = undefined;
try {
  const _e = require('electron');
  if (_e && typeof _e === 'object') { app = _e.app; }
} catch {  }














export function runMigrations(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT
    )
  `);

  
  
  const candidates = [
    path.join(__dirname, '../../migrations'),       
    path.join(__dirname, '../../../migrations'),    
    path.join(process.cwd(), 'migrations'),         
  ];
  const migrationsDir = candidates.find(p => fs.existsSync(p)) || candidates[0];

  if (!fs.existsSync(migrationsDir)) {
    console.warn('[migrations] No migrations directory found. Tried:\n  - ' + candidates.join('\n  - '));
    return;
  }
  console.log('[migrations] Using directory:', migrationsDir);

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const stmt = db.prepare('SELECT filename FROM _migrations');
  const applied = new Set<string>();
  while (stmt.step()) {
    applied.add(stmt.get()[0] as string);
  }
  stmt.free();

  // ── Rename aliases ────────────────────────────────────────────────────────
  // When a migration file is renamed on disk (e.g. to resolve a duplicate
  // number), DBs that already applied it under the OLD name must NOT re-run it:
  // these migrations use `ALTER TABLE ADD COLUMN`, which is not idempotent and
  // would throw "duplicate column" and fail the boot. So if the OLD name is in
  // `_migrations`, record the NEW name as applied too (no SQL re-run). Fresh
  // installs (old name never applied) run the new file normally.
  const RENAMED: Record<string, string> = {
    // newFilename : oldFilename  (110_initial_setup collided with 110_briefing_*)
    '122_initial_setup.sql': '110_initial_setup.sql',
  };
  for (const [newName, oldName] of Object.entries(RENAMED)) {
    if (files.includes(newName) && applied.has(oldName) && !applied.has(newName)) {
      db.run('INSERT OR IGNORE INTO _migrations (filename, applied_at) VALUES (?, ?)', [newName, new Date().toISOString()]);
      applied.add(newName);
      console.log(`[migrations] '${newName}' inherited applied-state from renamed '${oldName}' (not re-run)`);
    }
  }

  const pending = files.filter(f => !applied.has(f));

  // ── Duplicate-number guard ────────────────────────────────────────────────
  // Two PENDING migrations sharing the same numeric prefix would be applied in
  // ambiguous (alphabetical) order — a silent footgun. Refuse to boot with a
  // clear message so the operator renumbers one. (Already-applied historical
  // collisions are tolerated — only NOT-yet-applied pairs are fatal.)
  const numOf = (f: string) => (f.match(/^(\d+)/)?.[1] ?? '');
  const byNumber = new Map<string, string[]>();
  for (const f of pending) {
    const n = numOf(f);
    if (!n) continue;
    const arr = byNumber.get(n) ?? [];
    arr.push(f);
    byNumber.set(n, arr);
  }
  const collisions = [...byNumber.entries()].filter(([, fs]) => fs.length > 1);
  if (collisions.length > 0) {
    const detail = collisions.map(([n, fs]) => `  #${n}: ${fs.join(', ')}`).join('\n');
    throw new Error(
      `[migrations] Duplicate migration number(s) among pending files — refusing to boot.\n` +
      `Renumber one file of each pair to a free slot, then restart:\n${detail}`,
    );
  }

  if (pending.length === 0) {
    console.log('[migrations] All migrations up to date');
    return;
  }

  console.log(`[migrations] Running ${pending.length} pending migration(s)...`);

  
  
  
  const backupFile = forcePreMigrateBackup(pending.length);
  if (!backupFile) {
    throw new Error('[migrations] Pre-migration backup failed — refusing to run migrations');
  }
  console.log(`[migrations] Pre-migration backup: ${backupFile}`);

  
  const before = snapshotRowCounts(db);

  
  db.run('PRAGMA foreign_keys = OFF');

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    
    
    
    try {
      db.run('BEGIN');
      db.exec(sql);
      db.run(
        'INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)',
        [file, new Date().toISOString()]
      );
      db.run('COMMIT');
      console.log(`[migrations] Applied: ${file}`);
    } catch (err) {
      try { db.run('ROLLBACK'); } catch {  }
      db.run('PRAGMA foreign_keys = ON');
      console.error(`[migrations] FAILED: ${file}`, err);
      console.error(`[migrations] Rolled back. Restore from ${backupFile} to recover.`);
      throw new Error(`Migration ${file} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  db.run('PRAGMA foreign_keys = ON');

  
  const after = snapshotRowCounts(db);
  const wipes = detectWipes(before, after);
  if (wipes.length > 0) {
    throw new Error(
      `[migrations] Row count dropped to 0 on tables that had data: ${wipes.join(', ')}. ` +
      `Restore from ${backupFile} and investigate.`
    );
  }

  console.log('[migrations] All migrations applied successfully');
}







function forcePreMigrateBackup(pendingCount: number): string | null {
  try {
    
    
    
    
    
    
    const userDataDir = app?.getPath?.('userData');
    const envDataDir = process.env.PROMIX_DATA_DIR ? path.resolve(process.env.PROMIX_DATA_DIR) : null;
    const dataDir = userDataDir ? path.join(userDataDir, 'data') : (envDataDir || path.join(process.cwd(), 'data'));
    const backupRoot = userDataDir
      ? path.join(userDataDir, 'backups')
      : (envDataDir ? path.join(path.dirname(envDataDir), 'backups') : path.join(process.cwd(), 'backups'));

    const src = path.join(dataDir, 'promix.db');
    if (!fs.existsSync(src)) {
      
      return 'no-prior-db';
    }
    fs.mkdirSync(backupRoot, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(backupRoot, `pre-migrate-${stamp}-n${pendingCount}.db`);
    fs.copyFileSync(src, dest);
    return dest;
  } catch (err) {
    console.error('[migrations] Backup failed:', err);
    return null;
  }
}





const CRITICAL_TABLES = [
  'users', 'projects', 'pieces', 'clients', 'materials',
  'contracts', 'production_docs', 'stations', 'documents',
];

function snapshotRowCounts(db: Database): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of CRITICAL_TABLES) {
    try {
      const stmt = db.prepare(`SELECT COUNT(*) FROM ${t}`);
      if (stmt.step()) out.set(t, stmt.get()[0] as number);
      stmt.free();
    } catch {
      
    }
  }
  return out;
}


function detectWipes(before: Map<string, number>, after: Map<string, number>): string[] {
  const wiped: string[] = [];
  for (const [table, count] of before) {
    if (count > 0 && (after.get(table) ?? 0) === 0) wiped.push(`${table} (was ${count})`);
  }
  return wiped;
}
