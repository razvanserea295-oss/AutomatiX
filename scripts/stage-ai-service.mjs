#!/usr/bin/env node










import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const platform = process.env.npm_config_target_platform || process.platform;
const arch = process.env.npm_config_target_arch || process.arch;

const isWin = platform === 'win32';
const binName = isWin ? 'ai-service.exe' : 'ai-service';


const candidateSources = [
  path.join(root, 'ai-service', `target-${isWin ? 'win' : 'linux'}`, 'release', binName),
  path.join(root, 'ai-service', 'target', 'release', binName),
];

const source = candidateSources.find(p => fs.existsSync(p));

const destDir = path.join(root, 'ai-service', 'dist', `${platform}-${arch}`);
fs.mkdirSync(destDir, { recursive: true });

if (!source) {
  console.warn(`[stage-ai-service] No binary found in any of:\n  - ${candidateSources.join('\n  - ')}`);
  console.warn('[stage-ai-service] Skipping — the installer will ship without bundled AI.');
  process.exit(0);
}

const destBin = path.join(destDir, binName);
fs.copyFileSync(source, destBin);
if (!isWin) fs.chmodSync(destBin, 0o755);
console.log(`[stage-ai-service] Copied ${source} → ${destBin}`);


const exampleConfig = path.join(root, 'ai-service', 'config.toml.example');
if (fs.existsSync(exampleConfig)) {
  fs.copyFileSync(exampleConfig, path.join(destDir, 'config.toml.example'));
}
const readme = path.join(destDir, 'README.md');
fs.writeFileSync(readme, `# ai-service (bundled)

Binary shipped by the Automatix installer. Config lives at:

  <installation>\\resources\\ai-service\\config.toml

The host app auto-generates [auth].api_token on first launch. Do not commit
this file — delete it if you want to regenerate the token on next boot.
`);
console.log(`[stage-ai-service] Done. Staged in ${destDir}`);
