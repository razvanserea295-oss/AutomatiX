





import type { Database } from 'sql.js';
import * as crypto from 'crypto';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { EmailService } from './emailService';
import { logAuditEvent } from '../db/auditLogs';

export interface RfqItem {
  id: number; rfq_id: number;
  material_id: number | null; material_name: string | null;
  description: string; quantity: number; unit: string; notes: string | null;
  line_no: number;
}

export interface RfqInvitation {
  id: number; rfq_id: number;
  supplier_id: number; supplier_name: string | null; supplier_email: string | null;
  public_token: string;
  status: string; sent_at: string | null; viewed_at: string | null;
  submitted_at: string | null; decline_reason: string | null;
  response_lead_time_days: number | null;
  response_currency: string | null;
  response_validity_days: number | null;
  response_notes: string | null;
  response_total: number | null;
  responses: RfqResponse[];
}

export interface RfqResponse {
  id: number; invitation_id: number; rfq_item_id: number;
  unit_price: number; available_quantity: number | null; notes: string | null;
}

export interface Rfq {
  id: number; rfq_number: string;
  project_id: number | null; project_name: string | null;
  title: string; description: string | null;
  deadline: string | null; status: string;
  awarded_supplier_id: number | null; awarded_supplier_name: string | null;
  notes: string | null;
  created_by: number; created_by_name: string | null;
  created_at: string; updated_at: string;
  items: RfqItem[];
  invitations: RfqInvitation[];
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

function generateRfqNumber(db: Database): string {
  const year = new Date().getFullYear();
  const stmt = db.prepare("SELECT COUNT(*) FROM rfqs WHERE rfq_number LIKE ?");
  stmt.bind([`RFQ-${year}-%`]);
  let n = 0;
  if (stmt.step()) n = stmt.get()[0] as number;
  stmt.free();
  return `RFQ-${year}-${String(n + 1).padStart(4, '0')}`;
}

const RFQ_SQL = `
  SELECT r.id, r.rfq_number, r.project_id, p.name AS project_name,
         r.title, r.description, r.deadline, r.status,
         r.awarded_supplier_id, s.name AS awarded_supplier_name,
         r.notes, r.created_by, u.full_name AS created_by_name,
         r.created_at, r.updated_at
  FROM rfqs r
  LEFT JOIN projects p ON p.id = r.project_id
  LEFT JOIN suppliers s ON s.id = r.awarded_supplier_id
  LEFT JOIN users u ON u.id = r.created_by
`;

function loadItems(db: Database, rfqId: number): RfqItem[] {
  return rowsAll(db, `
    SELECT i.id, i.rfq_id, i.material_id, m.name AS material_name,
           i.description, i.quantity, i.unit, i.notes, i.line_no
    FROM rfq_items i LEFT JOIN materials m ON m.id = i.material_id
    WHERE i.rfq_id = ? ORDER BY i.line_no, i.id
  `, [rfqId]).map(r => ({
    id: r.id as number, rfq_id: r.rfq_id as number,
    material_id: (r.material_id as number | null) ?? null,
    material_name: (r.material_name as string | null) ?? null,
    description: r.description as string,
    quantity: (r.quantity as number) || 0,
    unit: r.unit as string,
    notes: (r.notes as string | null) ?? null,
    line_no: (r.line_no as number) || 0,
  }));
}

function loadInvitations(db: Database, rfqId: number): RfqInvitation[] {
  const invs = rowsAll(db, `
    SELECT i.id, i.rfq_id, i.supplier_id, s.name AS supplier_name, s.email AS supplier_email,
           i.public_token, i.status, i.sent_at, i.viewed_at, i.submitted_at,
           i.decline_reason, i.response_lead_time_days, i.response_currency,
           i.response_validity_days, i.response_notes, i.response_total
    FROM rfq_invitations i LEFT JOIN suppliers s ON s.id = i.supplier_id
    WHERE i.rfq_id = ? ORDER BY i.id
  `, [rfqId]);

  return invs.map(r => {
    const responses = rowsAll(db,
      `SELECT id, invitation_id, rfq_item_id, unit_price, available_quantity, notes
       FROM rfq_responses WHERE invitation_id = ?`, [r.id])
      .map(rr => ({
        id: rr.id as number, invitation_id: rr.invitation_id as number,
        rfq_item_id: rr.rfq_item_id as number,
        unit_price: (rr.unit_price as number) || 0,
        available_quantity: (rr.available_quantity as number | null) ?? null,
        notes: (rr.notes as string | null) ?? null,
      }));
    return {
      id: r.id as number, rfq_id: r.rfq_id as number,
      supplier_id: r.supplier_id as number,
      supplier_name: (r.supplier_name as string | null) ?? null,
      supplier_email: (r.supplier_email as string | null) ?? null,
      public_token: r.public_token as string,
      status: r.status as string,
      sent_at: (r.sent_at as string | null) ?? null,
      viewed_at: (r.viewed_at as string | null) ?? null,
      submitted_at: (r.submitted_at as string | null) ?? null,
      decline_reason: (r.decline_reason as string | null) ?? null,
      response_lead_time_days: (r.response_lead_time_days as number | null) ?? null,
      response_currency: (r.response_currency as string | null) ?? null,
      response_validity_days: (r.response_validity_days as number | null) ?? null,
      response_notes: (r.response_notes as string | null) ?? null,
      response_total: (r.response_total as number | null) ?? null,
      responses,
    };
  });
}

function rowToRfq(r: any, db: Database): Rfq {
  return {
    id: r.id as number,
    rfq_number: r.rfq_number as string,
    project_id: (r.project_id as number | null) ?? null,
    project_name: (r.project_name as string | null) ?? null,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    deadline: (r.deadline as string | null) ?? null,
    status: r.status as string,
    awarded_supplier_id: (r.awarded_supplier_id as number | null) ?? null,
    awarded_supplier_name: (r.awarded_supplier_name as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    created_by: r.created_by as number,
    created_by_name: (r.created_by_name as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    items: loadItems(db, r.id as number),
    invitations: loadInvitations(db, r.id as number),
  };
}

export class RfqService {
  static list(db: Database, _user: UserWithRole, status?: string): Rfq[] {
    const sql = status ? `${RFQ_SQL} WHERE r.status = ? ORDER BY r.created_at DESC` : `${RFQ_SQL} ORDER BY r.created_at DESC`;
    const rows = rowsAll(db, sql, status ? [status] : []);
    return rows.map(r => rowToRfq(r, db));
  }

  static get(db: Database, _user: UserWithRole, id: number): Rfq {
    const r = rowOne(db, `${RFQ_SQL} WHERE r.id = ?`, [id]);
    if (!r) throw CommandError.notFound('RFQ negăsit');
    return rowToRfq(r, db);
  }

  static getByPublicToken(db: Database, token: string): {
    rfq: Pick<Rfq, 'rfq_number' | 'title' | 'description' | 'deadline' | 'items'>;
    invitation: { id: number; status: string; supplier_name: string | null; }
  } {
    const inv = rowOne(db, `
      SELECT i.id, i.rfq_id, i.status, s.name AS supplier_name
      FROM rfq_invitations i LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE i.public_token = ?`, [token]);
    if (!inv) throw CommandError.notFound('Token invalid');
    if (inv.status === 'submitted') throw CommandError.badRequest('Răspuns deja trimis');

    
    if (inv.status === 'sent' || inv.status === 'pending') {
      db.run("UPDATE rfq_invitations SET status = 'viewed', viewed_at = COALESCE(viewed_at, datetime('now')) WHERE id = ?", [inv.id]);
    }

    const rfqRow = rowOne(db, `SELECT id, rfq_number, title, description, deadline FROM rfqs WHERE id = ?`, [inv.rfq_id]);
    if (!rfqRow) throw CommandError.notFound('RFQ negăsit');

    return {
      rfq: {
        rfq_number: rfqRow.rfq_number as string,
        title: rfqRow.title as string,
        description: (rfqRow.description as string | null) ?? null,
        deadline: (rfqRow.deadline as string | null) ?? null,
        items: loadItems(db, rfqRow.id as number),
      },
      invitation: {
        id: inv.id as number,
        status: inv.status as string,
        supplier_name: (inv.supplier_name as string | null) ?? null,
      },
    };
  }

  static submitPublicResponse(db: Database, token: string, payload: {
    lead_time_days?: number; currency?: string; validity_days?: number; notes?: string;
    decline?: boolean; decline_reason?: string;
    items: Array<{ rfq_item_id: number; unit_price: number; available_quantity?: number; notes?: string }>;
  }): { ok: true } {
    const inv = rowOne(db, 'SELECT id, status FROM rfq_invitations WHERE public_token = ?', [token]);
    if (!inv) throw CommandError.notFound('Token invalid');
    if (inv.status === 'submitted') throw CommandError.badRequest('Răspuns deja trimis');

    if (payload.decline) {
      db.run("UPDATE rfq_invitations SET status = 'declined', decline_reason = ? WHERE id = ?", [payload.decline_reason ?? null, inv.id]);
      return { ok: true };
    }

    db.run('DELETE FROM rfq_responses WHERE invitation_id = ?', [inv.id]);
    let total = 0;
    for (const item of payload.items) {
      total += (item.unit_price || 0) * (item.available_quantity ?? 0);
      db.run(
        `INSERT INTO rfq_responses (invitation_id, rfq_item_id, unit_price, available_quantity, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [inv.id, item.rfq_item_id, item.unit_price, item.available_quantity ?? null, item.notes ?? null],
      );
    }

    db.run(
      `UPDATE rfq_invitations SET status = 'submitted', submitted_at = datetime('now'),
        response_lead_time_days = ?, response_currency = ?, response_validity_days = ?,
        response_notes = ?, response_total = ?
       WHERE id = ?`,
      [payload.lead_time_days ?? null, payload.currency ?? 'RON',
       payload.validity_days ?? null, payload.notes ?? null, total, inv.id],
    );
    return { ok: true };
  }

  static create(db: Database, user: UserWithRole, req: {
    title: string; description?: string; project_id?: number | null;
    deadline?: string | null; notes?: string | null;
    items: Array<{ material_id?: number | null; description: string; quantity: number; unit?: string; notes?: string }>;
    supplier_ids: number[];
  }): Rfq {
    if (!req.title?.trim()) throw CommandError.badRequest('Titlu obligatoriu');
    if (!Array.isArray(req.items) || req.items.length === 0) throw CommandError.badRequest('Cel puțin o linie');
    if (!Array.isArray(req.supplier_ids) || req.supplier_ids.length === 0) throw CommandError.badRequest('Cel puțin un furnizor');

    // Parent (rfqs) + line items (rfq_items) + supplier invitations
    // (rfq_invitations) must commit together. Without the transaction a
    // failed line/invitation insert left an orphan RFQ with partial children.
    // Same atomicity fix as goods receipt (audit 2026-06-11).
    db.run('BEGIN');
    let id: number;
    try {
      const number = generateRfqNumber(db);
      db.run(
        `INSERT INTO rfqs (rfq_number, project_id, title, description, deadline, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [number, req.project_id ?? null, req.title.trim(), req.description ?? null,
         req.deadline ?? null, req.notes ?? null, user.id],
      );
      const idStmt = db.prepare('SELECT last_insert_rowid()');
      idStmt.step();
      id = idStmt.get()[0] as number;
      idStmt.free();

      req.items.forEach((item, idx) => {
        db.run(
          `INSERT INTO rfq_items (rfq_id, material_id, description, quantity, unit, notes, line_no)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, item.material_id ?? null, item.description, item.quantity,
           item.unit || 'buc', item.notes ?? null, idx + 1],
        );
      });

      for (const supplierId of req.supplier_ids) {
        const token = crypto.randomBytes(20).toString('hex');
        db.run(
          `INSERT INTO rfq_invitations (rfq_id, supplier_id, public_token) VALUES (?, ?, ?)`,
          [id, supplierId, token],
        );
      }

      db.run('COMMIT');
    } catch (err) {
      try { db.run('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }

    return this.get(db, user, id);
  }

  static delete(db: Database, user: UserWithRole, id: number): void {
    db.run('DELETE FROM rfqs WHERE id = ?', [id]);
    logAuditEvent(db, user.id, 'DELETE', 'rfq', id, null);
  }

  static async sendInvitations(db: Database, user: UserWithRole, rfqId: number): Promise<Rfq> {
    const rfq = this.get(db, user, rfqId);
    let sent = 0;
    let failed = 0;

    for (const inv of rfq.invitations) {
      if (inv.status !== 'pending' && inv.status !== 'sent') continue;
      if (!inv.supplier_email) { failed++; continue; }

      const subject = `Cerere ofertă ${rfq.rfq_number} — ${rfq.title}`;
      const portalUrl = `[link unic primit pe email]`;
      const itemsList = rfq.items.map(i => `<li>${i.description} — ${i.quantity} ${i.unit}</li>`).join('');
      const body = `
        <div style="font-family: Arial, sans-serif; font-size: 13px; max-width: 600px;">
          <p>Bună ziua${inv.supplier_name ? `, ${inv.supplier_name}` : ''},</p>
          <p>Vă invităm să transmiteți o ofertă pentru cererea noastră <strong>${rfq.rfq_number} — ${rfq.title}</strong>.</p>
          ${rfq.description ? `<p>${rfq.description}</p>` : ''}
          <p><strong>Articole solicitate:</strong></p>
          <ul>${itemsList}</ul>
          ${rfq.deadline ? `<p>Termen răspuns: <strong>${rfq.deadline}</strong></p>` : ''}
          <p>Vă rugăm completați prețurile prin formularul nostru online:</p>
          <p style="margin: 20px 0;">
            <a href="${portalUrl}" style="background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Trimite ofertă
            </a>
          </p>
          <p style="font-size: 11px; color: #64748b;">Link unic acces — nu redistribuiți.</p>
        </div>
      `;

      try {
        await EmailService.sendMessage(db, user, {
          to: [{ email: inv.supplier_email, name: inv.supplier_name }],
          subject,
          body_html: body.replace('[link unic primit pe email]', `${process.env.PROMIX_PUBLIC_URL || ''}/#/rfq/${inv.public_token}`),
        });
        db.run("UPDATE rfq_invitations SET status = 'sent', sent_at = datetime('now') WHERE id = ?", [inv.id]);
        sent++;
      } catch {
        failed++;
      }
    }

    db.run("UPDATE rfqs SET status = 'sent', updated_at = datetime('now') WHERE id = ? AND status = 'draft'", [rfqId]);
    if (sent === 0 && failed > 0) throw CommandError.badRequest(`Niciun email trimis — ${failed} eșuate (verificați emailurile furnizorilor)`);
    return this.get(db, user, rfqId);
  }

  static award(db: Database, user: UserWithRole, rfqId: number, supplierId: number): Rfq {
    db.run("UPDATE rfqs SET status = 'awarded', awarded_supplier_id = ?, updated_at = datetime('now') WHERE id = ?",
      [supplierId, rfqId]);
    return this.get(db, user, rfqId);
  }

  



  static compare(db: Database, user: UserWithRole, rfqId: number): {
    rfq: Rfq;
    suppliers: Array<{ invitation_id: number; supplier_id: number; supplier_name: string | null;
      total: number; lead_time_days: number | null; status: string; }>;
    matrix: Array<{
      item_id: number; description: string; quantity: number; unit: string;
      offers: Array<{ invitation_id: number; supplier_name: string | null; unit_price: number;
        line_total: number; available_quantity: number | null; is_cheapest: boolean; }>
    }>;
  } {
    const rfq = this.get(db, user, rfqId);
    const submitted = rfq.invitations.filter(i => i.status === 'submitted');

    const suppliers = submitted.map(inv => ({
      invitation_id: inv.id,
      supplier_id: inv.supplier_id,
      supplier_name: inv.supplier_name,
      total: inv.response_total ?? 0,
      lead_time_days: inv.response_lead_time_days,
      status: inv.status,
    }));

    const matrix = rfq.items.map(item => {
      const offers = submitted.map(inv => {
        const r = inv.responses.find(rr => rr.rfq_item_id === item.id);
        const unitPrice = r?.unit_price ?? 0;
        return {
          invitation_id: inv.id,
          supplier_name: inv.supplier_name,
          unit_price: unitPrice,
          line_total: unitPrice * item.quantity,
          available_quantity: r?.available_quantity ?? null,
          is_cheapest: false,
        };
      });
      
      const validOffers = offers.filter(o => o.unit_price > 0);
      if (validOffers.length > 0) {
        const min = Math.min(...validOffers.map(o => o.unit_price));
        for (const o of offers) if (o.unit_price === min && o.unit_price > 0) o.is_cheapest = true;
      }
      return {
        item_id: item.id, description: item.description,
        quantity: item.quantity, unit: item.unit,
        offers,
      };
    });

    return { rfq, suppliers, matrix };
  }
}
