






import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { logAuditEvent } from '../db/auditLogs';
import type { UserWithRole } from './authService';

export interface GoodsReceiptLine {
  id: number; receipt_id: number; po_line_id: number | null;
  material_id: number | null; material_name: string | null;
  description: string; qty_expected: number; qty_received: number;
  qty_match: boolean; label_ok: boolean;
  lot_number: string | null; expiry_date: string | null;
  has_issue: boolean; issue_description: string | null; photo_base64: string | null;
}

export interface GoodsReceipt {
  id: number; receipt_number: string;
  purchase_order_id: number | null; po_internal_ref: string | null;
  supplier_id: number | null; supplier_name: string | null;
  project_id: number | null; project_name: string | null;
  received_date: string;
  received_by: number; received_by_name: string | null;
  status: string; notes: string | null;
  created_at: string;
  lines: GoodsReceiptLine[];
}

function rowsAll(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}
function rowOne(db: Database, sql: string, params: any[] = []): any | null {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const r = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return r;
}

function generateReceiptNumber(db: Database): string {
  const year = new Date().getFullYear();
  const stmt = db.prepare("SELECT COUNT(*) FROM goods_receipts WHERE receipt_number LIKE ?");
  stmt.bind([`NIR-${year}-%`]);
  let n = 0;
  if (stmt.step()) n = stmt.get()[0] as number;
  stmt.free();
  return `NIR-${year}-${String(n + 1).padStart(5, '0')}`;
}

function loadLines(db: Database, receiptId: number): GoodsReceiptLine[] {
  return rowsAll(db, `
    SELECT l.id, l.receipt_id, l.po_line_id, l.material_id, m.name AS material_name,
           l.description, l.qty_expected, l.qty_received,
           l.qty_match, l.label_ok, l.lot_number, l.expiry_date,
           l.has_issue, l.issue_description, l.photo_base64
    FROM goods_receipt_lines l LEFT JOIN materials m ON m.id = l.material_id
    WHERE l.receipt_id = ? ORDER BY l.id
  `, [receiptId]).map(r => ({
    id: r.id as number,
    receipt_id: r.receipt_id as number,
    po_line_id: (r.po_line_id as number | null) ?? null,
    material_id: (r.material_id as number | null) ?? null,
    material_name: (r.material_name as string | null) ?? null,
    description: r.description as string,
    qty_expected: (r.qty_expected as number) || 0,
    qty_received: (r.qty_received as number) || 0,
    qty_match: ((r.qty_match as number) || 0) === 1,
    label_ok: ((r.label_ok as number) || 0) === 1,
    lot_number: (r.lot_number as string | null) ?? null,
    expiry_date: (r.expiry_date as string | null) ?? null,
    has_issue: ((r.has_issue as number) || 0) === 1,
    issue_description: (r.issue_description as string | null) ?? null,
    photo_base64: (r.photo_base64 as string | null) ?? null,
  }));
}

function rowToReceipt(r: any, db: Database): GoodsReceipt {
  return {
    id: r.id as number,
    receipt_number: r.receipt_number as string,
    purchase_order_id: (r.purchase_order_id as number | null) ?? null,
    po_internal_ref: (r.po_internal_ref as string | null) ?? null,
    supplier_id: (r.supplier_id as number | null) ?? null,
    supplier_name: (r.supplier_name as string | null) ?? null,
    project_id: (r.project_id as number | null) ?? null,
    project_name: (r.project_name as string | null) ?? null,
    received_date: r.received_date as string,
    received_by: r.received_by as number,
    received_by_name: (r.received_by_name as string | null) ?? null,
    status: r.status as string,
    notes: (r.notes as string | null) ?? null,
    created_at: r.created_at as string,
    lines: loadLines(db, r.id as number),
  };
}

const RECEIPT_SQL = `
  SELECT gr.id, gr.receipt_number, gr.purchase_order_id, po.internal_ref AS po_internal_ref,
         gr.supplier_id, s.name AS supplier_name,
         gr.project_id, p.name AS project_name,
         gr.received_date, gr.received_by, u.full_name AS received_by_name,
         gr.status, gr.notes, gr.created_at
  FROM goods_receipts gr
  LEFT JOIN purchase_orders po ON po.id = gr.purchase_order_id
  LEFT JOIN suppliers s ON s.id = gr.supplier_id
  LEFT JOIN projects p ON p.id = gr.project_id
  LEFT JOIN users u ON u.id = gr.received_by
`;

export class GoodsReceiptService {
  static list(db: Database, _user: UserWithRole, status?: string): GoodsReceipt[] {
    const sql = status
      ? `${RECEIPT_SQL} WHERE gr.status = ? ORDER BY gr.received_date DESC`
      : `${RECEIPT_SQL} ORDER BY gr.received_date DESC LIMIT 200`;
    return rowsAll(db, sql, status ? [status] : []).map(r => rowToReceipt(r, db));
  }

  static get(db: Database, _user: UserWithRole, id: number): GoodsReceipt {
    const r = rowOne(db, `${RECEIPT_SQL} WHERE gr.id = ?`, [id]);
    if (!r) throw CommandError.notFound('Recepție negăsită');
    return rowToReceipt(r, db);
  }

