import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr, validateNumber } from '../middleware/validate';
import { roleHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';
import type { UserWithRole } from './authService';

// Restaurant menu item (produs de meniu). Backs the Meniu page for restaurant
// tenants. Same CRUD shape as MaterialService so it reuses all shared plumbing.
export interface MenuItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  available: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMenuItemRequest {
  name: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  available?: boolean | number | null;
  sort_order?: number | null;
}

export interface UpdateMenuItemRequest extends CreateMenuItemRequest {
  id: number;
}

const COLS = 'id, code, name, description, category, price, currency, available, sort_order, created_at, updated_at';

function canManage(db: Database, roleId: number): boolean {
  return roleHasAny(db, roleId, ['all', 'manage_menu', 'manage_costs']);
}
function audit(db: Database, userId: number, action: string, id: number | null): void {
  try { logAuditEvent(db, userId, action, 'menu_item', id); } catch { /* never break main flow */ }
}
function mapRow(row: Record<string, unknown>): MenuItem {
  return {
    id: row.id as number,
    code: row.code as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    category: (row.category as string) || 'Burgeri',
    price: (row.price as number) || 0,
    currency: (row.currency as string) || 'RON',
    available: (row.available as number) ?? 1,
    sort_order: (row.sort_order as number) || 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
function toAvailable(v: boolean | number | null | undefined, fallback: number): number {
  if (v === undefined) return fallback;
  return v === false || v === 0 ? 0 : 1;
}

export class MenuService {
  static getMenuItems(db: Database): MenuItem[] {
    const stmt = db.prepare(`SELECT ${COLS} FROM menu_items ORDER BY category, sort_order, name`);
    const out: MenuItem[] = [];
    while (stmt.step()) out.push(mapRow(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  static getMenuItem(db: Database, id: number): MenuItem {
    const stmt = db.prepare(`SELECT ${COLS} FROM menu_items WHERE id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Produs negăsit'); }
    const r = mapRow(stmt.getAsObject());
    stmt.free();
    return r;
  }

  static createMenuItem(db: Database, user: UserWithRole, req: CreateMenuItemRequest): MenuItem {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    const name = capStr(req.name, 200, 'name', { required: true })!;
    const category = capStr(req.category, 40, 'category') || 'Burgeri';
    const description = capStr(req.description, 1000, 'description') ?? null;
    const currency = capStr(req.currency, 8, 'currency') || 'RON';
    const price = validateNumber(req.price, 'price', { min: 0, max: 1e6 }) ?? 0;
    const sortOrder = validateNumber(req.sort_order, 'sort_order', { min: 0, max: 1e6 }) ?? 0;
    const available = toAvailable(req.available, 1);

    const cstmt = db.prepare("SELECT code FROM menu_items WHERE code LIKE 'MENU-%' ORDER BY CAST(SUBSTR(code, 6) AS INTEGER) DESC LIMIT 1");
    let next = 1;
    if (cstmt.step()) {
      const last = cstmt.get()[0] as string;
      const n = parseInt(String(last).replace(/^MENU-/, ''), 10);
      if (Number.isFinite(n)) next = n + 1;
    }
    cstmt.free();
    const code = `MENU-${String(next).padStart(4, '0')}`;

    db.run(
      `INSERT INTO menu_items (code, name, description, category, price, currency, available, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, name, description, category, price, currency, available, sortOrder],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    audit(db, user.id, 'CREATE', id);
    return this.getMenuItem(db, id);
  }

  static updateMenuItem(db: Database, user: UserWithRole, req: UpdateMenuItemRequest): MenuItem {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    const cur = this.getMenuItem(db, req.id);
    const name = req.name != null ? capStr(req.name, 200, 'name', { required: true })! : cur.name;
    const category = req.category != null ? (capStr(req.category, 40, 'category') || cur.category) : cur.category;
    const description = req.description !== undefined ? (capStr(req.description, 1000, 'description') ?? null) : cur.description;
    const currency = req.currency != null ? (capStr(req.currency, 8, 'currency') || cur.currency) : cur.currency;
    const price = req.price != null ? (validateNumber(req.price, 'price', { min: 0, max: 1e6 }) ?? cur.price) : cur.price;
    const sortOrder = req.sort_order != null ? (validateNumber(req.sort_order, 'sort_order', { min: 0, max: 1e6 }) ?? cur.sort_order) : cur.sort_order;
    const available = toAvailable(req.available, cur.available);

    db.run(
      `UPDATE menu_items SET name=?, description=?, category=?, price=?, currency=?, available=?, sort_order=?, updated_at=datetime('now') WHERE id=?`,
      [name, description, category, price, currency, available, sortOrder, req.id],
    );
    audit(db, user.id, 'UPDATE', req.id);
    return this.getMenuItem(db, req.id);
  }

  static deleteMenuItem(db: Database, user: UserWithRole, id: number): void {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    this.getMenuItem(db, id);
    db.run('DELETE FROM menu_items WHERE id = ?', [id]);
    audit(db, user.id, 'DELETE', id);
  }

  static setAvailability(db: Database, user: UserWithRole, id: number, available: boolean): MenuItem {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    this.getMenuItem(db, id);
    db.run("UPDATE menu_items SET available=?, updated_at=datetime('now') WHERE id=?", [available ? 1 : 0, id]);
    audit(db, user.id, 'UPDATE', id);
    return this.getMenuItem(db, id);
  }
}
