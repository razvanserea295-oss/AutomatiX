// Revoke a previously-issued license and regenerate the signed CRL.
//
//     node tools/license-generator/revoke.mjs --id <license_id> [--reason "..."]
//
// Updates registry.json and writes a freshly SIGNED out/revocations.json. Import
// that CRL into the server (Sistem → Licențe → Import CRL, or POST
// /api/license/crl/import) so the revocation takes effect online. The desktop
// app picks it up on its next online status check.

import fs from 'node:fs';
import {
  CRL_PATH, ensureDirs, loadPrivateKey, signCrl,
  readRegistry, writeRegistry, arg,
} from './lib.mjs';

const id = arg('id');
const reason = arg('reason') || '';

if (!id) {
  console.error('Utilizare: node revoke.mjs --id <license_id> [--reason "motiv"]');
  process.exit(1);
}

ensureDirs();

let priv;
try { priv = loadPrivateKey(); }
catch (e) { console.error('✋ ' + e.message); process.exit(1); }

const reg = readRegistry();
reg.issued = reg.issued || [];
reg.revoked = reg.revoked || [];

const found = reg.issued.find((l) => l.license_id === id);
if (found) found.status = 'revoked';
else console.warn(`⚠ license_id ${id} nu e în registry.json (revoc oricum în CRL).`);

if (!reg.revoked.some((r) => r.license_id === id)) {
  reg.revoked.push({ license_id: id, revoked_at: new Date().toISOString(), reason });
}
writeRegistry(reg);

const crl = signCrl(new Date().toISOString(), reg.revoked, priv);
fs.writeFileSync(CRL_PATH, JSON.stringify(crl, null, 2));

console.log(`✅ Licență ${id} marcată REVOCATĂ.`);
console.log(`   Total în CRL: ${reg.revoked.length}`);
console.log(`   CRL semnat scris: ${CRL_PATH}`);
console.log('   Pasul următor: importă CRL-ul în server (Sistem → Licențe → Import CRL).');
