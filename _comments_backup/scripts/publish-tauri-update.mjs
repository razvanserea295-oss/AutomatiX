/*
 * publish-tauri-update.mjs — turn a SIGNED Tauri build into a self-hosted
 * update release.
 *
 * After `npm run tauri:build` with the signing env set (see below), this:
 *   1. finds the NSIS installer + its `.sig` in src-tauri/target/release/bundle/nsis/,
 *   2. copies the installer into the updates dir the server serves at /api/update/,
 *   3. writes `latest.json` (the Tauri updater manifest) next to it.
 *
 * The desktop app polls plugins.updater.endpoints (tauri.conf.json), Tauri
 * verifies the download against the public key, runs the installer, relaunches.
 *
 * Env / flags:
 *   PROMIX_UPDATES_DIR     where to publish (default: <root>/updates) — point at
 *                          the server's updates dir (or rsync/upload afterwards).
 *   PROMIX_UPDATE_URL_BASE public base the client downloads from
 *                          (default: https://automatix.online/api/update)
 *   --notes "text"         release notes shown in the update toast.
 *
 * Build prerequisites (sign the artifacts — without these no `.sig` is emitted):
 *   $env:TAURI_SIGNING_PRIVATE_KEY          = (Get-Content src-tauri/.tauri/automatix-updater.key -Raw)
 *   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = (Get-Content src-tauri/.tauri/updater-key-password.txt -Raw)
 *   npm run tauri:build
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const conf = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf-8'));
const version = conf.version;
const notes = arg('--notes', `Automatix ${version}`);
const urlBase = (process.env.PROMIX_UPDATE_URL_BASE || 'https://automatix.online/api/update').replace(/\/+$/, '');
const outDir = process.env.PROMIX_UPDATES_DIR || path.join(root, 'updates');

const nsisDir = path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
if (!fs.existsSync(nsisDir)) {
  console.error('[publish] NSIS bundle dir not found — run `npm run tauri:build` first:\n  ' + nsisDir);
  process.exit(1);
}

const sig = fs.readdirSync(nsisDir).find((f) => f.endsWith('-setup.exe.sig'));
if (!sig) {
  console.error('[publish] No `*-setup.exe.sig` found. The build was NOT signed.');
  console.error('[publish] Set TAURI_SIGNING_PRIVATE_KEY (+ _PASSWORD) and rebuild. See this file\'s header.');
  process.exit(1);
}
const exe = sig.replace(/\.sig$/, '');
const exePath = path.join(nsisDir, exe);
if (!fs.existsSync(exePath)) {
  console.error('[publish] Signature present but installer missing: ' + exe);
  process.exit(1);
}

const signature = fs.readFileSync(path.join(nsisDir, sig), 'utf-8').trim();

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(exePath, path.join(outDir, exe));

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature,
      url: `${urlBase}/${encodeURIComponent(exe)}`,
    },
  },
};
fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log('[publish] Published update ' + version);
console.log('[publish]   dir      : ' + outDir);
console.log('[publish]   installer: ' + exe + '  (' + (fs.statSync(exePath).size / 1024 / 1024).toFixed(2) + ' MB)');
console.log('[publish]   manifest : latest.json  → ' + manifest.platforms['windows-x86_64'].url);
console.log('[publish] Clients polling ' + urlBase + '/latest.json will now offer v' + version + '.');
