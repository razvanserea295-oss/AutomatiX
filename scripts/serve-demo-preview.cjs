// Isolated demo instance for UI/readability previews.
//
// Unlike scripts/serve-demo.cjs, this points the server at a SEPARATE data
// directory (PROMIX_DATA_DIR) so it gets its own .promix.lock and never
// collides with a production server that is already running on the normal
// data/ dir. That global lock is what blocks a second instance — give the
// demo its own dir and the two coexist. The dir is wiped on each launch so
// the demo seed re-runs from scratch. Read-only demo (PROMIX_DEMO=1).
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
process.chdir(root);

const dataDir = path.join(root, '.demo-preview-data');
process.env.PROMIX_DEMO = '1';
process.env.PROMIX_PORT = process.env.PROMIX_PORT || '3600';
process.env.PROMIX_DATA_DIR = dataDir;

// Fresh isolated data dir every launch → clean reseed, own lock + key.
try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch (e) { console.warn('[demo-preview] could not clear', dataDir, e.message); }
fs.mkdirSync(dataDir, { recursive: true });

console.log(`[demo-preview] isolated demo on port ${process.env.PROMIX_PORT} — data=${dataDir} — login: demo / demodemo`);

require(path.join(root, 'dist-server', 'server', 'index.js'));
