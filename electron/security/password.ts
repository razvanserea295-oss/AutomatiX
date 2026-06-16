import { argon2id, argon2Verify } from 'hash-wasm';
import crypto from 'crypto';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;






const PASSWORD_STRONG_MIN_LENGTH = 12;



const WEAK_SUBSTRINGS = ['1234', 'admin', 'parola', 'password', 'automatix', 'promix', 'qwerty'];

export async function hashPassword(password: string): Promise<string> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Password must be at most ${PASSWORD_MAX_LENGTH} characters`);
  }

  const salt = crypto.randomBytes(16);

  const hash = await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'encoded',
  });

  return hash;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash: encoded });
  } catch {
    return false;
  }
}

export function validatePasswordStrength(password: string): void {
  if (password.length < PASSWORD_STRONG_MIN_LENGTH) {
    throw new Error(`Parola trebuie să aibă minim ${PASSWORD_STRONG_MIN_LENGTH} caractere`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Parola trebuie să aibă maxim ${PASSWORD_MAX_LENGTH} caractere`);
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Parola trebuie să conțină o literă mică');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Parola trebuie să conțină o literă mare');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Parola trebuie să conțină o cifră');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Parola trebuie să conțină un simbol (ex: ! ? @ # $ %)');
  }
  const lower = password.toLowerCase();
  for (const bad of WEAK_SUBSTRINGS) {
    if (lower.includes(bad)) {
      throw new Error(`Parola nu poate conține „${bad}" — alege ceva mai puțin previzibil`);
    }
  }
}
