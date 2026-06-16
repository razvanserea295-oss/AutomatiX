




















import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';

export interface SupplierCode {
  id: number;
  code: string;          
  label: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function mapRow(row: any): SupplierCode {
  return {
    id: row.id as number,
    code: row.code as string,
    label: row.label as string,
    description: (row.description as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    sort_order: (row.sort_order as number) || 0,
    active: !!(row.active as number),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function assertAdmin(user: UserWithRole): void {
  if ((user.role_name || '').toLowerCase() !== 'admin') {
    throw CommandError.forbidden('Doar adminul poate gestiona codurile');
  }
}

export class SupplierCodesService {
  
  static list(db: Database, _user: UserWithRole, includeInactive = false): SupplierCode[] {
    const sql = includeInactive
      ? 'SELECT * FROM supplier_codes ORDER BY sort_order, code'
      : 'SELECT * FROM supplier_codes WHERE active = 1 ORDER BY sort_order, code';
    const stmt = db.prepare(sql);
    const out: SupplierCode[] = [];
    while (stmt.step()) out.push(mapRow(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  static create(db: Database, user: UserWithRole, req: {
    code: string; label: string; description?: string | null;
    color?: string | null; sort_order?: number;
  }): SupplierCode {
    assertAdmin(user);
    const code = (req.code || '').trim().toUpperCase();
    if (!/^[A-Z]{2,10}$/.test(code)) {
      throw CommandError.badRequest('Codul trebuie 2-10 litere mari (A-Z)');
    }
    const label = (req.label || '').trim();
    if (!label) throw CommandError.badRequest('Eticheta este obligatorie');

    db.run(
      `INSERT INTO supplier_codes (code, label, description, color, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [code, label, req.description ?? null, req.color ?? null, req.sort_order ?? 0],
    );
    return this.getById(db, this.lastId(db));
  }

  static update(db: Database, user: UserWithRole, req: {
    id: number; code?: string; label?: string; description?: string | null;
    color?: string | null; sort_order?: number; active?: boolean;
  }): SupplierCode {
    assertAdmin(user);
    const existing = this.getById(db, req.id);
    const newCode = req.code !== undefined
      ? (req.code || '').trim().toUpperCase()
      : existing.code;
    if (!/^[A-Z]{2,10}$/.test(newCode)) {
      throw CommandError.badRequest('Codul trebuie 2-10 litere mari (A-Z)');
    }
    db.run(
      `UPDATE supplier_codes SET
         code = ?, label = ?, description = ?, color = ?,
         sort_order = ?, active = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        newCode,
        req.label ?? existing.label,
        req.description !== undefined ? req.description : existing.description,
        req.color !== undefined ? req.color : existing.color,
        req.sort_order ?? existing.sort_order,
        req.active === undefined ? (existing.active ? 1 : 0) : (req.active ? 1 : 0),
        req.id,
      ],
    );
    return this.getById(db, req.id);
  }

  static delete(db: Database, user: UserWithRole, id: number): void {
    assertAdmin(user);
    
    
    
    
    db.run('UPDATE supplier_codes SET active = 0, updated_at = datetime(\'now\') WHERE id = ?', [id]);
  }

  private static getById(db: Database, id: number): SupplierCode {
    const stmt = db.prepare('SELECT * FROM supplier_codes WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Cod inexistent'); }
    const row = mapRow(stmt.getAsObject());
    stmt.free();
    return row;
  }

  private static lastId(db: Database): number {
    const stmt = db.prepare('SELECT last_insert_rowid()');
    stmt.step();
    const id = stmt.get()[0] as number;
    stmt.free();
    return id;
  }

  





  static extract(db: Database, name: string | null | undefined): string | null {
    if (!name) return null;
    const codes = this.list(db, { role_name: 'admin' } as UserWithRole, false);
    if (codes.length === 0) return null;
    
    const alternation = codes.map(c => c.code).join('|');
    const re = new RegExp(`^(${alternation})[_\\-\\s]`, 'i');
    const m = name.match(re);
    return m ? m[1].toUpperCase() : null;
  }
}
