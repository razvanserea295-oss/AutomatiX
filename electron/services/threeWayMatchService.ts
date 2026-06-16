




import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { roundMoney } from '../utils/money';
import type { UserWithRole } from './authService';
import { logAuditEvent } from '../db/auditLogs';

export type MatchStatus = 'ok' | 'qty_mismatch' | 'price_mismatch' | 'over_invoice' | 'under_invoice';

export interface SupplierInvoice {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name: string | null;
  project_id: number | null;
  project_name: string | null;
  purchase_order_id: number | null;
  po_internal_ref: string | null;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  tva_rate: number;
  tva_amount: number;
  total: number;
  paid_amount: number;
  status: string;
  match_status: MatchStatus | null;
  discrepancy_notes: string | null;
  notes: string | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  lines: SupplierInvoiceLine[];
}

export interface SupplierInvoiceLine {
  id: number;
  supplier_invoice_id: number;
  po_line_id: number | null;
  material_id: number | null;
  material_name: string | null;
  description: string;
  qty_invoiced: number;
  unit_price: number;
  total: number;
  line_no: number;
}

export interface MatchView {
  invoice: SupplierInvoice;
  po: {
    id: number; internal_ref: string | null; supplier_name: string;
    project_name: string; status: string; ordered_at: string;
    lines: Array<{
      id: number; line_no: number; material_id: number; material_name: string;
      qty_ordered: number; qty_received: number; unit_price: number; currency: string;
      ordered_total: number; received_total: number;
    }>;
    totals: { ordered: number; received: number };
  } | null;
  matching: Array<{
    po_line_id: number | null;
    material_name: string;
    qty_ordered: number;
    qty_received: number;
    qty_invoiced: number;
    unit_price_po: number;
    unit_price_invoice: number;
    qty_diff: number;
    qty_diff_pct: number;
    price_diff: number;
    price_diff_pct: number;
    flags: string[];
  }>;
  thresholds: { qty_tolerance_pct: number; price_tolerance_pct: number };
  overall_status: MatchStatus;
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

const INV_SQL = `
  SELECT si.id, si.invoice_number, si.supplier_id, s.name AS supplier_name,
         si.project_id, p.name AS project_name,
         si.purchase_order_id, po.internal_ref AS po_internal_ref,
         si.issue_date, si.due_date, si.currency,
         si.subtotal, si.tva_rate, si.tva_amount, si.total, si.paid_amount,
         si.status, si.match_status, si.discrepancy_notes, si.notes,
         si.created_by, u.full_name AS created_by_name, si.created_at
  FROM supplier_invoices si
  LEFT JOIN suppliers s ON s.id = si.supplier_id
  LEFT JOIN projects p ON p.id = si.project_id
  LEFT JOIN purchase_orders po ON po.id = si.purchase_order_id
  LEFT JOIN users u ON u.id = si.created_by
`;

function loadInvoiceLines(db: Database, invoiceId: number): SupplierInvoiceLine[] {
  return rowsAll(db, `
    SELECT l.id, l.supplier_invoice_id, l.po_line_id, l.material_id, m.name AS material_name,
           l.description, l.qty_invoiced, l.unit_price, l.total, l.line_no
    FROM supplier_invoice_lines l
    LEFT JOIN materials m ON m.id = l.material_id
    WHERE l.supplier_invoice_id = ? ORDER BY l.line_no, l.id
  `, [invoiceId]).map(r => ({
    id: r.id as number,
    supplier_invoice_id: r.supplier_invoice_id as number,
    po_line_id: (r.po_line_id as number | null) ?? null,
    material_id: (r.material_id as number | null) ?? null,
    material_name: (r.material_name as string | null) ?? null,
    description: r.description as string,
    qty_invoiced: (r.qty_invoiced as number) || 0,
    unit_price: (r.unit_price as number) || 0,
    total: (r.total as number) || 0,
    line_no: (r.line_no as number) || 1,
  }));
}

function rowToInvoice(r: any, db: Database): SupplierInvoice {
  return {
    id: r.id as number,
    invoice_number: r.invoice_number as string,
    supplier_id: r.supplier_id as number,
    supplier_name: (r.supplier_name as string | null) ?? null,
    project_id: (r.project_id as number | null) ?? null,
    project_name: (r.project_name as string | null) ?? null,
    purchase_order_id: (r.purchase_order_id as number | null) ?? null,
    po_internal_ref: (r.po_internal_ref as string | null) ?? null,
    issue_date: r.issue_date as string,
    due_date: (r.due_date as string | null) ?? null,
    currency: r.currency as string,
    subtotal: (r.subtotal as number) || 0,
    tva_rate: (r.tva_rate as number) || 0,
    tva_amount: (r.tva_amount as number) || 0,
    total: (r.total as number) || 0,
    paid_amount: (r.paid_amount as number) || 0,
    status: r.status as string,
    match_status: (r.match_status as MatchStatus | null) ?? null,
    discrepancy_notes: (r.discrepancy_notes as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    created_by: r.created_by as number,
    created_by_name: (r.created_by_name as string | null) ?? null,
    created_at: r.created_at as string,
    lines: loadInvoiceLines(db, r.id as number),
  };
}

function getThresholds(db: Database): { qty_tolerance_pct: number; price_tolerance_pct: number; auto_approve_under_amount: number } {
  const r = rowOne(db, 'SELECT qty_tolerance_pct, price_tolerance_pct, auto_approve_under_amount FROM matching_thresholds WHERE id = 1');
  if (!r) return { qty_tolerance_pct: 2, price_tolerance_pct: 5, auto_approve_under_amount: 0 };
  return {
    qty_tolerance_pct: (r.qty_tolerance_pct as number) || 2,
    price_tolerance_pct: (r.price_tolerance_pct as number) || 5,
    auto_approve_under_amount: (r.auto_approve_under_amount as number) || 0,
  };
}

function recalcInvoiceTotals(db: Database, invoiceId: number): void {
  const sub = rowOne(db, 'SELECT COALESCE(SUM(total), 0) AS s FROM supplier_invoice_lines WHERE supplier_invoice_id = ?', [invoiceId]);
  const inv = rowOne(db, 'SELECT tva_rate FROM supplier_invoices WHERE id = ?', [invoiceId]);
  const subtotal = roundMoney((sub?.s as number) || 0);
  const tvaRate = (inv?.tva_rate as number) || 0;
  const tvaAmount = roundMoney(subtotal * tvaRate);
  const total = roundMoney(subtotal + tvaAmount);
  db.run("UPDATE supplier_invoices SET subtotal = ?, tva_amount = ?, total = ?, updated_at = datetime('now') WHERE id = ?",
    [subtotal, tvaAmount, total, invoiceId]);
}

export class ThreeWayMatchService {
  static listSupplierInvoices(db: Database, _user: UserWithRole, opts: {
    status?: string; supplier_id?: number; project_id?: number; po_id?: number;
  } = {}): SupplierInvoice[] {
    const conds: string[] = [];
    const params: any[] = [];
    if (opts.status) { conds.push('si.status = ?'); params.push(opts.status); }
    if (opts.supplier_id) { conds.push('si.supplier_id = ?'); params.push(opts.supplier_id); }
    if (opts.project_id) { conds.push('si.project_id = ?'); params.push(opts.project_id); }
    if (opts.po_id) { conds.push('si.purchase_order_id = ?'); params.push(opts.po_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return rowsAll(db, `${INV_SQL} ${where} ORDER BY si.created_at DESC LIMIT 500`, params).map(r => rowToInvoice(r, db));
  }

  static getSupplierInvoice(db: Database, _user: UserWithRole, id: number): SupplierInvoice {
    if (id == null) throw CommandError.badRequest('invoice_id obligatoriu');
    const r = rowOne(db, `${INV_SQL} WHERE si.id = ?`, [id]);
    if (!r) throw CommandError.notFound('Factură furnizor negăsită');
    return rowToInvoice(r, db);
  }

  static createSupplierInvoice(db: Database, user: UserWithRole, req: {
    invoice_number: string; supplier_id: number; project_id?: number | null;
    purchase_order_id?: number | null; issue_date: string; due_date?: string | null;
    currency?: string; tva_rate?: number; notes?: string | null;
    lines: Array<{
      po_line_id?: number | null; material_id?: number | null; description: string;
      qty_invoiced: number; unit_price: number; line_no?: number;
    }>;
  }): SupplierInvoice {
    if (!req.invoice_number?.trim()) throw CommandError.badRequest('Număr factură obligatoriu');
    if (!req.supplier_id) throw CommandError.badRequest('Furnizor obligatoriu');

    db.run(
      `INSERT INTO supplier_invoices (
        invoice_number, supplier_id, project_id, purchase_order_id,
        issue_date, due_date, currency, tva_rate, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.invoice_number.trim(), req.supplier_id, req.project_id ?? null,
        req.purchase_order_id ?? null, req.issue_date, req.due_date ?? null,
        req.currency || 'RON', req.tva_rate ?? 0.21, req.notes ?? null, user.id,
      ],
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    req.lines.forEach((line, idx) => {
      const total = (line.qty_invoiced || 0) * (line.unit_price || 0);
      db.run(
        `INSERT INTO supplier_invoice_lines (supplier_invoice_id, po_line_id, material_id, description, qty_invoiced, unit_price, total, line_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, line.po_line_id ?? null, line.material_id ?? null, line.description,
         line.qty_invoiced, line.unit_price, total, line.line_no ?? idx + 1],
      );
    });

    recalcInvoiceTotals(db, id);
    this.computeMatch(db, user, id);
    return this.getSupplierInvoice(db, user, id);
  }

  static deleteSupplierInvoice(db: Database, user: UserWithRole, id: number): void {
    db.run('DELETE FROM supplier_invoices WHERE id = ?', [id]);
    logAuditEvent(db, user.id, 'DELETE', 'supplier_invoice', id, null);
  }

  static approveSupplierInvoice(db: Database, user: UserWithRole, id: number): SupplierInvoice {
    db.run("UPDATE supplier_invoices SET status = 'approved', updated_at = datetime('now') WHERE id = ?", [id]);
    // Financial approval — auditable action (who approved which invoice for payment).
    logAuditEvent(db, user.id, 'APPROVE', 'supplier_invoice', id, null);
    return this.getSupplierInvoice(db, user, id);
  }

  static rejectSupplierInvoice(db: Database, user: UserWithRole, id: number, reason?: string): SupplierInvoice {
    db.run("UPDATE supplier_invoices SET status = 'rejected', discrepancy_notes = ?, updated_at = datetime('now') WHERE id = ?",
      [reason ?? null, id]);
    logAuditEvent(db, user.id, 'REJECT', 'supplier_invoice', id, reason ? JSON.stringify({ reason }) : null);
    return this.getSupplierInvoice(db, user, id);
  }

  static recordPayment(db: Database, user: UserWithRole, id: number, amount: number): SupplierInvoice {
    const pay = roundMoney(Number(amount) || 0);
    if (!(pay > 0)) throw CommandError.badRequest('Suma plății trebuie să fie pozitivă');
    // Compute the new paid/total in rounded money (no DB-side float drift) so a
    // 1-cent rounding artifact can't wrongly flip status to/from 'paid'.
    const cur = rowOne(db, 'SELECT paid_amount, total FROM supplier_invoices WHERE id = ?', [id]);
    if (!cur) throw CommandError.notFound('Factura furnizor inexistentă');
    const newPaid = roundMoney(((cur.paid_amount as number) || 0) + pay);
    const total = roundMoney((cur.total as number) || 0);
    const status = newPaid >= total ? 'paid' : null; // null ⇒ keep current status
    db.run(
      "UPDATE supplier_invoices SET paid_amount = ?, status = COALESCE(?, status), updated_at = datetime('now') WHERE id = ?",
      [newPaid, status, id],
    );
    return this.getSupplierInvoice(db, user, id);
  }

  



  static computeMatch(db: Database, _user: UserWithRole, invoiceId: number): MatchView {
    const invoice = this.getSupplierInvoice(db, _user, invoiceId);
    const thresholds = getThresholds(db);

    let po: MatchView['po'] = null;
    if (invoice.purchase_order_id) {
      const poRow = rowOne(db, `
        SELECT po.id, po.internal_ref, po.status, po.ordered_at,
               s.name AS supplier_name, p.name AS project_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON s.id = po.supplier_id
        LEFT JOIN projects p ON p.id = po.project_id
        WHERE po.id = ?
      `, [invoice.purchase_order_id]);
      if (poRow) {
        const lines = rowsAll(db, `
          SELECT pl.id, pl.line_no, pl.material_id, m.name AS material_name,
                 pl.qty_ordered, pl.qty_received, pl.unit_price, pl.currency
          FROM purchase_order_lines pl
          LEFT JOIN materials m ON m.id = pl.material_id
          WHERE pl.purchase_order_id = ? ORDER BY pl.line_no
        `, [invoice.purchase_order_id]);
        const linesMapped = lines.map(l => {
          const qtyOrd = (l.qty_ordered as number) || 0;
          const qtyRec = (l.qty_received as number) || 0;
          const price = (l.unit_price as number) || 0;
          return {
            id: l.id as number, line_no: l.line_no as number,
            material_id: l.material_id as number, material_name: (l.material_name as string) || '—',
            qty_ordered: qtyOrd, qty_received: qtyRec,
            unit_price: price, currency: (l.currency as string) || 'RON',
            ordered_total: qtyOrd * price, received_total: qtyRec * price,
          };
        });
        po = {
          id: poRow.id as number,
          internal_ref: (poRow.internal_ref as string | null) ?? null,
          supplier_name: (poRow.supplier_name as string) || '—',
          project_name: (poRow.project_name as string) || '—',
          status: poRow.status as string,
          ordered_at: poRow.ordered_at as string,
          lines: linesMapped,
          totals: {
            ordered: linesMapped.reduce((s, l) => s + l.ordered_total, 0),
            received: linesMapped.reduce((s, l) => s + l.received_total, 0),
          },
        };
      }
    }

    
    const matching: MatchView['matching'] = [];
    const poLineMap = new Map<number, any>();
    if (po) for (const l of po.lines) poLineMap.set(l.id, l);

    let overallFlags = new Set<MatchStatus>();

    for (const invLine of invoice.lines) {
      const poLine = invLine.po_line_id ? poLineMap.get(invLine.po_line_id) : null;
      const qtyOrd = poLine?.qty_ordered ?? 0;
      const qtyRec = poLine?.qty_received ?? 0;
      const priceOrd = poLine?.unit_price ?? 0;
      const qtyInv = invLine.qty_invoiced;
      const priceInv = invLine.unit_price;

      const qtyDiff = qtyInv - qtyRec;
      const qtyDiffPct = qtyRec > 0 ? (qtyDiff / qtyRec) * 100 : (qtyInv > 0 ? 100 : 0);
      const priceDiff = priceInv - priceOrd;
      const priceDiffPct = priceOrd > 0 ? (priceDiff / priceOrd) * 100 : (priceInv > 0 ? 100 : 0);

      const flags: string[] = [];
      if (Math.abs(qtyDiffPct) > thresholds.qty_tolerance_pct) {
        flags.push(qtyDiff > 0 ? 'over_invoice' : 'under_invoice');
        overallFlags.add(qtyDiff > 0 ? 'over_invoice' : 'under_invoice');
      }
      if (Math.abs(priceDiffPct) > thresholds.price_tolerance_pct) {
        flags.push('price_mismatch');
        overallFlags.add('price_mismatch');
      }

      matching.push({
        po_line_id: invLine.po_line_id,
        material_name: poLine?.material_name || invLine.material_name || invLine.description,
        qty_ordered: qtyOrd,
        qty_received: qtyRec,
        qty_invoiced: qtyInv,
        unit_price_po: priceOrd,
        unit_price_invoice: priceInv,
        qty_diff: qtyDiff,
        qty_diff_pct: Math.round(qtyDiffPct * 100) / 100,
        price_diff: priceDiff,
        price_diff_pct: Math.round(priceDiffPct * 100) / 100,
        flags,
      });
    }

    let overall: MatchStatus = 'ok';
    if (overallFlags.size > 0) {
      if (overallFlags.has('price_mismatch')) overall = 'price_mismatch';
      else if (overallFlags.has('over_invoice')) overall = 'over_invoice';
      else if (overallFlags.has('under_invoice')) overall = 'under_invoice';
      else overall = 'qty_mismatch';
    }

    db.run(
      `UPDATE supplier_invoices SET match_status = ?, status = CASE
         WHEN ? = 'ok' AND status = 'pending' THEN 'matched'
         WHEN ? != 'ok' AND status IN ('pending','matched') THEN 'discrepancy'
         ELSE status END,
         updated_at = datetime('now') WHERE id = ?`,
      [overall, overall, overall, invoiceId],
    );

    return {
      invoice: this.getSupplierInvoice(db, _user, invoiceId),
      po,
      matching,
      thresholds: { qty_tolerance_pct: thresholds.qty_tolerance_pct, price_tolerance_pct: thresholds.price_tolerance_pct },
      overall_status: overall,
    };
  }

  static getThresholds(db: Database) { return getThresholds(db); }

  static updateThresholds(db: Database, _user: UserWithRole, t: {
    qty_tolerance_pct: number; price_tolerance_pct: number; auto_approve_under_amount: number;
  }) {
    db.run("UPDATE matching_thresholds SET qty_tolerance_pct = ?, price_tolerance_pct = ?, auto_approve_under_amount = ?, updated_at = datetime('now') WHERE id = 1",
      [t.qty_tolerance_pct, t.price_tolerance_pct, t.auto_approve_under_amount]);
    return getThresholds(db);
  }
}
