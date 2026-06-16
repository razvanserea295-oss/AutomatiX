






















import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const MAGIC      = Buffer.from('PMXENC01', 'utf8');
const MAGIC_LEN  = MAGIC.length;
const IV_LEN     = 12;
const TAG_LEN    = 16;
const KEY_LEN    = 32;          

let cachedKey: Buffer | null = null;
let cachedKeyDir: string | null = null;

function defaultKeyFile(): string {
  
  
  const dataDir = process.env.PROMIX_DATA_DIR
    ? path.resolve(process.env.PROMIX_DATA_DIR)
    : path.join(process.cwd(), 'data');
  return path.join(dataDir, '.dbkey');
}








export function getDbKey(dataDir?: string): Buffer | null {
  
  const keyFile = dataDir ? path.join(dataDir, '.dbkey') : defaultKeyFile();
  if (cachedKey && cachedKeyDir === keyFile) return cachedKey;

  const fromEnv = process.env.PROMIX_DB_KEY;
  if (fromEnv) {
    if (fromEnv.length !== KEY_LEN * 2 || !/^[0-9a-fA-F]+$/.test(fromEnv)) {
      throw new Error(`PROMIX_DB_KEY must be ${KEY_LEN * 2} hex chars (got ${fromEnv.length})`);
    }
    cachedKey = Buffer.from(fromEnv, 'hex');
    cachedKeyDir = keyFile;
    return cachedKey;
  }

  if (fs.existsSync(keyFile)) {
    try {
      const raw = fs.readFileSync(keyFile, 'utf8').trim();
      if (raw.length !== KEY_LEN * 2 || !/^[0-9a-fA-F]+$/.test(raw)) {
        throw new Error('malformed .dbkey contents');
      }
      cachedKey = Buffer.from(raw, 'hex');
      cachedKeyDir = keyFile;
      return cachedKey;
    } catch (e) {
      console.error('[db-crypto] failed to read existing key file:', e);
      return null;
    }
  }

  
  
  
  
  try {
    fs.mkdirSync(path.dirname(keyFile), { recursive: true });
    const key = crypto.randomBytes(KEY_LEN);
    fs.writeFileSync(keyFile, key.toString('hex'), { mode: 0o600 });
    cachedKey = key;
    cachedKeyDir = keyFile;
    console.warn('');
    console.warn('========================================================');
    console.warn('[db-crypto] Generated NEW database encryption key:');
    console.warn(`            ${keyFile}`);
    console.warn('  ⚠  Back this file up off-server. If lost, the database');
    console.warn('     and all backups become unrecoverable.');
    console.warn('========================================================');
    console.warn('');
    return key;
  } catch (e) {
    console.error('[db-crypto] failed to generate key file:', e);
    return null;
  }
}

export function isEncryptedBuffer(buf: Buffer): boolean {
  return buf.length >= MAGIC_LEN && buf.subarray(0, MAGIC_LEN).equals(MAGIC);
}










const CIPHER_CHUNK_BYTES = 256 * 1024 * 1024; 

function updateInChunks(
  transform: crypto.Cipheriv | crypto.Decipheriv,
  input: Buffer,
  chunkSize: number = CIPHER_CHUNK_BYTES,
): Buffer {
  
  if (input.length <= chunkSize) return transform.update(input) as Buffer;
  const out: Buffer[] = [];
  for (let off = 0; off < input.length; off += chunkSize) {
    out.push(transform.update(input.subarray(off, Math.min(off + chunkSize, input.length))) as Buffer);
  }
  return Buffer.concat(out);
}

export function encryptDb(plain: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([updateInChunks(cipher, plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, ct]);
}

export function decryptDb(blob: Buffer, key: Buffer): Buffer {
  if (!isEncryptedBuffer(blob)) {
    throw new Error('not an encrypted database file (missing PMXENC01 header)');
  }
  const iv  = blob.subarray(MAGIC_LEN, MAGIC_LEN + IV_LEN);
  const tag = blob.subarray(MAGIC_LEN + IV_LEN, MAGIC_LEN + IV_LEN + TAG_LEN);
  const ct  = blob.subarray(MAGIC_LEN + IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([updateInChunks(decipher, ct), decipher.final()]);
}
