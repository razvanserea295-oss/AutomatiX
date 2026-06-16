/*
 * trim-tauri-dist.cjs — strip heavy, non-desktop assets from dist/ BEFORE the
 * Tauri build embeds it into the binary.
 *
 * Why: `tauri::generate_context!` bundles the ENTIRE frontendDist (../dist) into
 * the .exe. The web build ships, under public/ (→ dist/):
 *   - downloads/Automatix-Setup-*.exe  → the desktop installer itself (~131 MB)
 *   - intro.mp4                        → an unused 16 MB video (no refs in src/)
 *   - kitchensink.html + its chunks    → a dev-only component showcase
 * Embedding those into the desktop binary is pure dead weight — the app would
 * literally bundle a copy of its own installer. Removing them shrinks the
 * desktop binary/installer by ~95%.
 *
 * Safe: the WEB deploy rebuilds dist fresh and keeps these files (the download
 * page needs them); this trim runs only inside `build:tauri-frontend`, so it
 * affects the Tauri-bound dist only.
 */
const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '..', 'dist');
const targets = ['downloads', 'intro.mp4', 'kitchensink.html'];

function sizeOf(p) {
  const st = fs.statSync(p);
  if (st.isFile()) return st.size;
  let total = 0;
  for (const e of fs.readdirSync(p)) total += sizeOf(path.join(p, e));
  return total;
}

if (!fs.existsSync(dist)) {
  console.warn('[tauri-trim] dist/ not found — nothing to trim');
  process.exit(0);
}

let freed = 0;
for (const t of targets) {
  const p = path.join(dist, t);
  if (fs.existsSync(p)) {
    try { freed += sizeOf(p); } catch { /* ignore */ }
    fs.rmSync(p, { recursive: true, force: true });
    console.log('[tauri-trim] removed dist/' + t);
  }
}
console.log('[tauri-trim] freed ~' + (freed / (1024 * 1024)).toFixed(1) + ' MB from the desktop bundle');
