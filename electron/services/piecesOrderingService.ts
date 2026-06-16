




















import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { NotificationsService } from './notificationsService';

export type PieceOrderStatus = 'requested' | 'ordered' | 'arrived' | 'installed' | 'cancelled';

export interface PieceOrderRow {
  id: number;
  piece_id: number;
  status: PieceOrderStatus;
  supplier_code: string | null;
  quantity: number;
  notes: string | null;
  requested_by_user_id: number | null;
  requested_by_name: string | null;
  requested_at: string;
  ordered_by_user_id: number | null;
  ordered_by_name: string | null;
  ordered_at: string | null;
  purchase_order_id: number | null;
  arrived_by_user_id: number | null;
  arrived_by_name: string | null;
  arrived_at: string | null;
  installed_by_user_id: number | null;
  installed_by_name: string | null;
  installed_at: string | null;
  created_at: string;
  updated_at: string;
  
  piece_name: string;
  piece_category: string;
  source_file_name: string | null;
  project_id: number;
  project_name: string;
}

const SELECT_SQL = `
  SELECT t.id, t.piece_id, t.status, t.supplier_code, t.quantity, t.notes,
         t.requested_by_user_id, ur.full_name AS requested_by_name, t.requested_at,
         t.ordered_by_user_id,   uo.full_name AS ordered_by_name,   t.ordered_at,
         t.purchase_order_id,
         t.arrived_by_user_id,   ua.full_name AS arrived_by_name,   t.arrived_at,
         t.installed_by_user_id, ui.full_name AS installed_by_name, t.installed_at,
         t.created_at, t.updated_at,
         pp.name AS piece_name, pp.category AS piece_category,
         pp.source_file_name,
         pp.project_id, p.name AS project_name
    FROM piece_order_tracking t
    JOIN project_pieces pp ON pp.id = t.piece_id
    JOIN projects       p  ON p.id  = pp.project_id
    LEFT JOIN users ur ON ur.id = t.requested_by_user_id
    LEFT JOIN users uo ON uo.id = t.ordered_by_user_id
    LEFT JOIN users ua ON ua.id = t.arrived_by_user_id
    LEFT JOIN users ui ON ui.id = t.installed_by_user_id`;

