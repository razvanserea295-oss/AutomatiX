#!/usr/bin/env node



import initSqlJs from 'sql.js';
import fs from 'node:fs';

const dbPath = process.argv[2] || '/home/admin/Automatix-Dev/data/promix.db';

const SQL = await initSqlJs();
const buf = fs.readFileSync(dbPath);
const db = new SQL.Database(buf);

const cols = db.exec("PRAGMA table_info(users)")[0].values.map(r => r[1]);
if (cols.includes('must_change_password')) {
  console.log('[migrate] users.must_change_password already exists, nothing to do.');
} else {
  db.run("ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0");
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('[migrate] Added users.must_change_password (default 0)');
}
db.close();
