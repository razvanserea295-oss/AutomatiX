// Generate the Ed25519 signing key pair for Automatix licenses. Run ONCE.
//
//     node tools/license-generator/init-keys.mjs
//
// Writes the PRIVATE key to .keys/ (chmod 600, never commit) and prints the
// PUBLIC key to paste into:
//     server/licensePublicKey.ts   (LICENSE_PUBLIC_KEY_PEM)
//     src/shared/license.ts        (LICENSE_PUBLIC_KEY_PEM)
//
// Refuses to overwrite an existing private key — regenerating it INVALIDATES
// every license already issued.

import crypto from 'node:crypto';
import fs from 'node:fs';
import { PRIVATE_KEY_PATH, PUBLIC_KEY_PATH, ensureDirs } from './lib.mjs';

if (fs.existsSync(PRIVATE_KEY_PATH)) {
  console.error(`✋ Cheia privată există deja: ${PRIVATE_KEY_PATH}`);
  console.error('   A o regenera INVALIDEAZĂ toate licențele emise până acum. Abort.');
  process.exit(1);
}

ensureDirs();

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

fs.writeFileSync(PRIVATE_KEY_PATH, privPem, { mode: 0o600 });
fs.writeFileSync(PUBLIC_KEY_PATH, pubPem);

console.log('✅ Pereche de chei Ed25519 generată.');
console.log(`   Privată (SECRET — fă-i backup offline, NU o publica): ${PRIVATE_KEY_PATH}`);
console.log(`   Publică:                                              ${PUBLIC_KEY_PATH}`);
console.log('\n── Lipește blocul de mai jos (cheia PUBLICĂ) în AMBELE fișiere:');
console.log('     server/licensePublicKey.ts  →  LICENSE_PUBLIC_KEY_PEM');
console.log('     src/shared/license.ts       →  LICENSE_PUBLIC_KEY_PEM\n');
process.stdout.write(pubPem.toString());
