











import type { Database } from 'sql.js';
import * as crypto from 'crypto';
import { CommandError } from '../middleware/errors';
import { roundMoney, sumMoney } from '../utils/money';
import type { UserWithRole } from './authService';
import { EmailService } from './emailService';
import { ContractService } from './contractService';
import { generateQuotationPdf } from './quotationPdf';
import { logAuditEvent } from '../db/auditLogs';





export interface QuotationLine {
  id?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  total: number;
  order_index: number;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  lead_id: number | null;
  project_id: number | null;
  client_id: number | null;
  client_name: string;
  contact_email: string | null;
  title: string;
  description: string | null;
  currency: string;
  tva_rate: number;
  discount_percent: number;
  subtotal: number;
  tva_amount: number;
  total: number;
  status: string;
  valid_until: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  tracking_token: string;
  converted_contract_id: number | null;
  notes: string | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  lines: QuotationLine[];
  events: QuotationEvent[];
}

export interface QuotationEvent {
  id: number;
  quotation_id: number;
  event_type: string;
  actor_user_id: number | null;
  actor_name: string | null;
  metadata: string | null;
  created_at: string;
}

export interface CreateQuotationLineInput {
  description: string;
  quantity?: number;
  unit?: string;
  unit_price: number;
  discount_percent?: number;
}

export interface CreateQuotationRequest {
  lead_id?: number | null;
  project_id?: number | null;
  client_id?: number | null;
  client_name: string;
  contact_email?: string | null;
  title: string;
  description?: string | null;
  currency?: string;
  tva_rate?: number;
  discount_percent?: number;
  valid_until?: string | null;
  notes?: string | null;
  lines: CreateQuotationLineInput[];
}

export interface UpdateQuotationRequest {
  id: number;
  title?: string | null;
  description?: string | null;
  client_name?: string | null;
  contact_email?: string | null;
  currency?: string | null;
  tva_rate?: number | null;
  discount_percent?: number | null;
  valid_until?: string | null;
  notes?: string | null;
  lines?: CreateQuotationLineInput[];
}

export interface SendQuotationRequest {
  quotation_id: number;
  to_email?: string;
  cc_emails?: string[];
  subject?: string;
  body_html?: string;
}

export interface DecideQuotationRequest {
  quotation_id: number;
  decision: 'accepted' | 'rejected';
  reason?: string | null;
}





function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateNumber(db: Database): string {
  const year = new Date().getFullYear();
  const stmt = db.prepare(
    "SELECT COUNT(*) FROM quotations WHERE quotation_number LIKE ?",
  );
  stmt.bind([`OFR-${year}-%`]);
  let n = 0;
  if (stmt.step()) n = stmt.get()[0] as number;
  stmt.free();
  return `OFR-${year}-${String(n + 1).padStart(4, '0')}`;
}

function calcLineTotal(line: CreateQuotationLineInput): number {
  const q = Number(line.quantity ?? 1);
  const p = Number(line.unit_price);
  const disc = Number(line.discount_percent ?? 0) / 100;
  // Round each line to 2 decimals so summed totals don't accumulate float drift.
  return roundMoney(q * p * (1 - disc));
}

function calcTotals(lines: CreateQuotationLineInput[], discountPercent: number, tvaRate: number) {
  const lineTotals = lines.map(calcLineTotal);
  const lineSum = sumMoney(lineTotals);
  const subtotal = roundMoney(lineSum * (1 - (discountPercent || 0) / 100));
  const tva_amount = roundMoney(subtotal * (tvaRate || 0));
  const total = roundMoney(subtotal + tva_amount);
  return { subtotal, tva_amount, total, lineTotals };
}

function loadLines(db: Database, quotationId: number): QuotationLine[] {
  const stmt = db.prepare(
    `SELECT id, description, quantity, unit, unit_price, discount_percent, total, order_index
     FROM quotation_lines WHERE quotation_id = ? ORDER BY order_index, id`,
  );
  stmt.bind([quotationId]);
  const out: QuotationLine[] = [];
  while (stmt.step()) {
    const r = stmt.getAsObject();
    out.push({
      id: r.id as number,
      description: r.description as string,
      quantity: r.quantity as number,
      unit: r.unit as string,
      unit_price: r.unit_price as number,
      discount_percent: (r.discount_percent as number) || 0,
      total: r.total as number,
      order_index: (r.order_index as number) || 0,
    });
  }
  stmt.free();
  return out;
}

