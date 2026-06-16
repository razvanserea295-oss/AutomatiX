#!/usr/bin/env node
// One-off inspector: prints what the Step-6 demo seed actually wrote.
// Run AFTER the server has had a chance to auto-save (≥30s after seeding).
//
// Usage: node scripts/inspect-demo-seed.mjs [db-path]

import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dbPath = process.argv[2] || path.join(process.cwd(), 'data', 'promix.db');
const keyFile = path.join(path.dirname(dbPath), '.dbkey');

if (!fs.existsSync(dbPath)) {
  console.error(`DB not found: ${dbPath}`);
  process.exit(1);
}

const MAGIC = Buffer.from('PMXENC01', 'utf8');
const MAGIC_LEN = MAGIC.length;
const IV_LEN = 12;
const TAG_LEN = 16;

const raw = fs.readFileSync(dbPath);
let plain;
if (raw.length >= MAGIC_LEN && raw.subarray(0, MAGIC_LEN).equals(MAGIC)) {
  if (!fs.existsSync(keyFile)) {
    console.error(`Encrypted DB but no .dbkey at ${keyFile}`);
    process.exit(1);
  }
  const keyHex = fs.readFileSync(keyFile, 'utf8').trim();
  const key = Buffer.from(keyHex, 'hex');
  const iv  = raw.subarray(MAGIC_LEN, MAGIC_LEN + IV_LEN);
  const tag = raw.subarray(MAGIC_LEN + IV_LEN, MAGIC_LEN + IV_LEN + TAG_LEN);
  const ct  = raw.subarray(MAGIC_LEN + IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  console.log(`[inspect] decrypted (${plain.length} bytes)`);
} else {
  plain = raw;
  console.log('[inspect] plain SQLite file');
}

const SQL = await initSqlJs();
const db = new SQL.Database(plain);

function dump(title, sql, params = []) {
  console.log(`\n=== ${title} ===`);
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  if (rows.length === 0) { console.log('  (no rows)'); return; }
  for (const r of rows) console.log(' ', JSON.stringify(r));
}

// Look for the user's missing piece
dump('pieces matching EL_1 M2Ref Cuva1 opus',
  `SELECT id, name, source_file_name, supplier_code, project_id FROM project_pieces WHERE name LIKE '%EL_1 M2Ref Cuva1 opus%' OR source_file_name LIKE '%EL_1 M2Ref Cuva1 opus%' OR name LIKE '%M2Ref Cuva1 opus%Copy%' OR source_file_name LIKE '%M2Ref Cuva1 opus%Copy%' LIMIT 10`);

dump('count of M2Ref pieces total',
  `SELECT COUNT(*) AS n FROM project_pieces WHERE name LIKE '%M2Ref%' OR source_file_name LIKE '%M2Ref%'`);

dump('pieces containing Copy',
  `SELECT id, name, source_file_name, project_id FROM project_pieces WHERE name LIKE '%Copy%' OR source_file_name LIKE '%Copy%' LIMIT 10`);

dump('every piece_order_tracking entry (kanban contents)',
  `SELECT t.id, t.status, t.supplier_code, pp.name, pp.source_file_name
     FROM piece_order_tracking t JOIN project_pieces pp ON pp.id = t.piece_id
    ORDER BY t.id DESC LIMIT 20`);

// Live state of the M2Ref pieces — looking for the specific one the user searched
dump('pieces with EL prefix and supplier_code',
  `SELECT id, name, source_file_name, supplier_code, project_id FROM project_pieces WHERE supplier_code = 'EL' LIMIT 20`);

dump('latest pieces added to any project',
  `SELECT id, name, source_file_name, supplier_code, project_id FROM project_pieces WHERE source_file_name IS NOT NULL ORDER BY id DESC LIMIT 20`);

dump('total pieces with M2Ref',
  `SELECT id, name, source_file_name, project_id FROM project_pieces WHERE name LIKE '%M2Ref%' OR source_file_name LIKE '%M2Ref%' LIMIT 30`);

// Try with EL prefix specifically — case-insensitive
dump('pieces starting with EL (any case)',
  `SELECT id, name, source_file_name, project_id FROM project_pieces WHERE LOWER(name) LIKE 'el_%' OR LOWER(name) LIKE 'el %' OR LOWER(source_file_name) LIKE 'el_%' OR LOWER(source_file_name) LIKE 'el %' LIMIT 20`);

dump('count total pieces in DB',
  `SELECT COUNT(*) AS n FROM project_pieces`);

dump('pieces matching opus.*Copy',
  `SELECT id, name, source_file_name, project_id FROM project_pieces WHERE name LIKE '%opus%' AND name LIKE '%Copy%' LIMIT 10`);

dump('list of tables present',
  `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','roles','user_notifications','project_briefings','briefing_clarifications','piece_order_tracking','fisa_templates','demo_seed_log','_migrations') ORDER BY name`);

dump('migrations applied (last 8)',
  `SELECT * FROM _migrations ORDER BY id DESC LIMIT 8`);

dump('all migrations starting with 093',
  `SELECT * FROM _migrations WHERE filename LIKE '093%'`);

dump('user count and admin row',
  `SELECT id, username, full_name, role_id, active FROM users WHERE username IN ('admin', 'demo_proiectant') ORDER BY id`);

dump('total user count',
  `SELECT COUNT(*) AS total FROM users`);

dump('top 5 users by id',
  `SELECT id, username, full_name, active FROM users ORDER BY id LIMIT 5`);

dump('seeded users',
  `SELECT u.id, u.username, u.full_name, u.active, u.role_id, r.name AS role_name, u.job_title,
          SUBSTR(u.password_hash, 1, 30) AS hash_prefix
     FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.username = 'demo_proiectant'`);

dump('all roles',
  `SELECT id, name, description FROM roles ORDER BY id`);

dump('seeded briefings (titles + status)',
  `SELECT id, title, status, assigned_to_user_id, created_by_user_id, priority FROM project_briefings WHERE title LIKE '% — DEMO' ORDER BY id`);

dump('seeded piece order tracking',
  `SELECT t.id, t.status, t.supplier_code, pp.name AS piece_name
     FROM piece_order_tracking t JOIN project_pieces pp ON pp.id = t.piece_id
    WHERE pp.name IN ('PLC Siemens S7-1200', 'Motor electric 30kW', 'Filtru praf siloz', 'Supapă siguranță presiune')`);

dump('seeded notifications (last 4)',
  `SELECT id, user_id, kind, title FROM user_notifications ORDER BY id DESC LIMIT 4`);

dump('seeded fisa templates',
  `SELECT id, name, description, is_default FROM fisa_templates WHERE name LIKE '% — DEMO'`);

db.close();
