import initSqlJs from 'sql.js';
import fs from 'fs';
const dbPath = '/home/admin/.config/promix-automatix/data/promix.db';
const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(dbPath));
const allTables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
console.log('Counts for all tables:');
const out = [];
for (const row of allTables[0].values) {
  const t = row[0];
  try {
    const r = db.exec(`SELECT COUNT(*) FROM ${t}`);
    out.push({ name: t, count: r[0].values[0][0] });
  } catch {}
}
out.sort((a, b) => b.count - a.count);
for (const r of out) console.log(`  ${r.name.padEnd(32)} ${r.count}`);
