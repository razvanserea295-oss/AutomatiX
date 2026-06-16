




import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';

export interface Signature {
  id: number;
  target_type: string;
  target_id: number;
  role_label: string;
  signer_name: string;
  image_base64: string;
  signed_by_user_id: number | null;
  signed_by_name: string | null;
  signed_at: string;
  ip_address: string | null;
  notes: string | null;
}

function rowsAll(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

function rowToSig(r: any): Signature {
  return {
    id: r.id as number,
    target_type: r.target_type as string,
    target_id: r.target_id as number,
    role_label: r.role_label as string,
    signer_name: r.signer_name as string,
    image_base64: r.image_base64 as string,
    signed_by_user_id: (r.signed_by_user_id as number | null) ?? null,
    signed_by_name: (r.signed_by_name as string | null) ?? null,
    signed_at: r.signed_at as string,
    ip_address: (r.ip_address as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
  };
}

export class SignatureService {
  static list(db: Database, _user: UserWithRole, targetType: string, targetId: number): Signature[] {
    if (!targetType || targetId == null) throw CommandError.badRequest('target_type și target_id obligatorii');
    return rowsAll(db, `
      SELECT s.id, s.target_type, s.target_id, s.role_label, s.signer_name, s.image_base64,
             s.signed_by_user_id, u.full_name AS signed_by_name,
             s.signed_at, s.ip_address, s.notes
      FROM signatures s LEFT JOIN users u ON u.id = s.signed_by_user_id
      WHERE s.target_type = ? AND s.target_id = ?
      ORDER BY s.signed_at DESC
    `, [targetType, targetId]).map(rowToSig);
  }

  static add(db: Database, user: UserWithRole, req: {
    target_type: string; target_id: number;
    role_label: string; signer_name: string;
    image_base64: string; notes?: string;
    ip_address?: string;
  }): Signature {
    if (!req.target_type || !req.target_id) throw CommandError.badRequest('target_type și target_id obligatorii');
    if (!req.role_label?.trim() || !req.signer_name?.trim()) throw CommandError.badRequest('rol și nume semnatar obligatorii');
    if (!req.image_base64) throw CommandError.badRequest('Lipsește semnătura');

    db.run(
      `INSERT INTO signatures (target_type, target_id, role_label, signer_name, image_base64,
                                signed_by_user_id, ip_address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.target_type, req.target_id, req.role_label.trim(), req.signer_name.trim(),
       req.image_base64, user.id, req.ip_address ?? null, req.notes ?? null],
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    const list = this.list(db, user, req.target_type, req.target_id);
    return list.find(s => s.id === id) || list[0];
  }

  static delete(db: Database, _user: UserWithRole, id: number): void {
    db.run('DELETE FROM signatures WHERE id = ?', [id]);
  }
}
