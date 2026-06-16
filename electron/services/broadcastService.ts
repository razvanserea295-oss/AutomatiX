/**
 * Admin broadcast popups — one-shot "important update" notifications that
 * the admin pushes to everyone. The next time each user opens the app,
 * they see a modal once; dismissing it stamps a row in
 * `admin_broadcast_dismissals` so they won't see it again.
 *
 * Distinct from `user_notifications` (bell-icon inbox, fine-grained per-user
 * targeting): broadcasts are blocking app-boot modals intended for global
 * announcements like "release notes" or "scheduled maintenance".
 */

import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';

export type BroadcastSeverity = 'info' | 'warning' | 'important';

export interface AdminBroadcast {
  id: number;
  title: string;
  body: string;
  severity: BroadcastSeverity;
  created_by_user_id: number;
  created_by_name: string | null;
  created_at: string;
  expires_at: string | null;
  
  
  dismissed_count?: number;
}

interface CreateBroadcastRequest {
  title?: string;
  body?: string;
  severity?: BroadcastSeverity;
  expires_at?: string | null;
}

function requireAdmin(user: UserWithRole): void {
  if ((user.role_name || '').toLowerCase() !== 'admin') {
    throw CommandError.forbidden('Doar adminul poate gestiona anunțuri');
  }
}

function rowToBroadcast(row: any): AdminBroadcast {
  return {
    id: row.id as number,
    title: row.title as string,
    body: row.body as string,
    severity: (row.severity as BroadcastSeverity) || 'info',
    created_by_user_id: row.created_by_user_id as number,
    created_by_name: (row.created_by_name as string | null) ?? null,
    created_at: row.created_at as string,
    expires_at: (row.expires_at as string | null) ?? null,
    dismissed_count: row.dismissed_count != null ? (row.dismissed_count as number) : undefined,
  };
}

export class BroadcastService {
  
  static create(db: Database, user: UserWithRole, req: CreateBroadcastRequest): AdminBroadcast {
    requireAdmin(user);
    const title = (req.title || '').trim();
    const body = (req.body || '').trim();
    if (!title) throw CommandError.badRequest('Titlul este obligatoriu');
    if (!body) throw CommandError.badRequest('Conținutul este obligatoriu');
    const severity: BroadcastSeverity =
      req.severity === 'warning' || req.severity === 'important' ? req.severity : 'info';
    
    
    
    const expiresAt = req.expires_at && req.expires_at.trim() ? req.expires_at.trim() : null;

    db.run(
      `INSERT INTO admin_broadcasts (title, body, severity, created_by_user_id, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [title, body, severity, user.id, expiresAt],
    );

    const idStmt = db.prepare('SELECT last_insert_rowid() AS id');
    idStmt.step();
    const id = idStmt.getAsObject().id as number;
    idStmt.free();

    return this.getById(db, id);
  }

  static getById(db: Database, id: number): AdminBroadcast {
    const stmt = db.prepare(
      `SELECT b.*, u.full_name AS created_by_name
         FROM admin_broadcasts b
         LEFT JOIN users u ON u.id = b.created_by_user_id
        WHERE b.id = ?`,
    );
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Anunț inexistent');
    }
    const row = stmt.getAsObject();
    stmt.free();
    return rowToBroadcast(row);
  }

  
  static listAll(db: Database, user: UserWithRole): AdminBroadcast[] {
    requireAdmin(user);
    const stmt = db.prepare(
      `SELECT b.*, u.full_name AS created_by_name,
              (SELECT COUNT(*) FROM admin_broadcast_dismissals d WHERE d.broadcast_id = b.id) AS dismissed_count
         FROM admin_broadcasts b
         LEFT JOIN users u ON u.id = b.created_by_user_id
        ORDER BY b.created_at DESC`,
    );
    const out: AdminBroadcast[] = [];
    while (stmt.step()) out.push(rowToBroadcast(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  
  static delete(db: Database, user: UserWithRole, id: number): void {
    requireAdmin(user);
    if (!Number.isFinite(id) || id <= 0) {
      throw CommandError.badRequest('id invalid');
    }
    
    
    db.run('DELETE FROM admin_broadcast_dismissals WHERE broadcast_id = ?', [id]);
    db.run('DELETE FROM admin_broadcasts WHERE id = ?', [id]);
  }

  




  static getPending(db: Database, user: UserWithRole): AdminBroadcast[] {
    const stmt = db.prepare(
      `SELECT b.*, u.full_name AS created_by_name
         FROM admin_broadcasts b
         LEFT JOIN users u ON u.id = b.created_by_user_id
        WHERE (b.expires_at IS NULL OR datetime(b.expires_at) > datetime('now'))
          AND NOT EXISTS (
            SELECT 1 FROM admin_broadcast_dismissals d
             WHERE d.broadcast_id = b.id AND d.user_id = ?
          )
        ORDER BY b.created_at ASC`,
    );
    stmt.bind([user.id]);
    const out: AdminBroadcast[] = [];
    while (stmt.step()) out.push(rowToBroadcast(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  
  static dismiss(db: Database, user: UserWithRole, broadcastId: number): void {
    if (!Number.isFinite(broadcastId) || broadcastId <= 0) {
      throw CommandError.badRequest('broadcast_id invalid');
    }
    
    
    db.run(
      `INSERT OR IGNORE INTO admin_broadcast_dismissals (broadcast_id, user_id)
       VALUES (?, ?)`,
      [broadcastId, user.id],
    );
  }
}