  static create(db: Database, user: UserWithRole, req: {
    purchase_order_id?: number | null; supplier_id?: number | null; project_id?: number | null;
    notes?: string;
    lines: Array<{
      po_line_id?: number | null; material_id?: number | null; description: string;
      qty_expected: number; qty_received: number;
      qty_match?: boolean; label_ok?: boolean;
      lot_number?: string | null; expiry_date?: string | null;
      has_issue?: boolean; issue_description?: string | null; photo_base64?: string | null;
    }>;
  }): GoodsReceipt {
    if (!Array.isArray(req.lines) || req.lines.length === 0) {
      throw CommandError.badRequest('Cel puțin o linie');
    }

    let supplierId = req.supplier_id ?? null;
    let projectId = req.project_id ?? null;
    if (req.purchase_order_id != null) {
      const po = rowOne(db, 'SELECT supplier_id, project_id FROM purchase_orders WHERE id = ?', [req.purchase_order_id]);
      if (po) {
        if (supplierId == null) supplierId = po.supplier_id as number;
        if (projectId == null) projectId = po.project_id as number;
      }
    }

    
    const anyIssue = req.lines.some(l => l.has_issue);
    const allOk = req.lines.every(l => (l.qty_match ?? false) && (l.label_ok ?? false) && !l.has_issue);
    const status: string = anyIssue ? 'partial' : (allOk ? 'accepted' : 'draft');

    // Snapshot the current qty_received of every PO line this receipt touches,
    // BEFORE any write. This is the baseline for the optimistic lock below: the
    // stock/qty increments only apply if nobody else moved the line in the
    // meantime. A line referenced twice in the same receipt accumulates against
    // the running baseline (`expectedQty`), so a split-line receipt still works.
    const expectedQty = new Map<number, number>();
    for (const line of req.lines) {
      if (line.po_line_id != null && !expectedQty.has(line.po_line_id)) {
        const cur = rowOne(db, 'SELECT qty_received FROM purchase_order_lines WHERE id = ?', [line.po_line_id]);
        if (cur) expectedQty.set(line.po_line_id, (cur.qty_received as number) || 0);
      }
    }

    // All four writes (goods_receipts, goods_receipt_lines, purchase_order_lines,
    // materials) run inside one transaction so a mid-sequence failure — or a
    // detected concurrent receipt on the same PO line — rolls back cleanly
    // instead of leaving stock double-counted. (Item #1, audit 2026-06-11.)
    db.run('BEGIN');
    let id: number;
    try {
      const number = generateReceiptNumber(db);
      db.run(
        `INSERT INTO goods_receipts (receipt_number, purchase_order_id, supplier_id, project_id,
          received_date, received_by, status, notes)
         VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?)`,
        [number, req.purchase_order_id ?? null, supplierId, projectId, user.id, status, req.notes ?? null],
      );
      const idStmt = db.prepare('SELECT last_insert_rowid()');
      idStmt.step();
      id = idStmt.get()[0] as number;
      idStmt.free();

      for (const line of req.lines) {
        db.run(
          `INSERT INTO goods_receipt_lines (
            receipt_id, po_line_id, material_id, description,
            qty_expected, qty_received, qty_match, label_ok,
            lot_number, expiry_date,
            has_issue, issue_description, photo_base64
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, line.po_line_id ?? null, line.material_id ?? null, line.description,
           line.qty_expected, line.qty_received,
           line.qty_match ? 1 : 0, line.label_ok ? 1 : 0,
           line.lot_number ?? null, line.expiry_date ?? null,
           line.has_issue ? 1 : 0, line.issue_description ?? null, line.photo_base64 ?? null],
        );

        // Optimistic lock: compare-and-swap on qty_received. The UPDATE only
        // matches if qty_received still equals the value we snapshotted; if a
        // concurrent receipt already moved it, 0 rows change → reject the whole
        // transaction so the same PO line can't be received twice.
        if (line.po_line_id && status !== 'rejected') {
          const baseline = expectedQty.get(line.po_line_id) ?? 0;
          db.run(
            'UPDATE purchase_order_lines SET qty_received = ? WHERE id = ? AND qty_received = ?',
            [baseline + line.qty_received, line.po_line_id, baseline],
          );
          if (db.getRowsModified() === 0) {
            throw CommandError.conflict(
              'Recepție concurentă pe aceeași linie de comandă — linia a fost modificată între timp. Reîncărcați și reîncercați.',
            );
          }
          // Advance the running baseline so a second line on the same PO line
          // (split receipt) compares against the already-incremented value.
          expectedQty.set(line.po_line_id, baseline + line.qty_received);
        }

        if (line.material_id && line.qty_received > 0 && status !== 'rejected') {
          db.run('UPDATE materials SET stock = COALESCE(stock, 0) + ? WHERE id = ?',
            [line.qty_received, line.material_id]);
        }
      }

      db.run('COMMIT');
    } catch (err) {
      try { db.run('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }

    // Audit trail — one entry per receipt (item #1: every reception logged).
    try {
      logAuditEvent(db, user.id, 'GOODS_RECEIPT_CREATE', 'goods_receipt', id,
        `NIR pentru PO #${req.purchase_order_id ?? '—'} · ${req.lines.length} linii · status ${status}`);
    } catch { /* audit must never break the receipt */ }

    return this.get(db, user, id);
  }

  static delete(db: Database, user: UserWithRole, id: number): void {
    db.run('DELETE FROM goods_receipts WHERE id = ?', [id]);
    logAuditEvent(db, user.id, 'DELETE', 'goods_receipt', id, null);
  }
}
