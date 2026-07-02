#!/usr/bin/env node
/**
 * Reads RustDesk hbbs public key (Docker or native Windows data dir) and updates
 * PROMIX_RUSTDESK_* in .env for LAN or public (Cloudflare TCP) access.
 *
 * Usage:
 *   node scripts/setup-rustdesk-env.mjs
 *   node scripts/setup-rustdesk-env.mjs --public
 *   node scripts/setup-rustdesk-env.mjs --host=192.168.1.10
 *   node scripts/setup-rustdesk-env.mjs --id-host=id.example.com --relay-host=relay.example.com
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
const nativeKeyPath = path.join(root, 'deploy', 'rustdesk', 'data', 'id_ed25519.pub');

const isPublic = process.argv.includes('--public');
const idHostArg = process.argv.find((a) => a.startsWith('--id-host='))?.split('=')[1]
  || (process.argv.includes('--id-host') ? process.argv[process.argv.indexOf('--id-host') + 1] : null);
const relayHostArg = process.argv.find((a) => a.startsWith('--relay-host='))?.split('=')[1]
  || (process.argv.includes('--relay-host') ? process.argv[process.argv.indexOf('--relay-host') + 1] : null);
const hostArg = process.argv.find((a) => a.startsWith('--host='))?.split('=')[1]
  || (process.argv.includes('--host') ? process.argv[process.argv.indexOf('--host') + 1] : null)
  || process.env.PROMIX_RUSTDESK_PUBLIC_HOST
  || (isPublic ? null : '127.0.0.1');

const idHost = idHostArg || (isPublic ? 'id.automatix.online' : hostArg);
const relayHost = relayHostArg || (isPublic ? 'relay.automatix.online' : hostArg);

function readKeyFromDocker() {
  try {
    const out = execSync('docker exec promix-rustdesk-hbbs cat /root/id_ed25519.pub', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function readKeyFromNative() {
  try {
    if (!fs.existsSync(nativeKeyPath)) return null;
    const out = fs.readFileSync(nativeKeyPath, 'utf8').trim();
    return out || null;
  } catch {
    return null;
  }
}

function upsertEnv(lines) {
  let raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  for (const { key, value } of lines) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}=${value}`;
    raw = re.test(raw) ? raw.replace(re, line) : `${raw.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(envPath, raw.endsWith('\n') ? raw : `${raw}\n`);
}

const key = readKeyFromDocker() || readKeyFromNative();
if (!key) {
  console.error('[setup-rustdesk] Relay key missing.');
  console.error('  Docker: cd deploy/rustdesk && docker compose up -d');
  console.error('  Windows: npm run support:install-relay');
  process.exit(1);
}

const appHost = process.env.PROMIX_APP_HOST || 'app.automatix.online';

upsertEnv([
  { key: 'PROMIX_APP_HOST', value: appHost },
  { key: 'PROMIX_RUSTDESK_ID_SERVER', value: `${idHost}:21116` },
  { key: 'PROMIX_RUSTDESK_RELAY_SERVER', value: `${relayHost}:21117` },
  { key: 'PROMIX_RUSTDESK_KEY', value: key },
]);

console.log(`[setup-rustdesk] Updated ${envPath}`);
console.log(`  ID server:   ${idHost}:21116`);
console.log(`  Relay:       ${relayHost}:21117`);
console.log(`  Viewer host: ${appHost} (wss via /ws/id proxy)`);
console.log(`  Key:         ${key.slice(0, 20)}…`);
