import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'promix.db');
const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(dbPath));

console.log('--- users schema ---');
for (const row of db.exec("PRAGMA table_info(users)")[0].values) {
  console.log(`  ${row[1].padEnd(30)} ${row[2]}${row[3] ? ' NN' : ''}${row[4] != null ? ` def=${row[4]}` : ''}${row[5] ? ' PK' : ''}`);
}

console.log('\n--- existing users (no password) ---');
const r = db.exec("SELECT id, username, role_id, must_change_password FROM users");
for (const row of r[0].values) console.log(' ', row.join(' | '));
