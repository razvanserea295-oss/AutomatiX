












import type { Database } from 'sql.js';
import type { UserWithRole } from './authService';
import { CommandError } from '../middleware/errors';

export interface ActiveSession {
  session_id: string;
  user_id: number;
  username: string;
  full_name: string | null;
  role_name: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
}

export interface LoginHistoryEntry {
  id: number;
  action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | string;
  ip_address: string | null;
  details: string | null;
  created_at: string;
}

export interface SessionsSummary {
  active_users: number;        
  active_sessions: number;     
  logins_today: number;
  failed_logins_today: number;
}

function rowsAll(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

function requireAdmin(user: UserWithRole): void {
  if ((user.role_name || '').toLowerCase() !== 'admin') {
    throw CommandError.forbidden('Doar administratorii pot vedea informațiile despre sesiuni');
  }
}

export class UserSessionsService {
  



  static listActive(db: Database, user: UserWithRole): ActiveSession[] {
    requireAdmin(user);
    return rowsAll(db, `
      SELECT s.id AS session_id, s.user_id, s.ip_address, s.created_at, s.expires_at,
             u.username, u.full_name, r.name AS role_name
      FROM sessions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE datetime(s.expires_at) > datetime('now')
      ORDER BY s.created_at DESC
    `).map(r => ({
      session_id: r.session_id as string,
      user_id: r.user_id as number,
      username: (r.username as string) ?? '',
      full_name: (r.full_name as string | null) ?? null,
      role_name: (r.role_name as string | null) ?? null,
      ip_address: (r.ip_address as string | null) ?? null,
      created_at: r.created_at as string,
      expires_at: r.expires_at as string,
    }));
  }

  



  static getUserHistory(db: Database, user: UserWithRole, targetUserId: number, limit = 100): LoginHistoryEntry[] {
    requireAdmin(user);
    if (!targetUserId || targetUserId <= 0) throw CommandError.badRequest('user_id invalid');
    const cap = Math.min(Math.max(1, limit), 500);
    return rowsAll(db, `
      SELECT id, action, ip_address, details, created_at
      FROM audit_logs
      WHERE user_id = ? AND action IN ('LOGIN', 'LOGOUT', 'LOGIN_FAILED')
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `, [targetUserId, cap]).map(r => ({
      id: r.id as number,
      action: r.action as string,
      ip_address: (r.ip_address as string | null) ?? null,
      details: (r.details as string | null) ?? null,
      created_at: r.created_at as string,
    }));
  }

  




  static forceLogout(db: Database, admin: UserWithRole, targetUserId: number): { revoked: number } {
    requireAdmin(admin);
    if (!targetUserId || targetUserId <= 0) throw CommandError.badRequest('user_id invalid');

    const before = rowsAll(db,
      `SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?`, [targetUserId])[0]?.n ?? 0;
    db.run('DELETE FROM sessions WHERE user_id = ?', [targetUserId]);

    
    try {
      db.run(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES (?, 'LOGOUT', 'user', ?, ?, NULL)`,
        [targetUserId, targetUserId, JSON.stringify({ reason: 'force_logout_by_admin', by: admin.username })],
      );
    } catch {  }

    return { revoked: before as number };
  }

  



  static getSummary(db: Database, user: UserWithRole): SessionsSummary {
    requireAdmin(user);
    const active = rowsAll(db, `
      SELECT COUNT(*) AS sessions_n,
             COUNT(DISTINCT user_id) AS users_n
      FROM sessions
      WHERE datetime(expires_at) > datetime('now')
    `)[0] || {};
    const today = rowsAll(db, `
      SELECT
        SUM(CASE WHEN action = 'LOGIN' THEN 1 ELSE 0 END) AS logins,
        SUM(CASE WHEN action = 'LOGIN_FAILED' THEN 1 ELSE 0 END) AS failed
      FROM audit_logs
      WHERE date(created_at) = date('now')
        AND action IN ('LOGIN', 'LOGIN_FAILED')
    `)[0] || {};
    return {
      active_users: (active.users_n as number) || 0,
      active_sessions: (active.sessions_n as number) || 0,
      logins_today: (today.logins as number) || 0,
      failed_logins_today: (today.failed as number) || 0,
    };
  }
}
