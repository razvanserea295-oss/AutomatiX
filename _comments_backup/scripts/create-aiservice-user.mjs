// Inserts a minimal-role 'aiservice' user used by ai-service as the fallback
// service account. Real per-request authorization comes from the caller's JWT;
// this account exists only so the Rust process can boot (login bootstrap).
//
// Usage: node scripts/create-aiservice-user.mjs
// Prints the generated random password — copy it into ai-service/config.toml.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { argon2id } from 'hash-wasm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '..', 'data', 'promix.db');

const SQL = await initSqlJs();
const dbBytes = fs.readFileSync(DB_PATH);
const db = new SQL.Database(dbBytes);

const roles = db.exec('SELECT id, name, description FROM roles ORDER BY id')[0];
console.log('Existing roles:');
for (const row of roles.values) console.log(`  ${row[0]}  ${row[1].padEnd(12)} ${row[2] ?? ''}`);

// Pick the most restrictive non-disabled role. From migration 031, roles 5/7/8/9/10
// are flagged [DEZACTIVAT]. The lowest active operational role is typically 'hala'
// or 'muncitor' (id=4). Prefer id=4 if present and not disabled.
const activeRoles = roles.values.filter(r => !String(r[2] ?? '').startsWith('[DEZACTIVAT]'));
const muncitor = activeRoles.find(r => r[0] === 4) || activeRoles.find(r => r[1] === 'muncitor');
const fallbackRole = muncitor ?? activeRoles[activeRoles.length - 1];
const roleId = fallbackRole[0];
const roleName = fallbackRole[1];
console.log(`\nChosen fallback role: id=${roleId} name=${roleName}`);

// Generate strong password (32 chars, alphanumeric — no shell-quoting issues).
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function randomPassword(len) {
  const buf = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}
const password = randomPassword(32);

const salt = crypto.randomBytes(16);
const hash = await argon2id({
  password, salt,
  parallelism: 1, iterations: 2, memorySize: 19456,
  hashLength: 32, outputType: 'encoded',
});

const exists = db.exec("SELECT id FROM users WHERE username = 'aiservice'")[0];
if (exists) {
  const id = exists.values[0][0];
  db.run(
    'UPDATE users SET password_hash = ?, role_id = ?, active = 1, updated_at = datetime("now") WHERE id = ?',
    [hash, roleId, id],
  );
  console.log(`\nUpdated existing aiservice user (id=${id})`);
} else {
  db.run(
    `INSERT INTO users (username, email, password_hash, full_name, role_id, active)
     VALUES ('aiservice', 'aiservice@local.invalid', ?, 'AI Service (fallback bootstrap account)', ?, 1)`,
    [hash, roleId],
  );
  console.log('\nInserted aiservice user');
}

// Make sure we don't carry over a force-password-change flag on this account.
const cols = db.exec("PRAGMA table_info(users)")[0]?.values.map(r => r[1]) ?? [];
if (cols.includes('must_change_password')) {
  db.run("UPDATE users SET must_change_password = 0 WHERE username = 'aiservice'");
}

const out = Buffer.from(db.export());
fs.writeFileSync(DB_PATH, out);
db.close();

console.log('\n=========================================================');
console.log(`username:     aiservice`);
console.log(`password:     ${password}`);
console.log(`role_id:      ${roleId} (${roleName})`);
console.log('=========================================================');
console.log('Copy these into ai-service/config.toml [erp].');
