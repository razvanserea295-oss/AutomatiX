

import path from 'path';
import { pathToFileURL } from 'url';

const root = process.cwd();
const m = await import(pathToFileURL(path.join(root, 'dist-server/server/db.js')).href);
const api = m.initDatabaseForServer ? m : m.default;
const { initDatabaseForServer, getDb } = api;

const CAP = 16 * 1024 * 1024;
const mb = (n) => (n / 1048576).toFixed(2) + 'MB';

await initDatabaseForServer();
const db = getDb();
function rows(sql) {
  const out = []; const st = db.prepare(sql);
  while (st.step()) out.push(st.getAsObject());
  st.free(); return out;
}

const t = rows('SELECT COUNT(*) c, COALESCE(SUM(length(data)),0) s FROM lead_attachments')[0];
console.log(`Total: ${t.c} attachment row(s), ${mb(t.s)} of inline base64 data\n`);
console.log('All attachments by size:');
for (const r of rows('SELECT id, lead_id, kind, filename, length(data) AS len FROM lead_attachments ORDER BY len DESC')) {
  const flag = r.len > CAP ? '  <== WOULD BE DELETED (> 16MB)' : '';
  console.log(`  #${r.id} lead=${r.lead_id} [${r.kind}] ${r.filename ?? '(no name)'} — ${mb(r.len)}${flag}`);
}
