import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr, validateNumber } from '../middleware/validate';
import { roleHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';
import type { UserWithRole } from './authService';

export const ORDER_STATUSES = ['noua', 'in_preparare', 'gata', 'livrata', 'anulata'] as const;
export const ORDER_TYPES = ['dine_in', 'takeaway', 'delivery'] as const;

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number | null;
  name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: number;
  code: string;
  table_label: string | null;
  order_type: string;
  customer_name: string | null;
  status: string;
  total: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface CreateOrderItem {
  menu_item_id?: number | null;
  name: string;
  unit_price?: number | null;
  quantity?: number | null;
}

export interface CreateOrderRequest {
  table_label?: string | null;
  order_type?: string | null;
  customer_name?: string | null;
  notes?: string | null;
  currency?: string | null;
  items: CreateOrderItem[];
}

const OCOLS = 'id, code, table_label, order_type, customer_name, status, total, currency, notes, created_at, updated_at';

function canManage(db: Database, roleId: number): boolean {
  return roleHasAny(db, roleId, ['all', 'manage_orders', 'manage_sales', 'manage_costs']);
}
function audit(db: Database, userId: number, action: string, id: number | null): void {
  try { logAuditEvent(db, userId, action, 'restaurant_order', id); } catch { /* never break main flow */ }
}

function mapItem(r: Record<string, unknown>): OrderItem {
  return {
    id: r.id as number,
    order_id: r.order_id as number,
    menu_item_id: (r.menu_item_id as number | null) ?? null,
    name: r.name as string,
    unit_price: (r.unit_price as number) || 0,
    quantity: (r.quantity as number) || 0,
    line_total: (r.line_total as number) || 0,
  };
}
function mapOrder(r: Record<string, unknown>, items: OrderItem[]): Order {
  return {
    id: r.id as number,
    code: r.code as string,
    table_label: (r.table_label as string | null) ?? null,
    order_type: (r.order_type as string) || 'dine_in',
    customer_name: (r.customer_name as string | null) ?? null,
    status: (r.status as string) || 'noua',
    total: (r.total as number) || 0,
    currency: (r.currency as string) || 'RON',
    notes: (r.notes as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    items,
  };
}

function itemsFor(db: Database, orderId: number): OrderItem[] {
  const stmt = db.prepare('SELECT id, order_id, menu_item_id, name, unit_price, quantity, line_total FROM restaurant_order_items WHERE order_id = ? ORDER BY id');
  stmt.bind([orderId]);
  const out: OrderItem[] = [];
  while (stmt.step()) out.push(mapItem(stmt.getAsObject()));
  stmt.free();
  return out;
}

export class OrderService {
  static getOrders(db: Database): Order[] {
    const stmt = db.prepare(`SELECT ${OCOLS} FROM restaurant_orders ORDER BY datetime(created_at) DESC, id DESC`);
    const out: Order[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      out.push(mapOrder(row, itemsFor(db, row.id as number)));
    }
    stmt.free();
    return out;
  }

  static getOrder(db: Database, id: number): Order {
    const stmt = db.prepare(`SELECT ${OCOLS} FROM restaurant_orders WHERE id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Comandă negăsită'); }
    const row = stmt.getAsObject();
    stmt.free();
    return mapOrder(row, itemsFor(db, id));
  }

  static createOrder(db: Database, user: UserWithRole, req: CreateOrderRequest): Order {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    if (!Array.isArray(req.items) || req.items.length === 0) throw CommandError.badRequest('Comanda nu are produse');

    const tableLabel = capStr(req.table_label, 40, 'table_label');
    const orderType = (capStr(req.order_type, 20, 'order_type') || 'dine_in');
    const type = (ORDER_TYPES as readonly string[]).includes(orderType) ? orderType : 'dine_in';
    const customer = capStr(req.customer_name, 120, 'customer_name');
    const notes = capStr(req.notes, 1000, 'notes');
    const currency = capStr(req.currency, 8, 'currency') || 'RON';

    const lines = req.items.map((it, i) => {
      const name = capStr(it.name, 200, `items[${i}].name`, { required: true })!;
      const unit = validateNumber(it.unit_price, `items[${i}].unit_price`, { min: 0, max: 1e6 }) ?? 0;
      const qty = validateNumber(it.quantity, `items[${i}].quantity`, { min: 1, max: 9999 }) ?? 1;
      const menuId = it.menu_item_id != null ? (validateNumber(it.menu_item_id, `items[${i}].menu_item_id`, { min: 1, max: 1e12 }) ?? null) : null;
      return { menuId, name, unit, qty: Math.round(qty), line: unit * Math.round(qty) };
    });
    const total = lines.reduce((s, l) => s + l.line, 0);

    const cstmt = db.prepare("SELECT code FROM restaurant_orders WHERE code LIKE 'CMD-%' ORDER BY CAST(SUBSTR(code, 5) AS INTEGER) DESC LIMIT 1");
    let next = 1;
    if (cstmt.step()) {
      const n = parseInt(String(cstmt.get()[0]).replace(/^CMD-/, ''), 10);
      if (Number.isFinite(n)) next = n + 1;
    }
    cstmt.free();
    const code = `CMD-${String(next).padStart(4, '0')}`;

    db.run(
      `INSERT INTO restaurant_orders (code, table_label, order_type, customer_name, status, total, currency, notes)
       VALUES (?, ?, ?, ?, 'noua', ?, ?, ?)`,
      [code, tableLabel, type, customer, total, currency, notes],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    for (const l of lines) {
      db.run(
        `INSERT INTO restaurant_order_items (order_id, menu_item_id, name, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, l.menuId, l.name, l.unit, l.qty, l.line],
      );
    }

    audit(db, user.id, 'CREATE', id);
    return this.getOrder(db, id);
  }

  static updateOrderStatus(db: Database, user: UserWithRole, id: number, status: string): Order {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    if (!(ORDER_STATUSES as readonly string[]).includes(status)) throw CommandError.badRequest('Status invalid');
    this.getOrder(db, id);
    db.run("UPDATE restaurant_orders SET status=?, updated_at=datetime('now') WHERE id=?", [status, id]);
    audit(db, user.id, 'UPDATE', id);
    return this.getOrder(db, id);
  }

  static deleteOrder(db: Database, user: UserWithRole, id: number): void {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    this.getOrder(db, id);
    db.run('DELETE FROM restaurant_order_items WHERE order_id = ?', [id]);
    db.run('DELETE FROM restaurant_orders WHERE id = ?', [id]);
    audit(db, user.id, 'DELETE', id);
  }
}
