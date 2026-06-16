#!/usr/bin/env node




import { argon2id } from 'hash-wasm';
import initSqlJs from 'sql.js';
import fs from 'node:fs';
import crypto from 'node:crypto';

const password = process.argv[2];
const dbPath = process.argv[3] || '/home/admin/Automatix-Dev/data/promix.db';

if (!password) {
  console.error('Usage: node reset-admin-password.mjs <new-password> [db-path]');
  process.exit(1);
}

const SQL = await initSqlJs();
const buf = fs.readFileSync(dbPath);
const db = new SQL.Database(buf);

const salt = crypto.randomBytes(16);
const hash = await argon2id({
  password, salt,
  parallelism: 1, iterations: 2, memorySize: 19456,
  hashLength: 32, outputType: 'encoded',
});

db.run(
  `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE username = 'admin'`,
  [hash]
);

const out = Buffer.from(db.export());
fs.writeFileSync(dbPath, out);
db.close();
console.log(`[reset] admin password updated in ${dbPath}`);
