#!/usr/bin/env node
/**
 * Download RustDesk Windows portable and place Promix-QuickSupport.exe in public/support/.
 * Reads relay config from PROMIX_RUSTDESK_* env vars (or deploy/rustdesk/.env).
 *
 * Usage: node scripts/prepare-quicksupport.mjs
 *        npm run support:prepare-bundle
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'support');
const OUT_EXE = path.join(OUT_DIR, 'Promix-QuickSupport.exe');
const OUT_TOML = path.join(OUT_DIR, 'RustDesk2.toml');
const OUT_ZIP = path.join(OUT_DIR, 'Promix-QuickSupport.zip');
const OUT_README = path.join(OUT_DIR, 'CITESTE-MA.txt');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'promix-automatix' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJson(res.headers.location).then(resolve, reject);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'promix-automatix' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Download failed HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

function rustdeskConfigToml() {
  const idServer = process.env.PROMIX_RUSTDESK_ID_SERVER
    || process.env.PROMIX_RUSTDESK_SERVER
    || '';
  const relay = process.env.PROMIX_RUSTDESK_RELAY_SERVER || idServer;
  const key = process.env.PROMIX_RUSTDESK_KEY || process.env.RUSTDESK_KEY || '';
  if (!idServer) {
    console.warn('[prepare-quicksupport] PROMIX_RUSTDESK_ID_SERVER not set — RustDesk2.toml will be minimal.');
    return '# Set PROMIX_RUSTDESK_ID_SERVER and PROMIX_RUSTDESK_KEY, then re-run this script.\n';
  }
  const lines = [`rendezvous_server = '${idServer}'`];
  if (relay && relay !== idServer) lines.push(`relay_server = '${relay}'`);
  if (key) lines.push(`key = '${key}'`);
  return `${lines.join('\n')}\n`;
}

function writeSupportReadme() {
  const text = [
    'Promix QuickSupport',
    '===================',
    '',
    '1. Extrageți TOATE fișierele din acest zip în același folder.',
    '2. Rulați Promix-QuickSupport.exe (lângă RustDesk2.toml).',
    '3. Comunicați tehnicianului ID-ul și parola afișate.',
    '',
    'Nu mutați doar exe-ul fără RustDesk2.toml — fără config nu vă conectați la serverul Promix.',
    '',
  ].join('\n');
  fs.writeFileSync(OUT_README, text, 'utf8');
}

function packSupportZip() {
  writeSupportReadme();
  if (process.platform === 'win32') {
    if (fs.existsSync(OUT_ZIP)) fs.unlinkSync(OUT_ZIP);
    const files = [OUT_EXE, OUT_TOML, OUT_README].filter((f) => fs.existsSync(f));
    const args = files.map((f) => `'${f.replace(/'/g, "''")}'`).join(',');
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path ${args} -DestinationPath '${OUT_ZIP.replace(/'/g, "''")}' -Force"`,
      { stdio: 'inherit' },
    );
    console.log(`[prepare-quicksupport] Packaged ${path.basename(OUT_ZIP)} (${files.length} files)`);
    return;
  }
  console.warn('[prepare-quicksupport] Zip skipped (non-Windows). Clients need RustDesk2.toml next to the exe.');
}

function finalizeBundle(logLine) {
  fs.writeFileSync(OUT_TOML, rustdeskConfigToml());
  packSupportZip();
  console.log(logLine);
}

async function main() {
  loadEnvFile(path.join(ROOT, '.env'));
  loadEnvFile(path.join(ROOT, 'deploy', 'rustdesk', '.env'));

  const customBundle = process.env.PROMIX_REMOTE_SUPPORT_BUNDLE;
  if (customBundle && fs.existsSync(customBundle)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.copyFileSync(customBundle, OUT_EXE);
    finalizeBundle(`[prepare-quicksupport] Copied ${customBundle} → ${OUT_EXE}`);
    return;
  }

  const localCandidates = [
    process.env.PROMIX_RUSTDESK_VIEWER_PATH,
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'RustDesk', 'rustdesk.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'RustDesk', 'rustdesk.exe'),
  ].filter(Boolean);

  for (const src of localCandidates) {
    if (src && fs.existsSync(src)) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.copyFileSync(src, OUT_EXE);
      finalizeBundle(`[prepare-quicksupport] Copied local RustDesk → ${OUT_EXE}`);
      console.log('[prepare-quicksupport] Tip: for production, use the official portable from GitHub (re-run without local install).');
      return;
    }
  }

  console.log('[prepare-quicksupport] Fetching latest RustDesk Windows portable from GitHub…');
  const release = await fetchJson('https://api.github.com/repos/rustdesk/rustdesk/releases/latest');
  const asset = (release.assets || []).find((a) =>
    /rustdesk-[\d.]+-x86_64\.exe$/i.test(a.name),
  );
  if (!asset?.browser_download_url) {
    throw new Error('Could not find rustdesk-*-x86_64.exe in latest GitHub release');
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmp = path.join(OUT_DIR, '.download-tmp.exe');
  await downloadFile(asset.browser_download_url, tmp);
  fs.renameSync(tmp, OUT_EXE);
  finalizeBundle(`[prepare-quicksupport] Downloaded ${asset.name} → ${OUT_EXE}`);
  if (!process.env.PROMIX_RUSTDESK_ID_SERVER && !process.env.PROMIX_RUSTDESK_SERVER) {
    console.warn('[prepare-quicksupport] Configure PROMIX_RUSTDESK_ID_SERVER + PROMIX_RUSTDESK_KEY in .env and re-run to embed relay settings.');
  }
}

main().catch((e) => {
  console.error('[prepare-quicksupport] FAILED:', e.message || e);
  process.exit(1);
});
