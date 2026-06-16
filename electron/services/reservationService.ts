import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr, validateNumber } from '../middleware/validate';
import { roleHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';
import type { UserWithRole } from './authService';

// Restaurant reservation (rezervare). Backs the Rezervări page for restaurant
// tenants. Same CRUD shape as MenuService so it reuses all shared plumbing.
export interface Reservation {
  id: number;
  code: string;
  customer_name: string;
  phone: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_label: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReservationRequest {
  customer_name: string;
  phone?: string | null;
  party_size?: number | null;
  reservation_date?: string | null;
  reservation_time?: string | null;
  table_label?: string | null;
  status?: string | null;
  notes?: string | null;
}

export interface UpdateReservationRequest extends CreateReservationRequest {
  id: number;
}

const COLS = 'id, code, customer_name, phone, party_size, reservation_date, reservation_time, table_label, status, notes, created_at, updated_at';
const STATUSES = ['noua', 'confirmata', 'asezata', 'finalizata', 'anulata'];

function canManage(db: Database, roleId: number): boolean {
  return roleHasAny(db, roleId, ['all', 'manage_menu', 'manage_costs']);
}
function audit(db: Database, userId: number, action: string, id: number | null): void {
  try { logAuditEvent(db, userId, action, 'reservation', id); } catch { /* never break main flow */ }
}
function normStatus(v: string | null | undefined, fallback: string): string {
  const s = (v || '').trim().toLowerCase();
  return STATUSES.includes(s) ? s : fallback;
}
function mapRow(row: Record<string, unknown>): Reservation {
  return {
    id: row.id as number,
    code: row.code as string,
    customer_name: row.customer_name as string,
    phone: (row.phone as string | null) ?? null,
    party_size: (row.party_size as number) || 1,
    reservation_date: (row.reservation_date as string) || '',
    reservation_time: (row.reservation_time as string) || '',
    table_label: (row.table_label as string | null) ?? null,
    status: (row.status as string) || 'confirmata',
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export class ReservationService {
  static getReservations(db: Database): Reservation[] {
    const stmt = db.prepare(`SELECT ${COLS} FROM reservations ORDER BY reservation_date DESC, reservation_time DESC, id DESC`);
    const out: Reservation[] = [];
    while (stmt.step()) out.push(mapRow(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  static getReservation(db: Database, id: number): Reservation {
    const stmt = db.prepare(`SELECT ${COLS} FROM reservations WHERE id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Rezervare negăsită'); }
    const r = mapRow(stmt.getAsObject());
    stmt.free();
    return r;
  }

  static createReservation(db: Database, user: UserWithRole, req: CreateReservationRequest): Reservation {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    const customer = capStr(req.customer_name, 200, 'customer_name', { required: true })!;
    const phone = capStr(req.phone, 40, 'phone') ?? null;
    const date = capStr(req.reservation_date, 20, 'reservation_date') || '';
    const time = capStr(req.reservation_time, 10, 'reservation_time') || '19:00';
    const tableLabel = capStr(req.table_label, 40, 'table_label') ?? null;
    const notes = capStr(req.notes, 1000, 'notes') ?? null;
    const party = validateNumber(req.party_size, 'party_size', { min: 1, max: 1000 }) ?? 2;
    const status = normStatus(req.status, 'confirmata');

    const cstmt = db.prepare("SELECT code FROM reservations WHERE code LIKE 'REZ-%' ORDER BY CAST(SUBSTR(code, 5) AS INTEGER) DESC LIMIT 1");
    let next = 1;
    if (cstmt.step()) {
      const last = cstmt.get()[0] as string;
      const n = parseInt(String(last).replace(/^REZ-/, ''), 10);
      if (Number.isFinite(n)) next = n + 1;
    }
    cstmt.free();
    const code = `REZ-${String(next).padStart(4, '0')}`;

    db.run(
      `INSERT INTO reservations (code, customer_name, phone, party_size, reservation_date, reservation_time, table_label, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, customer, phone, party, date, time, tableLabel, status, notes],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    audit(db, user.id, 'CREATE', id);
    return this.getReservation(db, id);
  }

  static updateReservation(db: Database, user: UserWithRole, req: UpdateReservationRequest): Reservation {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    const cur = this.getReservation(db, req.id);
    const customer = req.customer_name != null ? capStr(req.customer_name, 200, 'customer_name', { required: true })! : cur.customer_name;
    const phone = req.phone !== undefined ? (capStr(req.phone, 40, 'phone') ?? null) : cur.phone;
    const date = req.reservation_date != null ? (capStr(req.reservation_date, 20, 'reservation_date') || cur.reservation_date) : cur.reservation_date;
    const time = req.reservation_time != null ? (capStr(req.reservation_time, 10, 'reservation_time') || cur.reservation_time) : cur.reservation_time;
    const tableLabel = req.table_label !== undefined ? (capStr(req.table_label, 40, 'table_label') ?? null) : cur.table_label;
    const notes = req.notes !== undefined ? (capStr(req.notes, 1000, 'notes') ?? null) : cur.notes;
    const party = req.party_size != null ? (validateNumber(req.party_size, 'party_size', { min: 1, max: 1000 }) ?? cur.party_size) : cur.party_size;
    const status = req.status != null ? normStatus(req.status, cur.status) : cur.status;

    db.run(
      `UPDATE reservations SET customer_name=?, phone=?, party_size=?, reservation_date=?, reservation_time=?, table_label=?, status=?, notes=?, updated_at=datetime('now') WHERE id=?`,
      [customer, phone, party, date, time, tableLabel, status, notes, req.id],
    );
    audit(db, user.id, 'UPDATE', req.id);
    return this.getReservation(db, req.id);
  }

  static deleteReservation(db: Database, user: UserWithRole, id: number): void {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    this.getReservation(db, id);
    db.run('DELETE FROM reservations WHERE id = ?', [id]);
    audit(db, user.id, 'DELETE', id);
  }

  static setStatus(db: Database, user: UserWithRole, id: number, status: string): Reservation {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    this.getReservation(db, id);
    db.run("UPDATE reservations SET status=?, updated_at=datetime('now') WHERE id=?", [normStatus(status, 'confirmata'), id]);
    audit(db, user.id, 'UPDATE', id);
    return this.getReservation(db, id);
  }
}
