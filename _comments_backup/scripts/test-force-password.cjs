/* eslint-disable */
// Isolated E2E of the forced-password-change flow against the REAL AuthService,
// on an in-memory sql.js DB seeded with the factory admin. Read-only re: repo.
const path = require('path');
const initSqlJs = require('sql.js');
const { AuthService } = require(path.resolve(__dirname, '../dist-server/electron/services/authService.js'));

const FACTORY_1234 = '$argon2id$v=19$m=19456,t=2,p=1$EK6meEuFaNQD4sZJmbfAiA$sFxmzCJQaYWHnsvidB3y/AKF46XJ0n1KhcoJ7NJoZnk';
let passed = 0, failed = 0;
function check(cond, label) { if (cond) { passed++; console.log('  ✓ ' + label); } else { failed++; console.log('  ✗ FAIL: ' + label); } }

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`CREATE TABLE roles(id INTEGER PRIMARY KEY, name TEXT, description TEXT);`);
  db.run(`INSERT INTO roles(id,name,description) VALUES (1,'admin','Administrator');`);
  db.run(`CREATE TABLE users(
    id INTEGER PRIMARY KEY, username TEXT, email TEXT, password_hash TEXT, full_name TEXT,
    role_id INTEGER, active INTEGER DEFAULT 1, last_login TEXT, custom_pages TEXT,
    must_change_password INTEGER DEFAULT 0, job_title TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    failed_login_attempts INTEGER DEFAULT 0, locked_until TEXT, totp_enabled INTEGER DEFAULT 0);`);
  db.run(`INSERT INTO users(id,username,email,password_hash,full_name,role_id,active,must_change_password)
          VALUES (1,'admin','admin@local',?,'Administrator',1,1,1);`, [FACTORY_1234]);
  db.run(`CREATE TABLE sessions(id TEXT PRIMARY KEY, user_id INTEGER, token_hash TEXT, expires_at TEXT, ip_address TEXT);`);
  db.run(`CREATE TABLE audit_logs(id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT, entity_type TEXT, entity_id INTEGER, details TEXT, ip_address TEXT, created_at TEXT DEFAULT (datetime('now')));`);

  console.log('1) Login admin/1234 (factory default):');
  const r1 = await AuthService.login(db, 'admin', '1234', '127.0.0.1');
  check(!!r1.token, 'login succeeds');
  check(r1.user.must_change_password === true, 'response carries must_change_password = true (gate fires)');
  const token = r1.token;

  console.log('2) Try to set a WEAK new password (should be rejected):');
  for (const weak of ['admin1234', 'Short1!', 'NoSymbol1234', 'Promix2026Plant!']) {
    let rejected = false, msg = '';
    try { await AuthService.changePassword(db, token, '1234', weak, '127.0.0.1'); }
    catch (e) { rejected = true; msg = e && e.message; }
    check(rejected, `rejected "${weak}"  (${msg})`);
  }

  console.log('3) Set a STRONG new password (should succeed + clear flag):');
  const r3 = await AuthService.changePassword(db, token, '1234', 'Macara-Beton-7Q!', '127.0.0.1');
  check(r3.must_change_password === false, 'returned user has must_change_password = false');

  console.log('4) Re-login with the NEW password:');
  const r4 = await AuthService.login(db, 'admin', 'Macara-Beton-7Q!', '127.0.0.1');
  check(!!r4.token && r4.user.must_change_password === false, 'logs in normally, flag cleared');

  console.log('5) The OLD password must no longer work:');
  let oldRejected = false;
  try { await AuthService.login(db, 'admin', '1234', '127.0.0.1'); } catch { oldRejected = true; }
  check(oldRejected, 'admin/1234 is rejected after rotation');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
