#!/usr/bin/env node
// Reads VERSION.txt and stamps it into package.json + the two Rust Cargo.toml files.
// Run before any build so all artifacts agree on one version string.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const version = readFileSync(resolve(root, 'VERSION.txt'), 'utf8').trim();
if (!/^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$/.test(version)) {
  console.error(`[stamp-version] invalid version in VERSION.txt: '${version}'`);
  process.exit(1);
}

function stamp(path, regex, label) {
  let raw;
  try { raw = readFileSync(path, 'utf8'); }
  catch { console.warn(`[stamp-version] skipped (missing): ${label}`); return; }

  if (!regex.test(raw)) {
    console.warn(`[stamp-version] ${label}: version field not found`);
    return;
  }
  const updated = raw.replace(regex, (_m, pre, _old, post) => `${pre}${version}${post}`);
  if (updated !== raw) writeFileSync(path, updated);
  console.log(`[stamp-version] ${label} -> ${version}`);
}

stamp(
  resolve(root, 'package.json'),
  /("version"\s*:\s*")([^"]+)(")/,
  'package.json',
);

for (const rel of ['ai-service/Cargo.toml']) {
  stamp(
    resolve(root, rel),
    /(\[package\][\s\S]*?\nversion\s*=\s*")([^"]+)(")/,
    rel,
  );
}