function loadEvents(db: Database, quotationId: number): QuotationEvent[] {
  const stmt = db.prepare(
    `SELECT e.id, e.quotation_id, e.event_type, e.actor_user_id, u.full_name AS actor_name,
            e.metadata, e.created_at
     FROM quotation_events e LEFT JOIN users u ON u.id = e.actor_user_id
     WHERE e.quotation_id = ? ORDER BY e.created_at DESC, e.id DESC`,
  );
  stmt.bind([quotationId]);
  const out: QuotationEvent[] = [];
  while (stmt.step()) {
    const r = stmt.getAsObject();
    out.push({
      id: r.id as number,
      quotation_id: r.quotation_id as number,
      event_type: r.event_type as string,
      actor_user_id: (r.actor_user_id as number | null) ?? null,
      actor_name: (r.actor_name as string | null) ?? null,
      metadata: (r.metadata as string | null) ?? null,
      created_at: r.created_at as string,
    });
  }
  stmt.free();
  return out;
}

// Scalar mapping only — no per-row child queries. Children (lines/events)
// start empty and are attached by the caller (single-row via rowToQuotation,
// or in bulk via the batch loaders below — avoids the N+1 in `list`).
function mapQuotationRow(row: any): Quotation {
  return {
    id: row.id as number,
    quotation_number: row.quotation_number as string,
    lead_id: (row.lead_id as number | null) ?? null,
    project_id: (row.project_id as number | null) ?? null,
    client_id: (row.client_id as number | null) ?? null,
    client_name: row.client_name as string,
    contact_email: (row.contact_email as string | null) ?? null,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    currency: row.currency as string,
    tva_rate: row.tva_rate as number,
    discount_percent: (row.discount_percent as number) || 0,
    subtotal: row.subtotal as number,
    tva_amount: row.tva_amount as number,
    total: row.total as number,
    status: row.status as string,
    valid_until: (row.valid_until as string | null) ?? null,
    sent_at: (row.sent_at as string | null) ?? null,
    viewed_at: (row.viewed_at as string | null) ?? null,
    decided_at: (row.decided_at as string | null) ?? null,
    rejection_reason: (row.rejection_reason as string | null) ?? null,
    tracking_token: row.tracking_token as string,
    converted_contract_id: (row.converted_contract_id as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_by: row.created_by as number,
    created_by_name: (row.created_by_name as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    lines: [],
    events: [],
  };
}

function rowToQuotation(row: any, db: Database): Quotation {
  const q = mapQuotationRow(row);
  q.lines = loadLines(db, q.id);
  q.events = loadEvents(db, q.id);
  return q;
}

/** Bulk-load lines for many quotations in ONE query, grouped by quotation_id. */
function batchLoadLines(db: Database, ids: number[]): Map<number, QuotationLine[]> {
  const out = new Map<number, QuotationLine[]>();
  if (ids.length === 0) return out;
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(
    `SELECT quotation_id, id, description, quantity, unit, unit_price, discount_percent, total, order_index
     FROM quotation_lines WHERE quotation_id IN (${placeholders}) ORDER BY quotation_id, order_index, id`,
  );
  stmt.bind(ids);
  while (stmt.step()) {
    const r = stmt.getAsObject();
    const qid = r.quotation_id as number;
    const arr = out.get(qid) ?? [];
    arr.push({
      id: r.id as number,
      description: r.description as string,
      quantity: r.quantity as number,
      unit: r.unit as string,
      unit_price: r.unit_price as number,
      discount_percent: (r.discount_percent as number) || 0,
      total: r.total as number,
      order_index: (r.order_index as number) || 0,
    });
    out.set(qid, arr);
  }
  stmt.free();
  return out;
}

/** Bulk-load events for many quotations in ONE query, grouped by quotation_id. */
function batchLoadEvents(db: Database, ids: number[]): Map<number, QuotationEvent[]> {
  const out = new Map<number, QuotationEvent[]>();
  if (ids.length === 0) return out;
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(
    `SELECT e.id, e.quotation_id, e.event_type, e.actor_user_id, u.full_name AS actor_name,
            e.metadata, e.created_at
     FROM quotation_events e LEFT JOIN users u ON u.id = e.actor_user_id
     WHERE e.quotation_id IN (${placeholders}) ORDER BY e.quotation_id, e.created_at DESC, e.id DESC`,
  );
  stmt.bind(ids);
  while (stmt.step()) {
    const r = stmt.getAsObject();
    const qid = r.quotation_id as number;
    const arr = out.get(qid) ?? [];
    arr.push({
      id: r.id as number,
      quotation_id: qid,
      event_type: r.event_type as string,
      actor_user_id: (r.actor_user_id as number | null) ?? null,
      actor_name: (r.actor_name as string | null) ?? null,
      metadata: (r.metadata as string | null) ?? null,
      created_at: r.created_at as string,
    });
    out.set(qid, arr);
  }
  stmt.free();
  return out;
}

function logEvent(db: Database, quotationId: number, eventType: string, actorId: number | null, metadata: string | null = null): void {
  db.run(
    'INSERT INTO quotation_events (quotation_id, event_type, actor_user_id, metadata) VALUES (?, ?, ?, ?)',
    [quotationId, eventType, actorId, metadata],
  );
}

const SELECT_SQL = `
  SELECT q.id, q.quotation_number, q.lead_id, q.project_id, q.client_id, q.client_name,
         q.contact_email, q.title, q.description, q.currency, q.tva_rate, q.discount_percent,
         q.subtotal, q.tva_amount, q.total, q.status, q.valid_until,
         q.sent_at, q.viewed_at, q.decided_at, q.rejection_reason,
         q.tracking_token, q.converted_contract_id, q.notes,
         q.created_by, u.full_name AS created_by_name,
         q.created_at, q.updated_at
  FROM quotations q LEFT JOIN users u ON u.id = q.created_by
`;





export class QuotationService {
  static list(db: Database, _user: UserWithRole, leadId?: number | null): Quotation[] {
    const sql = leadId != null
      ? `${SELECT_SQL} WHERE q.lead_id = ? ORDER BY q.created_at DESC`
      : `${SELECT_SQL} ORDER BY q.created_at DESC`;
    const stmt = db.prepare(sql);
    if (leadId != null) stmt.bind([leadId]);
    const out: Quotation[] = [];
    while (stmt.step()) out.push(mapQuotationRow(stmt.getAsObject()));
    stmt.free();
    // Was N+1 (loadLines + loadEvents per row via rowToQuotation). Now two
    // batch queries total, grouped in JS — wall-clock independent of list size.
    const ids = out.map(q => q.id);
    const linesByQ = batchLoadLines(db, ids);
    const eventsByQ = batchLoadEvents(db, ids);
    for (const q of out) {
      q.lines = linesByQ.get(q.id) ?? [];
      q.events = eventsByQ.get(q.id) ?? [];
    }
    return out;
  }

  static get(db: Database, _user: UserWithRole, id: number): Quotation {
    const stmt = db.prepare(`${SELECT_SQL} WHERE q.id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Ofertă negăsită'); }
    const q = rowToQuotation(stmt.getAsObject(), db);
    stmt.free();
    return q;
  }

  static getByToken(db: Database, token: string): Quotation | null {
    const stmt = db.prepare(`${SELECT_SQL} WHERE q.tracking_token = ?`);
    stmt.bind([token]);
    if (!stmt.step()) { stmt.free(); return null; }
    const q = rowToQuotation(stmt.getAsObject(), db);
    stmt.free();
    return q;
  }

  static create(db: Database, user: UserWithRole, req: CreateQuotationRequest): Quotation {
    if (!req.client_name?.trim()) throw CommandError.badRequest('Numele clientului este obligatoriu');
    if (!req.title?.trim()) throw CommandError.badRequest('Titlul ofertei este obligatoriu');
    if (!Array.isArray(req.lines) || req.lines.length === 0) {
      throw CommandError.badRequest('Cel puțin o linie de ofertă este necesară');
    }

    const tvaRate = req.tva_rate ?? 0.21;
    const discount = req.discount_percent ?? 0;
    const totals = calcTotals(req.lines, discount, tvaRate);

    const number = generateNumber(db);
    const token = generateToken();

    // Quotation header + its lines must be atomic — a line insert failing
    // mid-loop previously left an orphan quotation with partial/zero lines
    // (but non-zero stored totals). Same fix as goods receipt (audit 2026-06-11).
    db.run('BEGIN');
    let id: number;
    try {
      db.run(
        `INSERT INTO quotations (
          quotation_number, lead_id, project_id, client_id, client_name, contact_email,
          title, description, currency, tva_rate, discount_percent,
          subtotal, tva_amount, total, status, valid_until, tracking_token, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
        [
          number, req.lead_id ?? null, req.project_id ?? null, req.client_id ?? null,
          req.client_name.trim(), req.contact_email ?? null,
          req.title.trim(), req.description ?? null,
          req.currency || 'RON', tvaRate, discount,
          totals.subtotal, totals.tva_amount, totals.total,
          req.valid_until ?? null, token, req.notes ?? null, user.id,
        ],
      );

      const idStmt = db.prepare('SELECT last_insert_rowid()');
      idStmt.step();
      id = idStmt.get()[0] as number;
      idStmt.free();

      req.lines.forEach((line, idx) => {
        const lineTotal = calcLineTotal(line);
        db.run(
          `INSERT INTO quotation_lines (quotation_id, description, quantity, unit, unit_price, discount_percent, total, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, line.description.trim(), line.quantity ?? 1, line.unit || 'buc',
            line.unit_price, line.discount_percent ?? 0, lineTotal, idx,
          ],
        );
      });

      db.run('COMMIT');
    } catch (err) {
      try { db.run('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }

    return this.get(db, user, id);
  }

  static update(db: Database, user: UserWithRole, req: UpdateQuotationRequest): Quotation {
    const existing = this.get(db, user, req.id);
    if (existing.status === 'converted') throw CommandError.badRequest('Oferta convertită nu mai poate fi editată');
    if (existing.status === 'accepted') throw CommandError.badRequest('Oferta acceptată nu mai poate fi editată');

    const lines = req.lines ?? existing.lines.map(l => ({
      description: l.description, quantity: l.quantity, unit: l.unit,
      unit_price: l.unit_price, discount_percent: l.discount_percent,
    }));
    const tvaRate = req.tva_rate ?? existing.tva_rate;
    const discount = req.discount_percent ?? existing.discount_percent;
    const totals = calcTotals(lines, discount, tvaRate);

    // Header update + full line replace (DELETE all + re-INSERT) must be
    // atomic: without the transaction, a re-insert failing after the DELETE
    // wiped ALL existing lines while keeping the updated totals (silent data
    // loss on a saved quotation). Same atomicity class as goods receipt.
    db.run('BEGIN');
    try {
      db.run(
        `UPDATE quotations SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          client_name = COALESCE(?, client_name),
          contact_email = COALESCE(?, contact_email),
          currency = COALESCE(?, currency),
          tva_rate = ?, discount_percent = ?,
          valid_until = COALESCE(?, valid_until),
          notes = COALESCE(?, notes),
          subtotal = ?, tva_amount = ?, total = ?,
          updated_at = datetime('now')
         WHERE id = ?`,
        [
          req.title ?? null, req.description ?? null,
          req.client_name ?? null, req.contact_email ?? null,
          req.currency ?? null, tvaRate, discount,
          req.valid_until ?? null, req.notes ?? null,
          totals.subtotal, totals.tva_amount, totals.total,
          req.id,
        ],
      );

      if (req.lines) {
        db.run('DELETE FROM quotation_lines WHERE quotation_id = ?', [req.id]);
        req.lines.forEach((line, idx) => {
          const lineTotal = calcLineTotal(line);
          db.run(
            `INSERT INTO quotation_lines (quotation_id, description, quantity, unit, unit_price, discount_percent, total, order_index)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              req.id, line.description.trim(), line.quantity ?? 1, line.unit || 'buc',
              line.unit_price, line.discount_percent ?? 0, lineTotal, idx,
            ],
          );
        });
      }

      db.run('COMMIT');
    } catch (err) {
      try { db.run('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }

    return this.get(db, user, req.id);
  }

  static delete(db: Database, user: UserWithRole, id: number): void {
    db.run('DELETE FROM quotations WHERE id = ?', [id]);
    logAuditEvent(db, user.id, 'DELETE', 'quotation', id, null);
  }

  



  static async send(db: Database, user: UserWithRole, req: SendQuotationRequest): Promise<Quotation> {
    const q = this.get(db, user, req.quotation_id);
    if (q.status === 'converted') throw CommandError.badRequest('Oferta a fost deja convertită');
    if (q.status === 'rejected') throw CommandError.badRequest('Oferta a fost refuzată');

    const recipient = (req.to_email || q.contact_email || '').trim();
    if (!recipient) throw CommandError.badRequest('Adresa de email a destinatarului este obligatorie');

    
    const pdf = await generateQuotationPdf(db, q);

    const subject = req.subject?.trim()
      || `Ofertă ${q.quotation_number} — ${q.title}`;

    const bodyHtml = req.body_html?.trim() || buildDefaultEmailBody(q);

    const attachments = [{
      filename: pdf.filename,
      content_type: 'application/pdf',
      data: pdf.base64,
    }];

    const cc = (req.cc_emails || []).filter(Boolean).map(email => ({ email }));

    await EmailService.sendMessage(db, user, {
      to: [{ email: recipient, name: q.client_name }],
      cc,
      subject,
      body_html: bodyHtml,
      attachments,
    });

    db.run(
      `UPDATE quotations SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND status IN ('draft','sent','viewed')`,
      [q.id],
    );
    logEvent(db, q.id, 'sent', user.id, JSON.stringify({ to: recipient, cc: cc.map(c => c.email) }));

    return this.get(db, user, q.id);
  }

  



  static markViewed(db: Database, quotationId: number): void {
    const q = (() => {
      const s = db.prepare('SELECT status, viewed_at FROM quotations WHERE id = ?');
      s.bind([quotationId]);
      const r = s.step() ? s.getAsObject() : null;
      s.free();
      return r;
    })();
    if (!q) return;
    if (q.status === 'sent') {
      db.run(
        `UPDATE quotations SET status = 'viewed', viewed_at = COALESCE(viewed_at, datetime('now')),
                              updated_at = datetime('now') WHERE id = ?`,
        [quotationId],
      );
      logEvent(db, quotationId, 'viewed', null, null);
    }
  }

  static decide(db: Database, user: UserWithRole, req: DecideQuotationRequest): Quotation {
    const q = this.get(db, user, req.quotation_id);
    if (q.status === 'converted') throw CommandError.badRequest('Oferta a fost deja convertită');
    if (req.decision !== 'accepted' && req.decision !== 'rejected') {
      throw CommandError.badRequest('Decizia trebuie să fie accepted sau rejected');
    }

    db.run(
      `UPDATE quotations SET status = ?, decided_at = datetime('now'),
                            rejection_reason = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [req.decision, req.decision === 'rejected' ? (req.reason ?? null) : null, q.id],
    );
    logEvent(db, q.id, req.decision, user.id, req.reason ? JSON.stringify({ reason: req.reason }) : null);

    return this.get(db, user, q.id);
  }

  



  static convertToContract(db: Database, user: UserWithRole, quotationId: number, projectId: number): Quotation {
    const q = this.get(db, user, quotationId);
    if (q.status !== 'accepted') throw CommandError.badRequest('Doar ofertele acceptate pot fi convertite');
    if (q.converted_contract_id) throw CommandError.badRequest('Oferta a fost deja convertită');
    if (!q.client_id) throw CommandError.badRequest('Oferta nu are un client asociat');

    const contract = ContractService.createContract(db, user, {
      project_id: projectId,
      title: q.title,
      client_id: q.client_id,
      sale_price: q.total,
    });

    db.run(
      `UPDATE quotations SET status = 'converted', converted_contract_id = ?,
                            project_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [contract.id, projectId, q.id],
    );
    logEvent(db, q.id, 'converted', user.id, JSON.stringify({ contract_id: contract.id }));

    return this.get(db, user, q.id);
  }

  static getStats(db: Database): {
    draft: number; sent: number; viewed: number; accepted: number; rejected: number;
    converted: number; expired: number; pipeline_value: number;
  } {
    const cnt = (status: string) => {
      const s = db.prepare('SELECT COUNT(*) FROM quotations WHERE status = ?');
      s.bind([status]);
      let n = 0;
      if (s.step()) n = s.get()[0] as number;
      s.free();
      return n;
    };
    const pipelineStmt = db.prepare(
      "SELECT COALESCE(SUM(total), 0) FROM quotations WHERE status IN ('sent','viewed','accepted')",
    );
    pipelineStmt.step();
    const pipeline_value = pipelineStmt.get()[0] as number;
    pipelineStmt.free();

    return {
      draft: cnt('draft'),
      sent: cnt('sent'),
      viewed: cnt('viewed'),
      accepted: cnt('accepted'),
      rejected: cnt('rejected'),
      converted: cnt('converted'),
      expired: cnt('expired'),
      pipeline_value,
    };
  }

  



  static expireStale(db: Database): number {
    const stmt = db.prepare(
      `UPDATE quotations
       SET status = 'expired', updated_at = datetime('now')
       WHERE status IN ('sent','viewed') AND valid_until IS NOT NULL AND valid_until < date('now')`,
    );
    stmt.step();
    stmt.free();
    const changes = db.getRowsModified ? db.getRowsModified() : 0;
    return changes;
  }

  
  
  
  

  static listAttachments(db: Database, quotationId: number): Array<{
    id: number; quotation_id: number; filename: string | null; mime: string | null;
    size: number; created_by_name: string | null; created_at: string;
  }> {
    const stmt = db.prepare(
      `SELECT qa.id, qa.quotation_id, qa.filename, qa.mime, LENGTH(qa.data) AS size,
              u.full_name AS created_by_name, qa.created_at
       FROM quotation_attachments qa
       LEFT JOIN users u ON u.id = qa.created_by_user_id
       WHERE qa.quotation_id = ?
       ORDER BY qa.created_at DESC, qa.id DESC`,
    );
    stmt.bind([quotationId]);
    const out: Array<{
      id: number; quotation_id: number; filename: string | null; mime: string | null;
      size: number; created_by_name: string | null; created_at: string;
    }> = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      out.push({
        id: r.id as number,
        quotation_id: r.quotation_id as number,
        filename: (r.filename as string | null) ?? null,
        mime: (r.mime as string | null) ?? null,
        size: (r.size as number) ?? 0,
        created_by_name: (r.created_by_name as string | null) ?? null,
        created_at: r.created_at as string,
      });
    }
    stmt.free();
    return out;
  }

  static addAttachment(db: Database, user: UserWithRole, req: {
    quotation_id: number; filename?: string | null; mime?: string | null; data: string;
  }): { id: number } {
    if (!req.quotation_id) throw CommandError.badRequest('quotation_id obligatoriu');
    if (!req.data || typeof req.data !== 'string') throw CommandError.badRequest('Fișier lipsă');
    const MAX_CHARS = 50 * 1024 * 1024; 
    if (req.data.length > MAX_CHARS) throw CommandError.badRequest('Fișier prea mare');
    db.run(
      `INSERT INTO quotation_attachments (quotation_id, filename, mime, data, created_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [req.quotation_id, req.filename ?? null, req.mime ?? null, req.data, user.id],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();
    return { id };
  }

  static getAttachment(db: Database, attachmentId: number): {
    id: number; filename: string | null; mime: string | null; base64: string;
  } {
    const stmt = db.prepare('SELECT id, filename, mime, data FROM quotation_attachments WHERE id = ?');
    stmt.bind([attachmentId]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Fișier negăsit'); }
    const r = stmt.getAsObject();
    stmt.free();
    return {
      id: r.id as number,
      filename: (r.filename as string | null) ?? null,
      mime: (r.mime as string | null) ?? null,
      base64: r.data as string,
    };
  }

  static deleteAttachment(db: Database, attachmentId: number): void {
    db.run('DELETE FROM quotation_attachments WHERE id = ?', [attachmentId]);
  }
}

function buildDefaultEmailBody(q: Quotation): string {
  const validity = q.valid_until ? ` Oferta este valabilă până la ${q.valid_until}.` : '';
  return `
    <div style="font-family: Arial, sans-serif; font-size: 13px; color: #222; max-width: 600px;">
      <p>Bună ziua${q.client_name ? `, ${q.client_name}` : ''},</p>
      <p>Vă transmitem atașat oferta noastră comercială <strong>${q.quotation_number}</strong> — <em>${q.title}</em>.${validity}</p>
      <p>Suntem la dispoziția dumneavoastră pentru orice întrebare sau clarificare.</p>
      <p>Cu stimă,<br/>Echipa</p>
    </div>
  `.trim();
}
