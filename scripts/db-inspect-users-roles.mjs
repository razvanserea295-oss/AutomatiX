import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'promix.db');
const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(dbPath));

function dump(label, sql) {
  console.log(`\n=== ${label} ===`);
  try {
    const r = db.exec(sql);
    if (!r[0]) { console.log('(empty)'); return; }
    console.log(r[0].columns.join(' | '));
    for (const row of r[0].values) console.log(row.map(v => String(v ?? '').slice(0, 50)).join(' | '));
  } catch (e) { console.log('ERR:', e.message); }
}

dump('users', "SELECT id, username, role, email, must_change_password FROM users");
dump('roles', "SELECT * FROM roles");
dump('company_settings', "SELECT * FROM company_settings LIMIT 1");
dump('contract_section_templates (first 3)', "SELECT id, name FROM contract_section_templates LIMIT 3");
dump('document_categories', "SELECT * FROM document_categories");
dump('warehouse_locations', "SELECT * FROM warehouse_locations");
dump('email_accounts (no body)', "SELECT id, email, name FROM email_accounts");
