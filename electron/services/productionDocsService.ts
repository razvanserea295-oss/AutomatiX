import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';
import { userHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';





export interface BonConsumLineDetail {
  id: number; line_no: number; material_id: number; material_code: string;
  material_name: string; qty: number; unit_cost_snapshot: number;
  project_piece_id: number | null; piece_name: string | null;
  material_consumption_id: number | null; notes: string | null;
}

export interface BonConsumDetail {
  id: number; project_id: number; project_name: string;
  stage_id: number | null; stage_name: string | null;
  created_by_name: string; created_at: string; notes: string | null;
  lines: BonConsumLineDetail[];
}

export interface CreateBonConsumLine {
  material_id: number; qty: number; unit_cost_snapshot?: number | null;
  project_piece_id?: number | null; notes?: string | null;
}

export interface CreateBonConsumRequest {
  project_id: number; stage_id?: number | null; date: string;
  notes?: string | null; lines: CreateBonConsumLine[];
}

export interface AvizLineDetail {
  id: number; line_no: number; kind: string;
  material_id: number | null; material_code: string | null; material_name: string | null;
  project_piece_id: number | null; piece_name: string | null;
  qty: number; notes: string | null;
}

export interface AvizDetail {
  id: number; project_id: number; project_name: string; direction: string;
  supplier_id: number | null; supplier_name: string | null;
  number: string | null; destination: string | null;
  issued_at: string; created_by_name: string; notes: string | null;
  lines: AvizLineDetail[];
}

export interface CreateAvizLineInput {
  kind: string; material_id?: number | null; project_piece_id?: number | null;
  qty: number; notes?: string | null;
}

export interface CreateAvizRequest {
  project_id: number; direction: string; supplier_id?: number | null;
  number?: string | null; destination?: string | null;
  issued_at: string; notes?: string | null; lines: CreateAvizLineInput[];
}

export interface InvoiceDetail {
  id: number; project_id: number; project_name: string;
  invoice_type: string; amount: number; currency: string;
  issued_at: string; ref_no: string | null;
  supplier_id: number | null; supplier_name: string | null;
  created_by_name: string; notes: string | null;
}

export interface CreateInvoiceRequest {
  project_id: number; invoice_type: string; amount: number;
  currency?: string | null; issued_at: string; ref_no?: string | null;
  supplier_id?: number | null; notes?: string | null;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
function canWrite(db: Database, user: UserWithRole): boolean {
  return userHasAny(db, user, ['all', 'manage_costs', 'manage_projects', 'manage_production'],
    ['production', 'documents']);
}

function audit(db: Database, userId: number, action: string, entityType: string, entityId: number | null): void {
  logAuditEvent(db, userId, action, entityType, entityId);
}





export class ProductionDocsService {
  static listBonConsumsByProject(db: Database, projectId: number): BonConsumDetail[] {
    const ids = queryRows(db,
      'SELECT id FROM bon_consums WHERE project_id = ? ORDER BY created_at DESC',
      [projectId], r => r.id as number);
    return ids.map(id => this.getBonConsum(db, id));
  }

  static getBonConsum(db: Database, id: number): BonConsumDetail {
    const header = queryOne(db,
      `SELECT bc.id, bc.project_id, p.name as project_name, bc.stage_id, ps.name as stage_name,
              u.full_name as created_by_name, bc.created_at, bc.notes
       FROM bon_consums bc JOIN projects p ON p.id = bc.project_id
       LEFT JOIN project_stages ps ON ps.id = bc.stage_id
       JOIN users u ON u.id = bc.created_by WHERE bc.id = ?`,
      [id], r => r);
    if (!header) throw CommandError.notFound('Bon consum negăsit');

    const lines = queryRows(db,
      `SELECT l.id, l.line_no, l.material_id, m.code as material_code, m.name as material_name,
              l.qty, l.unit_cost_snapshot, l.project_piece_id, pp.name as piece_name,
              l.material_consumption_id, l.notes
       FROM bon_consum_lines l JOIN materials m ON m.id = l.material_id
       LEFT JOIN project_pieces pp ON pp.id = l.project_piece_id
       WHERE l.bon_consum_id = ? ORDER BY l.line_no ASC`,
      [id], r => r as BonConsumLineDetail);

    return {
      id: header.id as number, project_id: header.project_id as number,
      project_name: header.project_name as string, stage_id: header.stage_id as number | null,
      stage_name: header.stage_name as string | null,
      created_by_name: header.created_by_name as string, created_at: header.created_at as string,
      notes: header.notes as string | null, lines,
    };
  }

  static createBonConsum(db: Database, user: UserWithRole, req: CreateBonConsumRequest): BonConsumDetail {
    if (!canWrite(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (!req.lines || req.lines.length === 0) throw CommandError.badRequest('Bon consum: adăugați cel puțin o linie');

    db.run('INSERT INTO bon_consums (project_id, stage_id, created_by, notes) VALUES (?, ?, ?, ?)',
      [req.project_id, req.stage_id ?? null, user.id, req.notes ?? null]);
    const bonId = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;

    for (let idx = 0; idx < req.lines.length; idx++) {
      const line = req.lines[idx];
      if (line.qty <= 0) throw CommandError.badRequest('Cantitate linie bon consum trebuie > 0');

      let unitCost = line.unit_cost_snapshot;
      if (unitCost == null) {
        unitCost = queryOne(db, 'SELECT unit_cost FROM materials WHERE id = ?', [line.material_id], r => r.unit_cost as number);
        if (unitCost == null) throw CommandError.badRequest('Material invalid');
      }

      
      db.run(
        `INSERT INTO material_consumptions (project_id, material_id, stage_id, quantity, unit_cost, loss_rate, date, notes, project_piece_id, created_by)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [req.project_id, line.material_id, req.stage_id ?? null, line.qty, unitCost, req.date,
         `Bon consum #${bonId} linia ${idx + 1}${line.notes ? ` — ${line.notes}` : ''}`,
         line.project_piece_id ?? null, user.id]
      );
      const consId = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;

      
      db.run("UPDATE materials SET stock = MAX(stock - ?, 0), updated_at = datetime('now') WHERE id = ?",
        [line.qty, line.material_id]);

      db.run(
        `INSERT INTO bon_consum_lines (bon_consum_id, line_no, material_id, project_piece_id, qty, unit_cost_snapshot, material_consumption_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [bonId, idx + 1, line.material_id, line.project_piece_id ?? null, line.qty, unitCost, consId, line.notes ?? null]
      );
    }

    audit(db, user.id, 'CREATE', 'bon_consum', bonId);
    return this.getBonConsum(db, bonId);
  }

  static listAvizeByProject(db: Database, projectId: number): AvizDetail[] {
    const ids = queryRows(db, 'SELECT id FROM avize WHERE project_id = ? ORDER BY issued_at DESC',
      [projectId], r => r.id as number);
    return ids.map(id => this.getAviz(db, id));
  }

  static getAviz(db: Database, id: number): AvizDetail {
    const header = queryOne(db,
      `SELECT a.id, a.project_id, p.name as project_name, a.direction, a.supplier_id, s.name as supplier_name,
              a.number, a.destination, a.issued_at, u.full_name as created_by_name, a.notes
       FROM avize a JOIN projects p ON p.id = a.project_id
       LEFT JOIN suppliers s ON s.id = a.supplier_id
       JOIN users u ON u.id = a.created_by WHERE a.id = ?`,
      [id], r => r);
    if (!header) throw CommandError.notFound('Aviz negăsit');

    const lines = queryRows(db,
      `SELECT l.id, l.line_no, l.kind, l.material_id, m.code as material_code, m.name as material_name,
              l.project_piece_id, pp.name as piece_name, l.qty, l.notes
       FROM aviz_lines l LEFT JOIN materials m ON m.id = l.material_id
       LEFT JOIN project_pieces pp ON pp.id = l.project_piece_id
       WHERE l.aviz_id = ? ORDER BY l.line_no ASC`,
      [id], r => r as AvizLineDetail);

    return {
      id: header.id as number, project_id: header.project_id as number,
      project_name: header.project_name as string, direction: header.direction as string,
      supplier_id: header.supplier_id as number | null, supplier_name: header.supplier_name as string | null,
      number: header.number as string | null, destination: header.destination as string | null,
      issued_at: header.issued_at as string, created_by_name: header.created_by_name as string,
      notes: header.notes as string | null, lines,
    };
  }

  static createAviz(db: Database, user: UserWithRole, req: CreateAvizRequest): AvizDetail {
    if (!canWrite(db, user)) throw CommandError.forbidden('Acces refuzat');
    const dir = req.direction.trim().toLowerCase();
    if (dir !== 'in' && dir !== 'out') throw CommandError.badRequest('Direcție aviz invalidă');
    if (!req.lines || req.lines.length === 0) throw CommandError.badRequest('Aviz: adăugați cel puțin o linie');

    db.run(
      'INSERT INTO avize (project_id, direction, supplier_id, number, destination, issued_at, created_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.project_id, dir, req.supplier_id ?? null, req.number ?? null,
       req.destination ?? null, req.issued_at, user.id, req.notes ?? null]
    );
    const avizId = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;

    for (let idx = 0; idx < req.lines.length; idx++) {
      const line = req.lines[idx];
      const kind = line.kind.trim().toLowerCase();
      if (kind !== 'material' && kind !== 'piece') throw CommandError.badRequest('Linie aviz: kind invalid');
      if (line.qty <= 0) throw CommandError.badRequest('Linie aviz: qty trebuie > 0');

      db.run(
        'INSERT INTO aviz_lines (aviz_id, line_no, kind, material_id, project_piece_id, qty, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [avizId, idx + 1, kind, line.material_id ?? null, line.project_piece_id ?? null, line.qty, line.notes ?? null]
      );
    }

    audit(db, user.id, 'CREATE', 'aviz', avizId);
    return this.getAviz(db, avizId);
  }

  static listInvoicesByProject(db: Database, projectId: number): InvoiceDetail[] {
    return queryRows(db,
      `SELECT i.id, i.project_id, p.name as project_name, i.invoice_type, i.amount, i.currency, i.issued_at, i.ref_no,
              i.supplier_id, s.name as supplier_name, u.full_name as created_by_name, i.notes
       FROM invoices i JOIN projects p ON p.id = i.project_id
       LEFT JOIN suppliers s ON s.id = i.supplier_id
       JOIN users u ON u.id = i.created_by WHERE i.project_id = ? ORDER BY i.issued_at DESC`,
      [projectId], r => r as InvoiceDetail);
  }

  static createInvoice(db: Database, user: UserWithRole, req: CreateInvoiceRequest): InvoiceDetail {
    if (!canWrite(db, user)) throw CommandError.forbidden('Acces refuzat');
    const t = req.invoice_type.trim().toLowerCase();
    if (t !== 'in' && t !== 'out') throw CommandError.badRequest('Tip factură invalid');
    if (req.amount < 0) throw CommandError.badRequest('Sumă invalidă');
    const currency = req.currency || 'RON';

    db.run(
      `INSERT INTO invoices (project_id, invoice_type, amount, currency, issued_at, ref_no, supplier_id, created_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.project_id, t, req.amount, currency, req.issued_at, req.ref_no ?? null,
       req.supplier_id ?? null, user.id, req.notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    audit(db, user.id, 'CREATE', 'invoice', id);

    const result = queryOne(db,
      `SELECT i.id, i.project_id, p.name as project_name, i.invoice_type, i.amount, i.currency, i.issued_at, i.ref_no,
              i.supplier_id, s.name as supplier_name, u.full_name as created_by_name, i.notes
       FROM invoices i JOIN projects p ON p.id = i.project_id
       LEFT JOIN suppliers s ON s.id = i.supplier_id
       JOIN users u ON u.id = i.created_by WHERE i.id = ?`,
      [id], r => r as InvoiceDetail);
    if (!result) throw CommandError.internal('Eroare la creare factură');
    return result;
  }
}
