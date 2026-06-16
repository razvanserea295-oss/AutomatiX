/**
 * publish-installer.mjs — copy the freshly built Windows installer from
 * dist-installer/ into public/downloads/ so the running web server can serve
 * it at /download. Run after electron-builder.
 */
import { readdirSync, copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'dist-installer');
const dest = join(root, 'public', 'downloads');

const RE = /^Automatix-Setup-.+\.exe$/i;

if (!existsSync(src)) {
  console.warn(`[publish-installer] ${src} not found — nothing to publish.`);
  process.exit(0);
}
if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

const installers = readdirSync(src)
  .filter((f) => RE.test(f))
  .map((f) => ({ f, mtime: statSync(join(src, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (installers.length === 0) {
  console.warn('[publish-installer] no Automatix-Setup-*.exe found in dist-installer/.');
  process.exit(0);
}

const latest = installers[0].f;
copyFileSync(join(src, latest), join(dest, latest));
console.log(`[publish-installer] published ${latest} → public/downloads/`);
