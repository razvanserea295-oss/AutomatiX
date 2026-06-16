import initSqlJs from 'sql.js';
import fs from 'fs';
const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync('/home/admin/.config/promix-automatix/data/promix.db'));
const tables = ['suppliers', 'documents', 'finance_invoices', 'project_revenues', 'project_expenses', 'contracts', 'project_comments', 'material_consumptions', 'sales_leads', 'deplasari', 'purchase_orders', 'stock_movements'];
for (const t of tables) {
  try {
    const r = db.exec(`PRAGMA table_info(${t})`);
    console.log(`\n=== ${t} ===`);
    for (const row of r[0].values) console.log(`  ${row[1].padEnd(28)} ${row[2]}${row[3] ? ' NN' : ''}${row[4] != null ? ` def=${row[4]}` : ''}${row[5] ? ' PK' : ''}`);
  } catch { console.log(`\n=== ${t} === (not found)`); }
}
