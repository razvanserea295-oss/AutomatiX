import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';





export interface StandardPart {
  id: number; code: string; name: string; category: string;
  subcategory: string | null; supplier_id: number | null; supplier_name: string | null;
  lead_time_days: number | null; unit: string; unit_cost: number;
  specs: string | null; notes: string | null;
}

export interface CreateStandardPartRequest {
  code: string; name: string; category: string; subcategory?: string | null;
  supplier_id?: number | null; lead_time_days?: number | null;
  unit?: string | null; unit_cost?: number | null;
  specs?: string | null; notes?: string | null;
}

export interface UpdateStandardPartRequest {
  id: number; code?: string | null; name?: string | null; category?: string | null;
  subcategory?: string | null; supplier_id?: number | null; lead_time_days?: number | null;
  unit?: string | null; unit_cost?: number | null;
  specs?: string | null; notes?: string | null;
}

export interface CustomPart {
  id: number; code: string; name: string; category: string;
  originating_project_id: number | null; originating_project_name: string | null;
  promoted_to_standard_id: number | null; specs: string | null; notes: string | null;
}

export interface CreateCustomPartRequest {
  code: string; name: string; category: string;
  originating_project_id?: number | null; specs?: string | null; notes?: string | null;
}

export interface UpdateCustomPartRequest {
  id: number; code?: string | null; name?: string | null; category?: string | null;
  specs?: string | null; notes?: string | null;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
const SP_SQL = `SELECT sp.id, sp.code, sp.name, sp.category, sp.subcategory, sp.supplier_id, s.name as supplier_name,
       sp.lead_time_days, sp.unit, sp.unit_cost, sp.specs, sp.notes
FROM standard_parts sp LEFT JOIN suppliers s ON s.id = sp.supplier_id`;

const CP_SQL = `SELECT cp.id, cp.code, cp.name, cp.category, cp.originating_project_id, p.name as originating_project_name,
       cp.promoted_to_standard_id, cp.specs, cp.notes
FROM custom_parts cp LEFT JOIN projects p ON p.id = cp.originating_project_id`;





export class LibraryService {
  static getStandardParts(db: Database, category?: string | null): StandardPart[] {
    if (category) {
      return queryRows(db, `${SP_SQL} WHERE sp.category = ? ORDER BY sp.name`, [category], r => r as StandardPart);
    }
    return queryRows(db, `${SP_SQL} ORDER BY sp.category, sp.name`, [], r => r as StandardPart);
  }

  static createStandardPart(db: Database, req: CreateStandardPartRequest): StandardPart {
    const unit = req.unit || 'buc';
    db.run(
      `INSERT INTO standard_parts (code, name, category, subcategory, supplier_id, lead_time_days, unit, unit_cost, specs, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.code, req.name, req.category, req.subcategory ?? null, req.supplier_id ?? null,
       req.lead_time_days ?? null, unit, req.unit_cost ?? 0, req.specs ?? null, req.notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    const result = queryOne(db, `${SP_SQL} WHERE sp.id = ?`, [id], r => r as StandardPart);
    if (!result) throw CommandError.internal('Eroare la creare piesa standard');
    return result;
  }

  static updateStandardPart(db: Database, req: UpdateStandardPartRequest): StandardPart {
    db.run(
      `UPDATE standard_parts SET code=COALESCE(?,code), name=COALESCE(?,name), category=COALESCE(?,category),
       subcategory=COALESCE(?,subcategory), supplier_id=COALESCE(?,supplier_id), lead_time_days=COALESCE(?,lead_time_days),
       unit=COALESCE(?,unit), unit_cost=COALESCE(?,unit_cost), specs=COALESCE(?,specs), notes=COALESCE(?,notes),
       updated_at=datetime('now') WHERE id=?`,
      [req.code ?? null, req.name ?? null, req.category ?? null, req.subcategory ?? null,
       req.supplier_id ?? null, req.lead_time_days ?? null, req.unit ?? null,
       req.unit_cost ?? null, req.specs ?? null, req.notes ?? null, req.id]
    );
    const result = queryOne(db, `${SP_SQL} WHERE sp.id = ?`, [req.id], r => r as StandardPart);
    if (!result) throw CommandError.notFound('Piesa negasita');
    return result;
  }

  static deleteStandardPart(db: Database, id: number): void {
    db.run('DELETE FROM standard_parts WHERE id = ?', [id]);
  }

  static getCustomParts(db: Database, projectId?: number | null): CustomPart[] {
    if (projectId) {
      return queryRows(db, `${CP_SQL} WHERE cp.originating_project_id = ? ORDER BY cp.name`, [projectId], r => r as CustomPart);
    }
    return queryRows(db, `${CP_SQL} ORDER BY cp.name`, [], r => r as CustomPart);
  }

  static createCustomPart(db: Database, req: CreateCustomPartRequest): CustomPart {
    db.run(
      'INSERT INTO custom_parts (code, name, category, originating_project_id, specs, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.code, req.name, req.category, req.originating_project_id ?? null, req.specs ?? null, req.notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    const result = queryOne(db, `${CP_SQL} WHERE cp.id = ?`, [id], r => r as CustomPart);
    if (!result) throw CommandError.internal('Eroare la creare piesa custom');
    return result;
  }

  static updateCustomPart(db: Database, req: UpdateCustomPartRequest): CustomPart {
    db.run(
      `UPDATE custom_parts SET code=COALESCE(?,code), name=COALESCE(?,name), category=COALESCE(?,category),
       specs=COALESCE(?,specs), notes=COALESCE(?,notes) WHERE id=?`,
      [req.code ?? null, req.name ?? null, req.category ?? null, req.specs ?? null, req.notes ?? null, req.id]
    );
    const result = queryOne(db, `${CP_SQL} WHERE cp.id = ?`, [req.id], r => r as CustomPart);
    if (!result) throw CommandError.notFound('Piesa custom negasita');
    return result;
  }

  static deleteCustomPart(db: Database, id: number): void {
    db.run('DELETE FROM custom_parts WHERE id = ?', [id]);
  }

  static promoteToStandard(db: Database, customId: number): StandardPart {
    const cp = queryOne(db,
      'SELECT code, name, category, specs, notes FROM custom_parts WHERE id = ?',
      [customId], r => ({ code: r.code as string, name: r.name as string, category: r.category as string, specs: r.specs as string | null, notes: r.notes as string | null })
    );
    if (!cp) throw CommandError.notFound('Piesa custom negasita');

    db.run('INSERT INTO standard_parts (code, name, category, specs, notes) VALUES (?, ?, ?, ?, ?)',
      [cp.code, cp.name, cp.category, cp.specs, cp.notes]);
    const stdId = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;

    db.run('UPDATE custom_parts SET promoted_to_standard_id = ? WHERE id = ?', [stdId, customId]);

    const result = queryOne(db, `${SP_SQL} WHERE sp.id = ?`, [stdId], r => r as StandardPart);
    if (!result) throw CommandError.internal('Eroare la promovare piesa');
    return result;
  }
}
