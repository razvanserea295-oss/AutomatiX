// db-clear-mockup-data.mjs
//
// One-shot cleanup: empties every business table in promix.db while keeping
// the user authentication system (users, roles, sessions, audit_logs) and
// the migration tracking (_migrations, sqlite_sequence).
//
// Usage:
//   node scripts/db-clear-mockup-data.mjs
//
// Safe to run repeatedly. Backs up the DB before touching it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'data', 'promix.db');

if (!fs.existsSync(dbPath)) {
  console.error(`[clear] DB not found at ${dbPath}`);
  process.exit(1);
}

// Tables we keep intact (auth + system bookkeeping).
const KEEP = new Set([
  'users',
  'roles',
  'sessions',
  'audit_logs',
  '_migrations',
  'sqlite_sequence',
]);

// Backup first.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(projectRoot, 'backups', `pre-clear-mockup-${stamp}.db`);
fs.mkdirSync(path.dirname(backupPath), { recursive: true });
fs.copyFileSync(dbPath, backupPath);
console.log(`[clear] Backup written to ${backupPath}`);

// Load DB.
const SQL = await initSqlJs();
const buf = fs.readFileSync(dbPath);
const db  = new SQL.Database(buf);

// Enumerate all user tables.
const tableRows = [];
{
  const stmt = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  while (stmt.step()) tableRows.push(stmt.get()[0]);
  stmt.free();
}

// Disable FK enforcement so DELETEs don't trip on cross-table refs while
// we tear them down in arbitrary order.
db.run('PRAGMA foreign_keys = OFF');

const cleared = [];
const skipped = [];
for (const t of tableRows) {
  if (KEEP.has(t)) { skipped.push(t); continue; }
  try {
    db.run(`DELETE FROM "${t}"`);
    cleared.push(t);
  } catch (err) {
    console.warn(`[clear] failed to clear ${t}: ${err.message}`);
  }
}

// Reset autoincrement counters for cleared tables so new rows start at 1.
try {
  db.run(
    `DELETE FROM sqlite_sequence WHERE name NOT IN (${[...KEEP].map(n => `'${n}'`).join(',')})`
  );
} catch { /* sqlite_sequence may not exist if no AUTOINCREMENT was used */ }

db.run('PRAGMA foreign_keys = ON');

// Persist.
const outBuf = Buffer.from(db.export());
fs.writeFileSync(dbPath, outBuf);
db.close();

console.log(`[clear] Cleared ${cleared.length} tables, kept ${skipped.length} (${[...skipped].join(', ')}).`);
console.log(`[clear] Done. DB written to ${dbPath}`);
