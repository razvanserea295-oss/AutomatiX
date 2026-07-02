// Tests for AuthService — the module that guards login and, via validateSession,
// every privileged endpoint (e.g. the admin-only /api/auto-backup download).
// Mirrors the sandbox-DB pattern used by remoteSupportService.test.ts: a fresh
// sql.js database with a hand-written minimal schema, seeded with one user.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import initSqlJs, { type Database } from 'sql.js';
import { AuthService } from './authService';
import { hashPassword } from '../security/password';
import { CommandError } from '../middleware/errors';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
let adminHash: string;

beforeAll(async () => {
  SQL = await initSqlJs();
  adminHash = await hashPassword('S3cret!pw');
});

function makeDb(passwordHash: string): Database {
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT);
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT,
      password_hash TEXT,
      full_name TEXT,
      role_id INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      last_login TEXT,
      custom_pages TEXT,
      must_change_password INTEGER DEFAULT 0,
      job_title TEXT,
      avatar_path TEXT,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      ip_address TEXT
    );
    CREATE TABLE audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER, action TEXT, entity_type TEXT, entity_id INTEGER,
      details TEXT, ip_address TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO roles (id, name, description) VALUES (1, 'admin', 'Administrator');
  `);
  db.run(
    `INSERT INTO users (id, username, email, password_hash, full_name, role_id, active)
     VALUES (1, 'admin', 'a@x.io', ?, 'Admin', 1, 1)`,
    [passwordHash],
  );
  return db;
}

describe('AuthService.login', () => {
  let db: Database;
  beforeEach(() => { db = makeDb(adminHash); });

  it('issues a session token for valid credentials', async () => {
    const res: any = await AuthService.login(db, 'admin', 'S3cret!pw');
    expect(res.token).toMatch(/^[^:]+:[^:]+$/); // "sessionId:secret"
    expect(res.user.username).toBe('admin');
    expect(res.user.role_name).toBe('admin');
    expect(res.user.password_hash).toBeUndefined(); // never leak the hash
    // A session row was persisted.
    const stmt = db.prepare('SELECT COUNT(*) FROM sessions');
    stmt.step();
    expect(stmt.get()[0]).toBe(1);
    stmt.free();
  });

  it('rejects a wrong password', async () => {
    await expect(AuthService.login(db, 'admin', 'wrong')).rejects.toBeInstanceOf(CommandError);
  });

  it('rejects an unknown user', async () => {
    await expect(AuthService.login(db, 'ghost', 'whatever')).rejects.toBeInstanceOf(CommandError);
  });

  it('rejects missing credentials', async () => {
    await expect(AuthService.login(db, '', '')).rejects.toBeInstanceOf(CommandError);
  });

  it('does not authenticate an inactive user', async () => {
    db.run('UPDATE users SET active = 0 WHERE id = 1');
    await expect(AuthService.login(db, 'admin', 'S3cret!pw')).rejects.toBeInstanceOf(CommandError);
  });
});

describe('AuthService.validateSession', () => {
  let db: Database;
  let token: string;
  beforeEach(async () => {
    db = makeDb(adminHash);
    token = (await AuthService.login(db, 'admin', 'S3cret!pw') as any).token;
  });

  it('returns the user for a valid token', () => {
    const user = AuthService.validateSession(db, token);
    expect(user.username).toBe('admin');
    expect(user.role_name).toBe('admin');
    expect((user as any).password_hash).toBeUndefined();
  });

  it('rejects a malformed token (no colon)', () => {
    expect(() => AuthService.validateSession(db, 'garbage')).toThrow(CommandError);
  });

  it('rejects a token with a tampered secret', () => {
    const [sessionId] = token.split(':');
    expect(() => AuthService.validateSession(db, `${sessionId}:tampered`)).toThrow(CommandError);
  });

  it('rejects an expired session', () => {
    db.run("UPDATE sessions SET expires_at = datetime('now', '-1 hour')");
    expect(() => AuthService.validateSession(db, token)).toThrow(CommandError);
  });

  it('rejects after logout (session deleted)', () => {
    AuthService.logout(db, token);
    expect(() => AuthService.validateSession(db, token)).toThrow(CommandError);
  });

  it('rejects once the user is deactivated', () => {
    db.run('UPDATE users SET active = 0 WHERE id = 1');
    expect(() => AuthService.validateSession(db, token)).toThrow(CommandError);
  });
});
