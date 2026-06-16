/*
 * serve-demo.cjs — boot Promix in DEMO MODE on an isolated, freshly-reseeded
 * database, for presenting the app to prospective clients.
 *
 *  - PROMIX_DEMO=1  → server/db.ts uses data/promix-demo.db (NEVER production).
 *  - WIPES the demo DB before boot, so every launch starts from a clean, fully
 *    seeded fictional dataset (server/demoSeed.ts). Anything you click during a
 *    demo is gone next time.
 *  - Runs on PROMIX_PORT (default 3600) so it can run ALONGSIDE the production
 *    server (:3500) without conflict.
 *  - Loads the compiled server (build it first: `tsc -p tsconfig.server.json`).
 *
 * Run:  npm run demo   →   http://localhost:3600   (login: demo / demodemo,
 *       or just click "Intră în demo" on the login screen).
 * Tablet/projector on the LAN: prefix with PROMIX_LAN=1.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);
process.env.PROMIX_DEMO = '1';
process.env.PROMIX_PORT = process.env.PROMIX_PORT || '3600';

// Fresh reset: remove the demo DB (+ wal/shm) so it is recreated + reseeded now.
const demoDb = path.join(root, 'data', 'promix-demo.db');
for (const f of [demoDb, `${demoDb}-wal`, `${demoDb}-shm`]) {
  try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { console.warn('[demo] could not remove', f, e.message); }
}
console.log(`[demo] fresh demo instance on port ${process.env.PROMIX_PORT} — login: demo / demodemo`);

require(path.join(root, 'dist-server', 'server', 'index.js'));
