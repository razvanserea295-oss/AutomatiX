// Issue a license for one company. Offline — signs with the local private key.
//
//     node tools/license-generator/generate.mjs --company "Firma SRL" \
//          [--email contact@firma.ro] [--cui RO12345678]
//
// Prints the copy-paste KEY and writes a .lic file under out/. The customer
// pastes the key on automatix.online (download) and in the app (activation).

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  OUT_DIR, ensureDirs, loadPrivateKey, signLicense,
  readRegistry, writeRegistry, arg,
} from './lib.mjs';

const company = arg('company');
const email = arg('email') || '';
const cui = arg('cui') || '';

if (!company) {
  console.error('Utilizare: node generate.mjs --company "Firma SRL" [--email a@b.ro] [--cui RO123]');
  process.exit(1);
}

ensureDirs();

let priv;
try { priv = loadPrivateKey(); }
catch (e) { console.error('✋ ' + e.message); process.exit(1); }

const payload = {
  v: 1,
  license_id: crypto.randomUUID(),
  company_name: company,
  email,
  cui,
  issued_at: new Date().toISOString(),
};

const token = signLicense(payload, priv);

const safe = (cui || company).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
const licPath = path.join(OUT_DIR, `${safe}-${payload.license_id.slice(0, 8)}.lic`);
fs.writeFileSync(licPath, token + '\n');

const reg = readRegistry();
reg.issued = reg.issued || [];
reg.issued.push({ ...payload, status: 'active', token, file: licPath });
writeRegistry(reg);

console.log('✅ Licență generată');
console.log(`   Firmă:      ${company}`);
console.log(`   Email:      ${email || '—'}`);
console.log(`   CUI:        ${cui || '—'}`);
console.log(`   license_id: ${payload.license_id}`);
console.log(`   Fișier:     ${licPath}`);
console.log('\n── CHEIE (copy-paste pentru client) ───────────────────────────\n');
console.log(token);
console.log('\n───────────────────────────────────────────────────────────────');
