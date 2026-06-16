






import type { Database } from 'sql.js';
import type { UserWithRole } from './authService';
import { CommandError } from '../middleware/errors';

export interface ActivityEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  full_name: string | null;
  role_name: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ActivityActor {
  user_id: number;
  full_name: string | null;
  username: string | null;
  role_name: string | null;
  event_count: number;
  last_active: string | null;
}

export interface ActivityFilters {
  user_id?: number | null;
  role?: string | null;
  action?: string | null;
  entity_type?: string | null;
  from?: string | null; 
  to?: string | null;   
  limit?: number | null;
}


function assertManager(user: UserWithRole): void {
  const role = (user.role_name || '').toLowerCase();
  if (role !== 'admin' && role !== 'manager') {
    throw CommandError.forbidden('Doar managerii pot vedea activitatea utilizatorilor');
  }
}

function rows<T>(db: Database, sql: string, params: unknown[]): T[] {
  const out: T[] = [];
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params as any[]);
  while (stmt.step()) out.push(stmt.getAsObject() as T);
  stmt.free();
  return out;
}

export class ActivityLogService {
  
  static getUserActivity(db: Database, user: UserWithRole, f: ActivityFilters = {}): ActivityEntry[] {
    assertManager(user);
    const where: string[] = [];
    const params: unknown[] = [];
    if (f.user_id != null && Number.isFinite(Number(f.user_id))) { where.push('a.user_id = ?'); params.push(Number(f.user_id)); }
    if (f.role)        { where.push('LOWER(r.name) = LOWER(?)'); params.push(String(f.role)); }
    if (f.action)      { where.push('LOWER(a.action) = LOWER(?)'); params.push(String(f.action)); }
    if (f.entity_type) { where.push('a.entity_type = ?'); params.push(String(f.entity_type)); }
    if (f.from)        { where.push('date(a.created_at) >= date(?)'); params.push(String(f.from)); }
    if (f.to)          { where.push('date(a.created_at) <= date(?)'); params.push(String(f.to)); }
    const limit = Math.min(Math.max(Number(f.limit) || 200, 1), 1000);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit);
    return rows<ActivityEntry>(db,
      `SELECT a.id, a.user_id, u.username, u.full_name, r.name AS role_name,
              a.action, a.entity_type, a.entity_id, a.details, a.ip_address, a.created_at
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
         LEFT JOIN roles r ON r.id = u.role_id
         ${whereSql}
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT ?`,
      params);
  }

  

  static getActivityActors(db: Database, user: UserWithRole): ActivityActor[] {
    assertManager(user);
    return rows<ActivityActor>(db,
      `SELECT a.user_id, u.full_name, u.username, r.name AS role_name,
              COUNT(*) AS event_count, MAX(a.created_at) AS last_active
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
         LEFT JOIN roles r ON r.id = u.role_id
        WHERE a.user_id IS NOT NULL
        GROUP BY a.user_id, u.full_name, u.username, r.name
        ORDER BY event_count DESC`,
      []);
  }
}
