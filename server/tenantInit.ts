




















import type { Database } from 'sql.js';







const KEEP_TABLES = new Set<string>([
  '_migrations',
  'roles',
  'company_settings',
  'app_settings',
  'users',
]);

export function ensureBlankTenant(db: Database): void {
  const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const tables: string[] = res.length ? res[0].values.map((r) => String(r[0])) : [];

  db.run('PRAGMA foreign_keys = OFF');
  let cleared = 0;
  for (const t of tables) {
    if (KEEP_TABLES.has(t)) continue;
    db.run(`DELETE FROM "${t}"`);
    cleared++;
  }

  
  
  
  db.run("DELETE FROM users WHERE username != 'admin'");
  
  db.run("UPDATE users SET full_name = 'Administrator', email = 'admin@tenant.local' WHERE username = 'admin'");

  
  
  
  const name = (process.env.PROMIX_TENANT_NAME || '').trim();
  if (name) {
    db.run('UPDATE company_settings SET company_name = ? WHERE id = 1', [name]);
  }

  db.run('PRAGMA foreign_keys = ON');

  console.log(`[tenant] blank init: cleared ${cleared} business tables, kept ${KEEP_TABLES.size - 1} infra tables + admin${name ? ` — company: ${name}` : ''}`);
}
