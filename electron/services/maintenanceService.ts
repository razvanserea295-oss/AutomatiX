import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';





export interface PieceService {
  id: number;
  project_id: number;
  project_piece_id: number;
  piece_name: string | null;
  piece_category: string | null;
  project_name: string | null;
  title: string;
  defect: string | null;
  service_description: string | null;
  technician_id: number | null;
  technician_name: string | null;
  service_date: string;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  status: string;
  notes: string | null;
  before_photo: string | null;
  after_photo: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePieceServiceRequest {
  project_id: number;
  project_piece_id: number;
  title: string;
  defect?: string | null;
  service_description?: string | null;
  technician_id?: number | null;
  service_date?: string | null;
  labor_cost?: number | null;
  parts_cost?: number | null;
  status?: string | null;
  notes?: string | null;
  before_photo?: string | null;
  after_photo?: string | null;
}

export interface UpdatePieceServiceRequest {
  id: number;
  title?: string | null;
  defect?: string | null;
  service_description?: string | null;
  technician_id?: number | null;
  service_date?: string | null;
  labor_cost?: number | null;
  parts_cost?: number | null;
  status?: string | null;
  notes?: string | null;
  before_photo?: string | null;
  after_photo?: string | null;
}

const VALID_STATUSES = ['in_lucru', 'finalizat', 'anulat'];





const LIST_SQL = `
  SELECT ps.id, ps.project_id, ps.project_piece_id,
         pp.name as piece_name, pp.category as piece_category,
         pr.name as project_name,
         ps.title, ps.defect, ps.service_description,
         ps.technician_id, u.full_name as technician_name,
         ps.service_date, ps.labor_cost, ps.parts_cost,
         (ps.labor_cost + ps.parts_cost) as total_cost,
         ps.status, ps.notes,
         ps.before_photo, ps.after_photo,
         ps.created_at, ps.updated_at
    FROM piece_services ps
    LEFT JOIN project_pieces pp ON ps.project_piece_id = pp.id
    LEFT JOIN projects pr       ON ps.project_id       = pr.id
    LEFT JOIN users u           ON ps.technician_id    = u.id
`;

function queryAll(db: Database, sql: string, params: unknown[]): PieceService[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params as (string | number | null)[]);
  const rows: PieceService[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as unknown as PieceService);
  stmt.free();
  return rows;
}

function queryOne(db: Database, sql: string, params: unknown[]): PieceService | null {
  const all = queryAll(db, sql, params);
  return all[0] ?? null;
}

function getLastInsertId(db: Database): number {
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const row = stmt.getAsObject() as { id: number };
  stmt.free();
  return row.id;
}





export class MaintenanceService {
  static list(db: Database, _user: UserWithRole, projectId?: number | null): PieceService[] {
    if (projectId != null) {
      return queryAll(db, `${LIST_SQL} WHERE ps.project_id = ? ORDER BY ps.service_date DESC, ps.id DESC`, [projectId]);
    }
    return queryAll(db, `${LIST_SQL} ORDER BY ps.service_date DESC, ps.id DESC`, []);
  }

  static getById(db: Database, id: number): PieceService {
    const row = queryOne(db, `${LIST_SQL} WHERE ps.id = ?`, [id]);
    if (!row) throw CommandError.notFound('Servisare inexistenta');
    return row;
  }

