import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
const dbPath = '/home/admin/.config/promix-automatix/data/promix.db';
const SQL = await initSqlJs({ locateFile: (f) => path.join('node_modules/sql.js/dist', f) });
const buf = fs.readFileSync(dbPath);
const db = new SQL.Database(buf);
const tables = ['users', 'projects', 'clients', 'materials', 'pieces', 'workers', 'time_entries', 'documents', 'alerts', 'contracts', 'stations', 'suppliers'];
console.log('Table row counts:');
for (const t of tables) {
  try {
    const r = db.exec(`SELECT COUNT(*) FROM ${t}`);
    console.log(`  ${t}: ${r[0].values[0][0]}`);
  } catch (e) {
    console.log(`  ${t}: (table not found)`);
  }
}
console.log('\nAll tables:');
const allTables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
if (allTables[0]) {
  for (const row of allTables[0].values) console.log(`  ${row[0]}`);
}
