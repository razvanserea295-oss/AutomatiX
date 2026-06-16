import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';
import { userHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';





export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  cui: string | null;
  address: string | null;
  website: string | null;
  category: string | null;
  products: string | null;
  payment_terms: string | null;
  active: number;
  created_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  cui?: string | null;
  address?: string | null;
  website?: string | null;
  category?: string | null;
  products?: string | null;
  payment_terms?: string | null;
  active?: number | boolean | null;
}

export interface UpdateSupplierRequest {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  cui?: string | null;
  address?: string | null;
  website?: string | null;
  category?: string | null;
  products?: string | null;
  payment_terms?: string | null;
  active?: number | boolean | null;
}

export interface PurchaseOrderSummary {
  id: number;
  supplier_id: number;
  supplier_name: string;
  project_id: number;
  project_name: string;
  status: string;
  internal_ref: string | null;
  ordered_at: string;
  line_count: number;
}

export interface PurchaseOrderLineDetail {
  id: number;
  line_no: number;
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  qty_ordered: number;
  qty_received: number;
}

export interface PurchaseOrderDetail {
  id: number;
  supplier_id: number;
  supplier_name: string;
  project_id: number;
  project_name: string;
  status: string;
  internal_ref: string | null;
  ordered_at: string;
  lines: PurchaseOrderLineDetail[];
}

export interface CreatePurchaseOrderLine {
  material_id: number;
  qty_ordered: number;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: number;
  project_id: number;
  internal_ref?: string | null;
  lines: CreatePurchaseOrderLine[];
}

