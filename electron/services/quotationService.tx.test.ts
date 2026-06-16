/**
 * Sandbox E2E — verifies the create/update atomicity fix (debug-log 2026-06-16,
 * bugs #3/#6). Spins up a throwaway in-memory sql.js DB with a minimal
 * quotations schema where `quotation_lines` has CHECK(unit_price >= 0), then
 * drives the REAL QuotationService.create / update.
 *
 * Without the BEGIN/COMMIT/ROLLBACK wrapper, a line insert failing mid-loop
 * left an orphan quotation header (and, for update, wiped all existing lines).
 * These tests fail on the pre-fix code and pass on the fixed code.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import initSqlJs, { type Database } from 'sql.js';
import { QuotationService } from './quotationService';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
const user = { id: 1, role_name: 'admin', role_id: 1 } as never;

beforeAll(async () => { SQL = await initSqlJs(); });

function makeDb(): Database {
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_number TEXT, lead_id INTEGER, project_id INTEGER, client_id INTEGER,
      client_name TEXT, contact_email TEXT, title TEXT, description TEXT,
      currency TEXT, tva_rate REAL, discount_percent REAL,
      subtotal REAL, tva_amount REAL, total REAL, status TEXT,
      valid_until TEXT, sent_at TEXT, viewed_at TEXT, decided_at TEXT,
      rejection_reason TEXT, tracking_token TEXT, converted_contract_id INTEGER,
      notes TEXT, created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE quotation_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER, description TEXT, quantity REAL, unit TEXT,
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      discount_percent REAL, total REAL, order_index INTEGER
    );
    CREATE TABLE quotation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, quotation_id INTEGER, event_type TEXT,
      actor_user_id INTEGER, metadata TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE users (id INTEGER PRIMARY KEY, full_name TEXT);
    INSERT INTO users (id, full_name) VALUES (1, 'Admin');
  `);
  return db;
}

function count(db: Database, table: string): number {
  const r = db.exec(`SELECT COUNT(*) FROM ${table}`);
  return r[0].values[0][0] as number;
}

describe('QuotationService atomicity', () => {
  it('create commits header + all lines on success', () => {
    const db = makeDb();
    const q = QuotationService.create(db, user, {
      client_name: 'ACME', title: 'Ofertă OK',
      lines: [
        { description: 'Linie 1', quantity: 2, unit: 'buc', unit_price: 10 },
        { description: 'Linie 2', quantity: 1, unit: 'buc', unit_price: 5 },
      ],
    } as never);
    expect(q.id).toBeGreaterThan(0);
    expect(count(db, 'quotations')).toBe(1);
    expect(count(db, 'quotation_lines')).toBe(2);
  });

  it('create rolls back the header when a line insert fails (no orphan)', () => {
    const db = makeDb();
    expect(() => QuotationService.create(db, user, {
      client_name: 'ACME', title: 'Ofertă cu linie invalidă',
      lines: [
        { description: 'OK', quantity: 1, unit: 'buc', unit_price: 10 },
        { description: 'BAD', quantity: 1, unit: 'buc', unit_price: -5 }, // CHECK fails
      ],
    } as never)).toThrow();
    // The fix's guarantee: ROLLBACK discarded the parent header too.
    expect(count(db, 'quotations')).toBe(0);
    expect(count(db, 'quotation_lines')).toBe(0);
  });

  it('list() batch-loads lines per quotation without cross-contamination (N+1 fix)', () => {
    const db = makeDb();
    const a = QuotationService.create(db, user, {
      client_name: 'A', title: 'Q-A',
      lines: [
        { description: 'a1', quantity: 1, unit: 'buc', unit_price: 1 },
        { description: 'a2', quantity: 1, unit: 'buc', unit_price: 2 },
      ],
    } as never);
    const b = QuotationService.create(db, user, {
      client_name: 'B', title: 'Q-B',
      lines: [{ description: 'b1', quantity: 1, unit: 'buc', unit_price: 3 }],
    } as never);

    const list = QuotationService.list(db, user);
    expect(list.length).toBe(2);
    const byId = new Map(list.map(q => [q.id, q]));
    expect(byId.get(a.id)!.lines.map(l => l.description).sort()).toEqual(['a1', 'a2']);
    expect(byId.get(b.id)!.lines.map(l => l.description)).toEqual(['b1']);
    // get() single-row path still attaches children correctly.
    expect(QuotationService.get(db, user, a.id).lines.length).toBe(2);
  });

  it('update rolls back without wiping existing lines when a new line fails', () => {
    const db = makeDb();
    const q = QuotationService.create(db, user, {
      client_name: 'ACME', title: 'Ofertă',
      lines: [{ description: 'Original', quantity: 1, unit: 'buc', unit_price: 10 }],
    } as never);
    expect(count(db, 'quotation_lines')).toBe(1);

    expect(() => QuotationService.update(db, user, {
      id: q.id,
      lines: [
        { description: 'Nou OK', quantity: 1, unit: 'buc', unit_price: 20 },
        { description: 'Nou BAD', quantity: 1, unit: 'buc', unit_price: -1 }, // CHECK fails
      ],
    } as never)).toThrow();

    // Pre-fix: the DELETE ran, the re-insert failed → 0 lines (data loss).
    // Post-fix: ROLLBACK restored the original single line.
    expect(count(db, 'quotation_lines')).toBe(1);
    const desc = db.exec('SELECT description FROM quotation_lines')[0].values[0][0];
    expect(desc).toBe('Original');
  });
});
