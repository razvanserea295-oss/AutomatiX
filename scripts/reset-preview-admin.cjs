// One-off: reset an admin password in the ISOLATED preview DB (.preview-data)
// so the UX audit can log in. Never touches the live data/ dir.
const path = require('path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
process.env.PROMIX_DATA_DIR = path.join(root, '.preview-data');
process.env.PROMIX_ALLOW_DEFAULT_CREDS = '1';

(async () => {
  const db = require(path.join(root, 'dist-server', 'server', 'db.js'));
  const { hashPassword } = require(path.join(root, 'dist-server', 'electron', 'security', 'password.js'));
  const d = await db.initDatabaseForServer();

  // List admins
  const rows = [];
  const stmt = d.prepare(`SELECT u.id, u.username, r.name AS role, u.active, u.must_change_password
                            FROM users u LEFT JOIN roles r ON u.role_id = r.id
                           ORDER BY u.id LIMIT 30`);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  console.log('USERS:', JSON.stringify(rows));

  const admin = rows.find((r) => r.username === 'razvan') || rows.find((r) => String(r.role || '').toLowerCase() === 'admin' && r.active) || rows[0];
  if (!admin) { console.log('NO_USER'); process.exit(1); }

  const pw = 'AuditPreview!2026';
  d.run('UPDATE users SET password_hash = ?, must_change_password = 0, active = 1 WHERE id = ?', [await hashPassword(pw), admin.id]);
  db.flushDatabase();
  console.log(`RESET_OK id=${admin.id} username=${admin.username} password=${pw}`);
  process.exit(0);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
