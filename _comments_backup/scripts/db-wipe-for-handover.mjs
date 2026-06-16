#!/usr/bin/env node
// Wipes user-entered data from the live DB for software handover.
// - Keeps schema and migration history.
// - Keeps system seed data: roles, contract_section_templates.
// - Keeps the admin user; resets its password to Admin@123 (must_change=1).
// - Deletes all other users and all business/audit/session data.
// - Resets company_settings to defaults.
// - Resets auto-increment counters.
//
// Stop the Express server BEFORE running.

import initSqlJs from 'sql.js';
import { argon2id } from 'hash-wasm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.argv[2] || path.join(__dirname, '..', 'data', 'promix.db');

const KEEP_INTACT = new Set([
  '_migrations',
  'roles',
  'contract_section_templates',
]);

const ADMIN_DEFAULT_PASSWORD = 'Admin@123';

const SQL = await initSqlJs();
const buf = fs.readFileSync(dbPath);
const db = new SQL.Database(buf);

const tables = db
  .exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]
  .values.map(r => r[0]);

const wiped = [];
const skipped = [];

for (const t of tables) {
  if (KEEP_INTACT.has(t)) {
    skipped.push(t);
    continue;
  }
  if (t === 'users') continue; // handled below
  if (t === 'company_settings') continue; // handled below
  const before = db.exec(`SELECT COUNT(*) FROM "${t}"`)[0].values[0][0];
  db.run(`DELETE FROM "${t}"`);
  wiped.push({ table: t, deleted: before });
}

// users: keep only admin (id=1), reset password
const salt = crypto.randomBytes(16);
const adminHash = await argon2id({
  password: ADMIN_DEFAULT_PASSWORD,
  salt,
  parallelism: 1,
  iterations: 2,
  memorySize: 19456,
  hashLength: 32,
  outputType: 'encoded',
});

const usersBefore = db.exec("SELECT COUNT(*) FROM users")[0].values[0][0];
db.run("DELETE FROM users WHERE username <> 'admin'");
db.run(
  `UPDATE users
     SET password_hash = ?,
         must_change_password = 1,
         active = 1,
         last_login = NULL,
         updated_at = datetime('now')
   WHERE username = 'admin'`,
  [adminHash]
);
const usersAfter = db.exec("SELECT COUNT(*) FROM users")[0].values[0][0];

// company_settings: reset to safe defaults but keep row id=1
db.run(`
  UPDATE company_settings
     SET company_name = '',
         cui = '',
         reg_com = '',
         address = '',
         city = '',
         county = '',
         bank_name = '',
         iban = '',
         tva_rate = 0.19,
         default_currency = 'RON',
         eur_to_ron_rate = 4.97,
         updated_by = NULL,
         updated_at = datetime('now')
   WHERE id = 1
`);

// Reset autoincrement counters except for kept tables
db.run(`DELETE FROM sqlite_sequence WHERE name NOT IN ('roles', 'contract_section_templates', '_migrations', 'users', 'company_settings')`);
// Set users autoincrement to 1 so next user gets id=2 (admin keeps id=1)
db.run(`UPDATE sqlite_sequence SET seq = 1 WHERE name = 'users'`);

const out = Buffer.from(db.export());
fs.writeFileSync(dbPath, out);
db.close();

console.log('=== WIPE COMPLETE ===\n');
console.log(`Kept intact (${skipped.length}):`, skipped.join(', '));
console.log(`\nUsers: ${usersBefore} → ${usersAfter} (admin password reset to ${ADMIN_DEFAULT_PASSWORD}, must_change=1)\n`);
console.log(`Wiped (${wiped.length} tables):`);
const wipedWithRows = wiped.filter(w => w.deleted > 0).sort((a, b) => b.deleted - a.deleted);
for (const { table, deleted } of wipedWithRows) {
  console.log(`  ${table.padEnd(40)} -${deleted}`);
}
const emptyAlready = wiped.filter(w => w.deleted === 0).length;
console.log(`\n(plus ${emptyAlready} tables that were already empty)`);
console.log(`\nDB written: ${dbPath}`);
