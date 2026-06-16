#!/usr/bin/env node

import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'promix.db');

const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(dbPath));
db.run("UPDATE users SET must_change_password = 0 WHERE username = 'admin'");
fs.writeFileSync(dbPath, Buffer.from(db.export()));
db.close();
console.log('admin.must_change_password = 0');
