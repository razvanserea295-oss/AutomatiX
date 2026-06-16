/**
 * Sandbox E2E — drives REAL sql.js constraint violations through
 * mapSqliteConstraintError and asserts each maps to the right HTTP status +
 * friendly Romanian message (debug-log 2026-06-16, finding A).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import initSqlJs, { type Database } from 'sql.js';
import { mapSqliteConstraintError } from './sqliteErrors';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async () => { SQL = await initSqlJs(); });

function makeDb(): Database {
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  db.run(`
    CREATE TABLE parent (id INTEGER PRIMARY KEY);
    CREATE TABLE t (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      title TEXT NOT NULL,
      qty INTEGER CHECK(qty >= 0),
      parent_id INTEGER REFERENCES parent(id)
    );
    INSERT INTO parent (id) VALUES (1);
  `);
  return db;
}

/** Run SQL expected to throw; return the caught error. */
function capture(db: Database, sql: string): unknown {
  try { db.run(sql); return null; } catch (e) { return e; }
}

describe('mapSqliteConstraintError', () => {
  it('UNIQUE → 409 with the field name', () => {
    const db = makeDb();
    db.run(`INSERT INTO t (id, username, title, qty) VALUES (1, 'ana', 'x', 1)`);
    const err = capture(db, `INSERT INTO t (id, username, title, qty) VALUES (2, 'ana', 'y', 1)`);
    const m = mapSqliteConstraintError(err);
    expect(m?.code).toBe(409);
    expect(m?.message).toContain('există deja');
    expect(m?.message).toContain('username');
  });

  it('NOT NULL → 422 with the field name', () => {
    const db = makeDb();
    const err = capture(db, `INSERT INTO t (id, username, qty) VALUES (3, 'bob', 1)`); // title missing
    const m = mapSqliteConstraintError(err);
    expect(m?.code).toBe(422);
    expect(m?.message).toContain('obligatoriu');
    expect(m?.message).toContain('title');
  });

  it('CHECK → 422', () => {
    const db = makeDb();
    const err = capture(db, `INSERT INTO t (id, username, title, qty) VALUES (4, 'cyril', 'z', -5)`);
    const m = mapSqliteConstraintError(err);
    expect(m?.code).toBe(422);
    expect(m?.message).toContain('Valoare invalidă');
  });

  it('FOREIGN KEY → 422', () => {
    const db = makeDb();
    const err = capture(db, `INSERT INTO t (id, username, title, qty, parent_id) VALUES (5, 'dan', 'q', 1, 999)`);
    const m = mapSqliteConstraintError(err);
    expect(m?.code).toBe(422);
    expect(m?.message).toContain('folosit');
  });

  it('non-constraint error → null (falls through to generic handling)', () => {
    expect(mapSqliteConstraintError(new Error('something else entirely'))).toBeNull();
    expect(mapSqliteConstraintError(new Error('no such table: ghosts'))).toBeNull();
    expect(mapSqliteConstraintError(undefined)).toBeNull();
  });
});