function mapRow(r: any): PieceOrderRow {
  return {
    id: r.id as number,
    piece_id: r.piece_id as number,
    status: r.status as PieceOrderStatus,
    supplier_code: (r.supplier_code as string | null) ?? null,
    quantity: (r.quantity as number) || 1,
    notes: (r.notes as string | null) ?? null,
    requested_by_user_id: (r.requested_by_user_id as number | null) ?? null,
    requested_by_name: (r.requested_by_name as string | null) ?? null,
    requested_at: r.requested_at as string,
    ordered_by_user_id: (r.ordered_by_user_id as number | null) ?? null,
    ordered_by_name: (r.ordered_by_name as string | null) ?? null,
    ordered_at: (r.ordered_at as string | null) ?? null,
    purchase_order_id: (r.purchase_order_id as number | null) ?? null,
    arrived_by_user_id: (r.arrived_by_user_id as number | null) ?? null,
    arrived_by_name: (r.arrived_by_name as string | null) ?? null,
    arrived_at: (r.arrived_at as string | null) ?? null,
    installed_by_user_id: (r.installed_by_user_id as number | null) ?? null,
    installed_by_name: (r.installed_by_name as string | null) ?? null,
    installed_at: (r.installed_at as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    piece_name: r.piece_name as string,
    piece_category: r.piece_category as string,
    source_file_name: (r.source_file_name as string | null) ?? null,
    project_id: r.project_id as number,
    project_name: r.project_name as string,
  };
}

export class PiecesOrderingService {
  





  static list(
    db: Database,
    _user: UserWithRole,
    filters: { status?: PieceOrderStatus; project_id?: number; supplier_code?: string } = {},
  ): PieceOrderRow[] {
    const where: string[] = [];
    const params: any[] = [];
    if (filters.status) { where.push('t.status = ?'); params.push(filters.status); }
    if (filters.project_id) { where.push('pp.project_id = ?'); params.push(filters.project_id); }
    if (filters.supplier_code) { where.push('t.supplier_code = ?'); params.push(filters.supplier_code); }
    const sql = `${SELECT_SQL}${where.length ? ' WHERE ' + where.join(' AND ') : ''}
      ORDER BY
        CASE t.status
          WHEN 'requested' THEN 0
          WHEN 'ordered'   THEN 1
          WHEN 'arrived'   THEN 2
          WHEN 'installed' THEN 3
          ELSE 4 END,
        t.requested_at DESC`;
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const out: PieceOrderRow[] = [];
    while (stmt.step()) out.push(mapRow(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  
  static createRequest(
    db: Database,
    user: UserWithRole,
    req: { piece_id: number; quantity?: number; notes?: string | null; supplier_code?: string | null },
  ): PieceOrderRow {
    const pieceId = Number(req.piece_id);
    if (!pieceId) throw CommandError.badRequest('piece_id obligatoriu');

    
    const ps = db.prepare('SELECT supplier_code FROM project_pieces WHERE id = ?');
    ps.bind([pieceId]);
    if (!ps.step()) { ps.free(); throw CommandError.notFound('Piesa inexistentă'); }
    const pieceSupplierCode = ps.get()[0] as string | null;
    ps.free();

    
    
    const existing = this.findByPieceId(db, pieceId);
    if (existing) return existing;

    const code = req.supplier_code ?? pieceSupplierCode ?? null;
    const qty = Number(req.quantity || 1);

    db.run(
      `INSERT INTO piece_order_tracking (piece_id, status, supplier_code, quantity, notes, requested_by_user_id)
       VALUES (?, 'requested', ?, ?, ?, ?)`,
      [pieceId, code, qty, req.notes ?? null, user.id],
    );
    const created = this.findByPieceId(db, pieceId)!;
    
    
    
    NotificationsService.notifyUsersWithPageAccess(
      db,
      'parts-ordering',
      {
        kind: 'piece_order_requested',
        title: `Cerere piesă: ${created.piece_name}`,
        message: `${created.project_name}${created.supplier_code ? ` · cod ${created.supplier_code}` : ''}${qty > 1 ? ` · cant. ${qty}` : ''}${req.notes ? ` · ${req.notes}` : ''}`,
        linkPage: 'parts-ordering',
      },
      user.id,
    );
    return created;
  }

  




  static ensureRequested(db: Database, pieceId: number): void {
    const ps = db.prepare('SELECT supplier_code FROM project_pieces WHERE id = ?');
    ps.bind([pieceId]);
    if (!ps.step()) { ps.free(); return; }
    const code = ps.get()[0] as string | null;
    ps.free();
    if (!code) return;
    if (this.findByPieceId(db, pieceId)) return;
    db.run(
      `INSERT INTO piece_order_tracking (piece_id, status, supplier_code, quantity, requested_by_user_id)
       VALUES (?, 'requested', ?, 1, NULL)`,
      [pieceId, code],
    );
  }

  




  static updateStatus(
    db: Database,
    user: UserWithRole,
    req: { id: number; status: PieceOrderStatus; purchase_order_id?: number | null; notes?: string | null },
  ): PieceOrderRow {
    const row = this.findById(db, req.id);
    if (!row) throw CommandError.notFound('Cerere inexistentă');
    const next = req.status;

    const ALLOWED: Record<PieceOrderStatus, PieceOrderStatus[]> = {
      requested: ['ordered', 'cancelled'],
      ordered:   ['arrived', 'cancelled'],
      arrived:   ['installed', 'cancelled'],
      installed: [],
      cancelled: ['requested'],   
    };
    if (!ALLOWED[row.status].includes(next)) {
      throw CommandError.badRequest(`Tranziție invalidă: ${row.status} → ${next}`);
    }

    const sets: string[] = ['status = ?', "updated_at = datetime('now')"];
    const params: any[] = [next];

    if (next === 'ordered') {
      sets.push('ordered_by_user_id = ?', "ordered_at = datetime('now')");
      params.push(user.id);
      if (req.purchase_order_id !== undefined) {
        sets.push('purchase_order_id = ?');
        params.push(req.purchase_order_id);
      }
    }
    if (next === 'arrived') {
      sets.push('arrived_by_user_id = ?', "arrived_at = datetime('now')");
      params.push(user.id);
    }
    if (next === 'installed') {
      sets.push('installed_by_user_id = ?', "installed_at = datetime('now')");
      params.push(user.id);
    }
    if (req.notes !== undefined) {
      sets.push('notes = ?');
      params.push(req.notes);
    }
    params.push(req.id);

    db.run(`UPDATE piece_order_tracking SET ${sets.join(', ')} WHERE id = ?`, params);
    const updated = this.findById(db, req.id)!;

    
    
    
    
    
    
    const target = updated.requested_by_user_id;
    if (target && target !== user.id) {
      const actorName = user.full_name || user.username;
      if (next === 'ordered') {
        NotificationsService.notify(db, {
          userId: target,
          kind: 'piece_order_ordered',
          title: `${actorName} a comandat piesa`,
          message: `${updated.piece_name} · ${updated.project_name}${updated.supplier_code ? ` · cod ${updated.supplier_code}` : ''}`,
          linkPage: 'parts-ordering',
        });
      } else if (next === 'arrived') {
        NotificationsService.notify(db, {
          userId: target,
          kind: 'piece_order_arrived',
          title: `Piesă sosită: ${updated.piece_name}`,
          message: `${updated.project_name}${updated.supplier_code ? ` · cod ${updated.supplier_code}` : ''}`,
          linkPage: 'parts-ordering',
        });
      }
    }

    return updated;
  }

  


  static markInstalledByPieceStatus(db: Database, pieceId: number, userId: number | null): void {
    const row = this.findByPieceId(db, pieceId);
    if (!row) return;
    if (row.status !== 'arrived') return;
    db.run(
      `UPDATE piece_order_tracking SET status = 'installed',
                                       installed_by_user_id = ?,
                                       installed_at = datetime('now'),
                                       updated_at = datetime('now')
       WHERE id = ?`,
      [userId, row.id],
    );
  }

  










  static updateNotes(
    db: Database,
    user: UserWithRole,
    req: { id: number; notes: string | null },
  ): PieceOrderRow {
    const row = this.findById(db, req.id);
    if (!row) throw CommandError.notFound('Cerere inexistentă');
    const isAdmin = (user.role_name || '').toLowerCase() === 'admin';
    const isRequester = row.requested_by_user_id === user.id;
    if (!isAdmin && !isRequester) {
      throw CommandError.forbidden('Doar autorul cererii sau adminul poate edita nota');
    }
    const trimmed = (req.notes ?? '').trim();
    db.run(
      `UPDATE piece_order_tracking SET notes = ?, updated_at = datetime('now') WHERE id = ?`,
      [trimmed || null, req.id],
    );
    return this.findById(db, req.id)!;
  }

  
  static cancel(db: Database, user: UserWithRole, id: number): void {
    const row = this.findById(db, id);
    if (!row) throw CommandError.notFound('Cerere inexistentă');
    
    
    
    if (row.status === 'requested') {
      db.run('DELETE FROM piece_order_tracking WHERE id = ?', [id]);
    } else {
      db.run(
        `UPDATE piece_order_tracking SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
        [id],
      );
    }
    
    
    if (row.requested_by_user_id && row.requested_by_user_id !== user.id) {
      NotificationsService.notify(db, {
        userId: row.requested_by_user_id,
        kind: 'piece_order_cancelled',
        title: `Cerere anulată: ${row.piece_name}`,
        message: `${row.project_name}${row.supplier_code ? ` · cod ${row.supplier_code}` : ''}${row.status !== 'requested' ? ` (era în "${row.status}")` : ''}`,
        linkPage: 'parts-ordering',
      });
    }
  }

  private static findById(db: Database, id: number): PieceOrderRow | null {
    const stmt = db.prepare(`${SELECT_SQL} WHERE t.id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); return null; }
    const row = mapRow(stmt.getAsObject());
    stmt.free();
    return row;
  }

  private static findByPieceId(db: Database, pieceId: number): PieceOrderRow | null {
    const stmt = db.prepare(`${SELECT_SQL} WHERE t.piece_id = ?`);
    stmt.bind([pieceId]);
    if (!stmt.step()) { stmt.free(); return null; }
    const row = mapRow(stmt.getAsObject());
    stmt.free();
    return row;
  }
}
