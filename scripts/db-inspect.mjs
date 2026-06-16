import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'promix.db');

const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(dbPath));

const tablesRes = db.exec(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
const tableNames = (tablesRes[0]?.values || []).map(r => r[0]);

const rows = [];
for (const t of tableNames) {
  try {
    const r = db.exec(`SELECT COUNT(*) FROM "${t}"`);
    const count = r[0].values[0][0];
    rows.push({ table: t, count });
  } catch (e) {
    rows.push({ table: t, count: `ERR: ${e.message}` });
  }
}

rows.sort((a, b) => (typeof a.count === 'number' ? b.count - a.count : 0));

console.log(`Total tables: ${tableNames.length}\n`);
console.log('Table'.padEnd(40), 'Rows');
console.log('-'.repeat(55));
for (const { table, count } of rows) {
  console.log(table.padEnd(40), count);
}