export interface ReceivePurchaseLineRequest {
  line_id: number;
  qty: number;
  create_aviz_in?: boolean;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(mapper(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}
function canWrite(db: Database, user: UserWithRole): boolean {
  return userHasAny(db, user, ['all', 'manage_costs', 'manage_projects'],
    ['suppliers', 'purchase-orders', 'goods-receipts']);
}

function audit(db: Database, userId: number, action: string, entityType: string, entityId: number | null): void {
  logAuditEvent(db, userId, action, entityType, entityId);
}

function mapSupplierRow(row: any): Supplier {
  return {
    id: row.id as number, name: row.name as string,
    contact_person: row.contact_person as string | null, email: row.email as string | null,
    phone: row.phone as string | null, notes: row.notes as string | null,
    cui: row.cui as string | null, address: row.address as string | null,
    website: row.website as string | null, category: row.category as string | null,
    products: row.products as string | null, payment_terms: row.payment_terms as string | null,
    active: (row.active as number) ?? 1,
    created_at: row.created_at as string,
  };
}

function normalizeActive(v: number | boolean | null | undefined): number {
  if (v == null) return 1;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return Number(v) ? 1 : 0;
}





export class ProcurementService {
  static getSuppliers(db: Database): Supplier[] {
    return queryRows(db,
      `SELECT id, name, contact_person, email, phone, notes, cui, address, website,
              category, products, payment_terms, COALESCE(active, 1) AS active, created_at
       FROM suppliers ORDER BY name ASC`,
      [], mapSupplierRow
    );
  }

  static createSupplier(db: Database, user: UserWithRole, req: CreateSupplierRequest): Supplier {
    if (!canWrite(db, user)) throw CommandError.forbidden('Acces refuzat');
    const name = req.name.trim();
    if (!name) throw CommandError.badRequest('Numele furnizorului este obligatoriu');

    db.run(
      `INSERT INTO suppliers (name, contact_person, email, phone, notes,
                              cui, address, website, category, products, payment_terms, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, req.contact_person ?? null, req.email ?? null, req.phone ?? null, req.notes ?? null,
       req.cui ?? null, req.address ?? null, req.website ?? null, req.category ?? null,
       req.products ?? null, req.payment_terms ?? null, normalizeActive(req.active)]
    );
    const idRow = queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number);
    const id = idRow!;
    audit(db, user.id, 'CREATE', 'supplier', id);
    return this.getSupplierById(db, id);
  }

  static updateSupplier(db: Database, user: UserWithRole, req: UpdateSupplierRequest): Supplier {
    if (!canWrite(db, user)) throw CommandError.forbidden('Acces refuzat');
    const name = req.name.trim();
    if (!name) throw CommandError.badRequest('Numele furnizorului este obligatoriu');

    db.run(
      `UPDATE suppliers SET name = ?, contact_person = ?, email = ?, phone = ?, notes = ?,
                            cui = ?, address = ?, website = ?, category = ?, products = ?,
                            payment_terms = ?, active = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [name, req.contact_person ?? null, req.email ?? null, req.phone ?? null, req.notes ?? null,
       req.cui ?? null, req.address ?? null, req.website ?? null, req.category ?? null,
       req.products ?? null, req.payment_terms ?? null, normalizeActive(req.active), req.id]
    );
    audit(db, user.id, 'UPDATE', 'supplier', req.id);
    return this.getSupplierById(db, req.id);
  }

  static deleteSupplier(db: Database, user: UserWithRole, id: number): void {
    if (!canWrite(db, user)) throw CommandError.forbidden('Acces refuzat');

    const poCount = queryOne(db,
      'SELECT COUNT(*) as cnt FROM purchase_orders WHERE supplier_id = ?', [id],
      r => r.cnt as number
    ) || 0;
    if (poCount > 0) {
      throw CommandError.badRequest(`Furnizorul are ${poCount} comenzi asociate. Sterge comenzile mai intai.`);
    }

    db.run('DELETE FROM suppliers WHERE id = ?', [id]);
    audit(db, user.id, 'DELETE', 'supplier', id);
  }

  private static getSupplierById(db: Database, id: number): Supplier {
    const result = queryOne(db,
      `SELECT id, name, contact_person, email, phone, notes, cui, address, website,
              category, products, payment_terms, COALESCE(active, 1) AS active, created_at
       FROM suppliers WHERE id = ?`,
      [id], mapSupplierRow
    );
    if (!result) throw CommandError.notFound('Furnizor negăsit');
    return result;
  }

  static listPurchaseOrders(db: Database, projectId?: number | null): PurchaseOrderSummary[] {
    const sql = projectId
      ? `SELECT po.id, po.supplier_id, s.name as supplier_name, po.project_id, p.name as project_name, po.status, po.internal_ref, po.ordered_at,
              (SELECT COUNT(*) FROM purchase_order_lines l WHERE l.purchase_order_id = po.id) as line_count
         FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id JOIN projects p ON p.id = po.project_id
         WHERE po.project_id = ? ORDER BY po.ordered_at DESC`
      : `SELECT po.id, po.supplier_id, s.name as supplier_name, po.project_id, p.name as project_name, po.status, po.internal_ref, po.ordered_at,
              (SELECT COUNT(*) FROM purchase_order_lines l WHERE l.purchase_order_id = po.id) as line_count
         FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id JOIN projects p ON p.id = po.project_id
         ORDER BY po.ordered_at DESC`;

    return queryRows(db, sql, projectId ? [projectId] : [],
      (row) => ({
        id: row.id as number, supplier_id: row.supplier_id as number, supplier_name: row.supplier_name as string,
        project_id: row.project_id as number, project_name: row.project_name as string,
        status: row.status as string, internal_ref: row.internal_ref as string | null,
        ordered_at: row.ordered_at as string, line_count: (row.line_count as number) || 0,
      })
    );
  }

  static getPurchaseOrder(db: Database, id: number): PurchaseOrderDetail {
    const header = queryOne(db,
      `SELECT po.supplier_id, s.name as supplier_name, po.project_id, p.name as project_name, po.status, po.internal_ref, po.ordered_at
       FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id JOIN projects p ON p.id = po.project_id WHERE po.id = ?`,
      [id],
      (row) => row
    );
    if (!header) throw CommandError.notFound('Comandă de achiziție negăsită');

    const lines = queryRows(db,
      `SELECT l.id, l.line_no, l.material_id, m.code as material_code, m.name as material_name, m.unit, l.qty_ordered, l.qty_received
       FROM purchase_order_lines l JOIN materials m ON m.id = l.material_id WHERE l.purchase_order_id = ? ORDER BY l.line_no ASC`,
      [id],
      (row) => ({
        id: row.id as number, line_no: row.line_no as number, material_id: row.material_id as number,
        material_code: row.material_code as string, material_name: row.material_name as string,
        unit: row.unit as string, qty_ordered: row.qty_ordered as number, qty_received: row.qty_received as number,
      })
    );

    return {
      id,
      supplier_id: header.supplier_id as number, supplier_name: header.supplier_name as string,
      project_id: header.project_id as number, project_name: header.project_name as string,
      status: header.status as string, internal_ref: header.internal_ref as string | null,
      ordered_at: header.ordered_at as string, lines,
    };
  }

  static createPurchaseOrder(db: Database, user: UserWithRole, req: CreatePurchaseOrderRequest): PurchaseOrderDetail {
    if (!canWrite(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (!req.lines || req.lines.length === 0) throw CommandError.badRequest('Adăugați cel puțin o linie');
    for (const line of req.lines) {
      if (line.qty_ordered <= 0) throw CommandError.badRequest('Cantitățile trebuie să fie pozitive');
    }

    // PO header + its lines must be atomic — a line insert failing mid-loop
    // previously left an empty/partial purchase order. Same fix as goods
    // receipt (audit 2026-06-11).
    db.run('BEGIN');
    let poId: number;
    try {
      db.run(
        "INSERT INTO purchase_orders (supplier_id, project_id, status, internal_ref, created_by) VALUES (?, ?, 'open', ?, ?)",
        [req.supplier_id, req.project_id, req.internal_ref ?? null, user.id]
      );
      poId = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;

      req.lines.forEach((line, i) => {
        db.run(
          'INSERT INTO purchase_order_lines (purchase_order_id, line_no, material_id, qty_ordered) VALUES (?, ?, ?, ?)',
          [poId, i + 1, line.material_id, line.qty_ordered]
        );
      });

      db.run('COMMIT');
    } catch (err) {
      try { db.run('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }

    audit(db, user.id, 'CREATE', 'purchase_order', poId);
    return this.getPurchaseOrder(db, poId);
  }

  static receivePurchaseLine(db: Database, user: UserWithRole, req: ReceivePurchaseLineRequest): PurchaseOrderDetail {
    if (!canWrite(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (req.qty <= 0) throw CommandError.badRequest('Cantitatea de recepționat trebuie să fie pozitivă');

    const lineRow = queryOne(db,
      'SELECT purchase_order_id, material_id, qty_ordered, qty_received FROM purchase_order_lines WHERE id = ?',
      [req.line_id],
      r => ({ po_id: r.purchase_order_id as number, material_id: r.material_id as number, qty_ordered: r.qty_ordered as number, qty_received: r.qty_received as number })
    );
    if (!lineRow) throw CommandError.notFound('Linie negăsită');

    const remaining = lineRow.qty_ordered - lineRow.qty_received;
    if (req.qty > remaining + 1e-9) {
      throw CommandError.badRequest(`Maxim recepționabil: ${remaining}`);
    }

    db.run('UPDATE purchase_order_lines SET qty_received = qty_received + ? WHERE id = ?', [req.qty, req.line_id]);
    db.run("UPDATE materials SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?", [req.qty, lineRow.material_id]);

    this.refreshPoStatus(db, lineRow.po_id);
    audit(db, user.id, 'RECEIVE', 'purchase_order_line', req.line_id);
    return this.getPurchaseOrder(db, lineRow.po_id);
  }

  private static refreshPoStatus(db: Database, poId: number): void {
    const lines = queryRows(db,
      'SELECT qty_ordered, qty_received FROM purchase_order_lines WHERE purchase_order_id = ?',
      [poId],
      r => ({ ordered: r.qty_ordered as number, received: r.qty_received as number })
    );
    let any = false;
    let allDone = true;
    for (const l of lines) {
      any = true;
      if (l.received + 1e-9 < l.ordered) allDone = false;
    }
    const status = !any ? 'open' : allDone ? 'closed' : 'partial';
    db.run('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, poId]);
  }
}
