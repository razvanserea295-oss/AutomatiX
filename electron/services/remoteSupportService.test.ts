import { describe, it, expect, beforeAll } from 'vitest';
import initSqlJs, { type Database } from 'sql.js';
import { RemoteSupportService } from './remoteSupportService';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async () => { SQL = await initSqlJs(); });

function makeDb(): Database {
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, full_name TEXT);
    CREATE TABLE clients (id INTEGER PRIMARY KEY, name TEXT);
    INSERT INTO users (id, full_name) VALUES (1, 'Tech');
    CREATE TABLE remote_endpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rustdesk_id TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'windows',
      notes TEXT,
      client_id INTEGER,
      station_id INTEGER,
      password_hint TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_seen_at TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE remote_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_type TEXT NOT NULL DEFAULT 'ad_hoc',
      endpoint_id INTEGER,
      started_by INTEGER NOT NULL,
      customer_ref TEXT,
      client_id INTEGER,
      service_ticket_id INTEGER,
      rustdesk_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      started_at TEXT,
      ended_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE remote_quick_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      session_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      access_count INTEGER NOT NULL DEFAULT 0,
      last_accessed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

const manager = { id: 1, role_name: 'manager', username: 'tech', full_name: 'Tech' } as UserWithRole;

describe('RemoteSupportService', () => {
  it('creates quick support with code and public view', () => {
    const db = makeDb();
    const created = RemoteSupportService.createQuickSupport(db, manager, { customer_ref: 'ACME' });
    expect(created.code).toMatch(/^[a-f0-9]+$/);
    expect(created.session.status).toBe('pending');
    const view = RemoteSupportService.getPublicQuickView(db, created.code);
    expect(view.customer_ref).toBe('ACME');
    expect(view.download_url).toContain(created.code);
  });

  it('rejects expired quick codes', () => {
    const db = makeDb();
    const created = RemoteSupportService.createQuickSupport(db, manager, { ttl_hours: -1 });
    db.run(`UPDATE remote_quick_codes SET expires_at = datetime('now', '-1 hour') WHERE code = ?`, [created.code]);
    expect(() => RemoteSupportService.getPublicQuickView(db, created.code)).toThrow(CommandError);
  });

  it('forbids non-manager roles', () => {
    const db = makeDb();
    const user = { ...manager, role_name: 'user' } as UserWithRole;
    expect(() => RemoteSupportService.listEndpoints(db, user)).toThrow(CommandError);
  });
});