  static create(db: Database, user: UserWithRole, req: CreatePieceServiceRequest): PieceService {
    if (!req.project_id)        throw CommandError.badRequest('project_id obligatoriu');
    if (!req.project_piece_id)  throw CommandError.badRequest('project_piece_id obligatoriu');
    if (!req.title?.trim())     throw CommandError.badRequest('Titlu obligatoriu');
    const status = req.status ?? 'in_lucru';
    if (!VALID_STATUSES.includes(status)) throw CommandError.badRequest('Status invalid');

    
    

    db.run(
      `INSERT INTO piece_services
        (project_id, project_piece_id, title, defect, service_description, technician_id,
         service_date, labor_cost, parts_cost, status, notes,
         before_photo, after_photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.project_id, req.project_piece_id, req.title.trim(),
        req.defect ?? null, req.service_description ?? null,
        req.technician_id ?? user.id,
        req.service_date ?? new Date().toISOString().slice(0, 10),
        Math.max(0, Number(req.labor_cost ?? 0)),
        Math.max(0, Number(req.parts_cost ?? 0)),
        status,
        req.notes ?? null,
        req.before_photo ?? null,
        req.after_photo ?? null,
      ],
    );
    const newId = getLastInsertId(db);
    const created = this.getById(db, newId);

    
    
    if (created.status === 'finalizat') {
      const total = (created.labor_cost || 0) + (created.parts_cost || 0);
      if (total > 0) {
        const ref = `service:${created.id}`;
        db.run(
          `INSERT INTO project_expenses
            (project_id, category, description, amount, currency, date, invoice_ref, notes, created_by)
           VALUES (?, 'service', ?, ?, 'RON', ?, ?, ?, ?)`,
          [created.project_id,
           `Servisare finalizata: ${created.title}`,
           total,
           created.service_date,
           ref,
           created.service_description ?? null,
           user.id]
        );
      }
    }
    return created;
  }

  static update(db: Database, user: UserWithRole, req: UpdatePieceServiceRequest): PieceService {
    const existing = this.getById(db, req.id);
    if (req.status && !VALID_STATUSES.includes(req.status)) {
      throw CommandError.badRequest('Status invalid');
    }
    
    
    
    
    
    db.run(
      `UPDATE piece_services SET
          title               = COALESCE(?, title),
          defect              = COALESCE(?, defect),
          service_description = COALESCE(?, service_description),
          technician_id       = COALESCE(?, technician_id),
          service_date        = COALESCE(?, service_date),
          labor_cost          = COALESCE(?, labor_cost),
          parts_cost          = COALESCE(?, parts_cost),
          status              = COALESCE(?, status),
          notes               = COALESCE(?, notes),
          before_photo        = CASE WHEN ? IS NULL THEN before_photo
                                     WHEN ? = ''    THEN NULL
                                     ELSE ? END,
          after_photo         = CASE WHEN ? IS NULL THEN after_photo
                                     WHEN ? = ''    THEN NULL
                                     ELSE ? END,
          updated_at          = datetime('now')
        WHERE id = ?`,
      [
        req.title ?? null,
        req.defect ?? null,
        req.service_description ?? null,
        req.technician_id ?? null,
        req.service_date ?? null,
        req.labor_cost == null ? null : Math.max(0, Number(req.labor_cost)),
        req.parts_cost == null ? null : Math.max(0, Number(req.parts_cost)),
        req.status ?? null,
        req.notes ?? null,
        req.before_photo ?? null, req.before_photo ?? null, req.before_photo ?? null,
        req.after_photo  ?? null, req.after_photo  ?? null, req.after_photo  ?? null,
        existing.id,
      ],
    );

    
    
    
    
    
    const updated = this.getById(db, existing.id);
    if (existing.status !== 'finalizat' && updated.status === 'finalizat') {
      const total = (updated.labor_cost || 0) + (updated.parts_cost || 0);
      if (total > 0) {
        const ref = `service:${updated.id}`;
        db.run('DELETE FROM project_expenses WHERE invoice_ref = ?', [ref]);
        db.run(
          `INSERT INTO project_expenses
            (project_id, category, description, amount, currency, date, invoice_ref, notes, created_by)
           VALUES (?, 'service', ?, ?, 'RON', ?, ?, ?, ?)`,
          [updated.project_id,
           `Servisare finalizata: ${updated.title}`,
           total,
           updated.service_date,
           ref,
           updated.service_description ?? null,
           user.id]
        );
      }
    }
    
    if (existing.status === 'finalizat' && updated.status !== 'finalizat') {
      db.run('DELETE FROM project_expenses WHERE invoice_ref = ?', [`service:${updated.id}`]);
    }

    return updated;
  }

  static delete(db: Database, _user: UserWithRole, id: number): void {
    const existing = this.getById(db, id);
    
    
    db.run('DELETE FROM project_expenses WHERE invoice_ref = ?', [`service:${existing.id}`]);
    db.run('DELETE FROM piece_services WHERE id = ?', [existing.id]);
  }
}
