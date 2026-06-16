// One-off DB maintenance: remove oversized inline lead attachments (the source
// of the 377 MB bloat) and VACUUM to reclaim the freed pages. Uses the project's
// own encrypted-DB load/save path (dist-server/server/db.js) so the file is read
// and rewritten with the same AES-256-GCM key. A backup is taken by the caller
// BEFORE running this. The server must NOT be running while this executes.
import path from 'path';
import { pathToFileURL } from 'url';

const root = process.cwd();
const m = await import(pathToFileURL(path.join(root, 'dist-server/server/db.js')).href);
const api = m.initDatabaseForServer ? m : m.default;
const { initDatabaseForServer, getDb, flushDatabase } = api;

const CAP = 16 * 1024 * 1024; // matches ATTACHMENT_MAX_CHARS in salesService.ts
const mb = (n) => (n / 1048576).toFixed(1) + 'MB';

await initDatabaseForServer();
const db = getDb();

function rows(sql, params = []) {
  const out = [];
  const st = db.prepare(sql);
  if (params.length) st.bind(params);
  while (st.step()) out.push(st.getAsObject());
  st.free();
  return out;
}

const totalBefore = rows('SELECT COUNT(*) c, COALESCE(SUM(length(data)),0) s FROM lead_attachments')[0];
console.log(`lead_attachments BEFORE: ${totalBefore.c} rows, ${mb(totalBefore.s)} of inline data`);
const top = rows('SELECT id, lead_id, filename, length(data) AS len FROM lead_attachments ORDER BY len DESC LIMIT 5');
for (const r of top) console.log(`  #${r.id} lead=${r.lead_id} ${r.filename ?? '(no name)'} — ${mb(r.len)}`);

const big = rows('SELECT id, filename, length(data) AS len FROM lead_attachments WHERE length(data) > ?', [CAP]);
if (big.length === 0) {
  console.log('No oversized attachments (> 16MB) found — nothing to delete.');
} else {
  console.log(`Deleting ${big.length} oversized attachment(s): ` +
    big.map((b) => `#${b.id} ${b.filename ?? ''} ${mb(b.len)}`).join(', '));
  db.run('DELETE FROM lead_attachments WHERE length(data) > ?', [CAP]);
}

console.log('Running VACUUM to reclaim freed pages...');
db.run('VACUUM');

flushDatabase(); // export + AES-encrypt + atomic write of the compacted DB
console.log('Saved compacted, re-encrypted database.');

const totalAfter = rows('SELECT COUNT(*) c, COALESCE(SUM(length(data)),0) s FROM lead_attachments')[0];
console.log(`lead_attachments AFTER:  ${totalAfter.c} rows, ${mb(totalAfter.s)} of inline data`);
