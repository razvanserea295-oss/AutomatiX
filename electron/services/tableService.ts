import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr, validateNumber } from '../middleware/validate';
import { roleHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';
import type { UserWithRole } from './authService';

// Restaurant table (masă) on the floor plan. Backs the Mese page for restaurant
// tenants. Same CRUD shape as MenuService so it reuses all shared plumbing.
export interface RestaurantTable {
  id: number;
  code: string;
  label: string;
  zone: string;
  seats: number;
  status: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTableRequest {
  label: string;
  zone?: string | null;
  seats?: number | null;
  status?: string | null;
  notes?: string | null;
  sort_order?: number | null;
}

export interface UpdateTableRequest extends CreateTableRequest {
  id: number;
}

const COLS = 'id, code, label, zone, seats, status, notes, sort_order, created_at, updated_at';
const STATUSES = ['libera', 'ocupata', 'rezervata'];

function canManage(db: Database, roleId: number): boolean {
  return roleHasAny(db, roleId, ['all', 'manage_menu', 'manage_costs']);
}
function audit(db: Database, userId: number, action: string, id: number | null): void {
  try { logAuditEvent(db, userId, action, 'restaurant_table', id); } catch { /* never break main flow */ }
}
function normStatus(v: string | null | undefined, fallback: string): string {
  const s = (v || '').trim().toLowerCase();
  return STATUSES.includes(s) ? s : fallback;
}
function mapRow(row: Record<string, unknown>): RestaurantTable {
  return {
    id: row.id as number,
    code: row.code as string,
    label: row.label as string,
    zone: (row.zone as string) || 'Salon',
    seats: (row.seats as number) || 2,
    status: (row.status as string) || 'libera',
    notes: (row.notes as string | null) ?? null,
    sort_order: (row.sort_order as number) || 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export class TableService {
  static getTables(db: Database): RestaurantTable[] {
    const stmt = db.prepare(`SELECT ${COLS} FROM restaurant_tables ORDER BY zone, sort_order, label`);
    const out: RestaurantTable[] = [];
    while (stmt.step()) out.push(mapRow(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  static getTable(db: Database, id: number): RestaurantTable {
    const stmt = db.prepare(`SELECT ${COLS} FROM restaurant_tables WHERE id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Masă negăsită'); }
    const r = mapRow(stmt.getAsObject());
    stmt.free();
    return r;
  }

  static createTable(db: Database, user: UserWithRole, req: CreateTableRequest): RestaurantTable {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    const label = capStr(req.label, 60, 'label', { required: true })!;
    const zone = capStr(req.zone, 60, 'zone') || 'Salon';
    const notes = capStr(req.notes, 1000, 'notes') ?? null;
    const seats = validateNumber(req.seats, 'seats', { min: 1, max: 100 }) ?? 2;
    const sortOrder = validateNumber(req.sort_order, 'sort_order', { min: 0, max: 1e6 }) ?? 0;
    const status = normStatus(req.status, 'libera');

    const cstmt = db.prepare("SELECT code FROM restaurant_tables WHERE code LIKE 'MESA-%' ORDER BY CAST(SUBSTR(code, 6) AS INTEGER) DESC LIMIT 1");
    let next = 1;
    if (cstmt.step()) {
      const last = cstmt.get()[0] as string;
      const n = parseInt(String(last).replace(/^MESA-/, ''), 10);
      if (Number.isFinite(n)) next = n + 1;
    }
    cstmt.free();
    const code = `MESA-${String(next).padStart(4, '0')}`;

    db.run(
      `INSERT INTO restaurant_tables (code, label, zone, seats, status, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [code, label, zone, seats, status, notes, sortOrder],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    audit(db, user.id, 'CREATE', id);
    return this.getTable(db, id);
  }

  static updateTable(db: Database, user: UserWithRole, req: UpdateTableRequest): RestaurantTable {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    const cur = this.getTable(db, req.id);
    const label = req.label != null ? capStr(req.label, 60, 'label', { required: true })! : cur.label;
    const zone = req.zone != null ? (capStr(req.zone, 60, 'zone') || cur.zone) : cur.zone;
    const notes = req.notes !== undefined ? (capStr(req.notes, 1000, 'notes') ?? null) : cur.notes;
    const seats = req.seats != null ? (validateNumber(req.seats, 'seats', { min: 1, max: 100 }) ?? cur.seats) : cur.seats;
    const sortOrder = req.sort_order != null ? (validateNumber(req.sort_order, 'sort_order', { min: 0, max: 1e6 }) ?? cur.sort_order) : cur.sort_order;
    const status = req.status != null ? normStatus(req.status, cur.status) : cur.status;

    db.run(
      `UPDATE restaurant_tables SET label=?, zone=?, seats=?, status=?, notes=?, sort_order=?, updated_at=datetime('now') WHERE id=?`,
      [label, zone, seats, status, notes, sortOrder, req.id],
    );
    audit(db, user.id, 'UPDATE', req.id);
    return this.getTable(db, req.id);
  }

  static deleteTable(db: Database, user: UserWithRole, id: number): void {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    this.getTable(db, id);
    db.run('DELETE FROM restaurant_tables WHERE id = ?', [id]);
    audit(db, user.id, 'DELETE', id);
  }

  static setStatus(db: Database, user: UserWithRole, id: number, status: string): RestaurantTable {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    this.getTable(db, id);
    db.run("UPDATE restaurant_tables SET status=?, updated_at=datetime('now') WHERE id=?", [normStatus(status, 'libera'), id]);
    audit(db, user.id, 'UPDATE', id);
    return this.getTable(db, id);
  }
}
