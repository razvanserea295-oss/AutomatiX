















const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);
process.env.PROMIX_DEMO = '1';
process.env.PROMIX_PORT = process.env.PROMIX_PORT || '3600';


const demoDb = path.join(root, 'data', 'promix-demo.db');
for (const f of [demoDb, `${demoDb}-wal`, `${demoDb}-shm`]) {
  try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { console.warn('[demo] could not remove', f, e.message); }
}
console.log(`[demo] fresh demo instance on port ${process.env.PROMIX_PORT} — login: demo / demodemo`);

require(path.join(root, 'dist-server', 'server', 'index.js'));
