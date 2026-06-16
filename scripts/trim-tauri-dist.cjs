
















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
    try { freed += sizeOf(p); } catch {  }
    fs.rmSync(p, { recursive: true, force: true });
    console.log('[tauri-trim] removed dist/' + t);
  }
}
console.log('[tauri-trim] freed ~' + (freed / (1024 * 1024)).toFixed(1) + ' MB from the desktop bundle');
