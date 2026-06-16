import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGO = 'aes-256-gcm';
const NONCE_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;






function getKeyPath(): string {
  let userData: string | undefined;
  try {
    
    const electron = require('electron') as { app?: { getPath?: (n: string) => string } };
    userData = electron?.app?.getPath?.('userData');
  } catch {  }

  const dir = userData
    ? path.join(userData, 'data')
    : path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'email.key');
}

function loadOrCreateKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envKey = process.env.PROMIX_EMAIL_KEY;
  if (envKey) {
    try {
      const buf = Buffer.from(envKey, 'base64');
      if (buf.length === 32) { cachedKey = buf; return buf; }
    } catch {  }
  }

  const keyPath = getKeyPath();
  if (fs.existsSync(keyPath)) {
    const buf = fs.readFileSync(keyPath);
    if (buf.length === 32) { cachedKey = buf; return buf; }
  }

  const fresh = crypto.randomBytes(32);
  fs.writeFileSync(keyPath, fresh, { mode: 0o600 });
  console.log('[emailCrypto] Generated new email encryption key at', keyPath);
  cachedKey = fresh;
  return fresh;
}

export function encryptCredential(plaintext: string): string {
  if (!plaintext) return '';
  const key = loadOrCreateKey();
  const nonce = crypto.randomBytes(NONCE_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, ciphertext, tag]).toString('base64');
}

export function decryptCredential(encoded: string): string {
  if (!encoded) return '';
  const buf = Buffer.from(encoded, 'base64');

  
  
  if (buf.length < NONCE_LEN + TAG_LEN) {
    return buf.toString('utf8');
  }

  const key = loadOrCreateKey();
  const nonce = buf.subarray(0, NONCE_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ciphertext = buf.subarray(NONCE_LEN, buf.length - TAG_LEN);

  try {
    const decipher = crypto.createDecipheriv(ALGO, key, nonce);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    
    
    return buf.toString('utf8');
  }
}
