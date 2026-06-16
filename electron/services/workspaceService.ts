import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';
import { getRolePermissions } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';





export interface UserPreference {
  user_id: number; theme: string; notifications_enabled: boolean;
  tutorial_completed: boolean; bio: string | null; phone: string | null;
  dashboard_layout: string | null; created_at: string; updated_at: string;
}

export interface UserNotification {
  id: number; user_id: number; kind: string; title: string;
  message: string; link_page: string | null; read: boolean;
  created_at: string; read_at: string | null;
}

export interface AuditLog {
  id: number; user_id: number | null; action: string;
  entity_type: string; entity_id: number | null;
  details: string | null; ip_address: string | null; created_at: string;
}

export interface WorkspaceProfile {
  user: UserWithRole; preferences: UserPreference;
  notifications: UserNotification[]; recent_activity: AuditLog[];
  role_experience: string;
}

export interface UpdateWorkspaceProfileRequest {
  full_name?: string | null; email?: string | null; bio?: string | null;
  phone?: string | null; theme?: string | null;
  notifications_enabled?: boolean | null; tutorial_completed?: boolean | null;
}

export interface PersonalProjectRecord {
  project_id: number; name: string; status: string;
  stage_name: string | null; relationship: string;
}

export interface PersonalDataExport {
  generated_at: string; profile: UserWithRole; preferences: UserPreference;
  notifications: UserNotification[]; recent_activity: AuditLog[];
  project_assignments: PersonalProjectRecord[]; time_entries: any[];
}

export interface ImportPersonalDataRequest {
  bio?: string | null; phone?: string | null; theme?: string | null;
  notifications_enabled?: boolean | null; tutorial_completed?: boolean | null;
}

export interface RoleUserCount {
  role_name: string; total_users: number; active_users: number;
}

export interface SystemMonitorData {
  app_version: string; db_path: string; total_users: number;
  active_sessions: number; unread_notifications: number;
  open_alerts: number; open_reports: number;
  role_breakdown: RoleUserCount[]; recent_audit_logs: AuditLog[];
}

export interface ModerationReport {
  id: number; reporter_user_id: number; reporter_name: string | null;
  assigned_to_user_id: number | null; assigned_to_name: string | null;
  subject_type: string; subject_id: number | null; reason: string;
  details: string | null; status: string; resolution_notes: string | null;
  created_at: string; updated_at: string; resolved_at: string | null;
}

export interface ModerationSummary {
  open_reports: number; reviewing_reports: number; resolved_reports: number;
}

export interface ModerationDashboard {
  summary: ModerationSummary; reports: ModerationReport[];
}

export interface CreateModerationReportRequest {
  subject_type: string; subject_id?: number | null;
  reason: string; details?: string | null;
}

export interface ResolveModerationReportRequest {
  report_id: number; status: string; resolution_notes?: string | null;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
function qNumber(db: Database, sql: string): number {
  const stmt = db.prepare(sql);
  let value = 0;
  if (stmt.step()) value = (stmt.get()[0] as number) || 0;
  stmt.free();
  return value;
}

function logAudit(db: Database, userId: number | null, action: string, entityType: string, entityId: number | null, details: string | null): void {
  logAuditEvent(db, userId, action, entityType, entityId, details);
}

function classifyRole(roleName: string): string {
  switch (roleName) {
    case 'admin': return 'admin';
    case 'viewer': case 'guest': return 'guest';
    case 'moderator': case 'hr': return 'moderator';
    default: return 'registered_user';
  }
}





export class WorkspaceService {
  static getProfile(db: Database, user: UserWithRole): WorkspaceProfile {
    const preferences = this.ensurePreferences(db, user.id);
    const notifications = this.getNotifications(db, user.id, 12);
    const recent_activity = this.getRecentActivity(db, user.id, 12);

    return {
      user, preferences, notifications, recent_activity,
      role_experience: classifyRole(user.role_name),
    };
  }

  static updateProfile(db: Database, user: UserWithRole, req: UpdateWorkspaceProfileRequest): WorkspaceProfile {
    if (req.email) {
      if (!req.email.includes('@') || !req.email.includes('.') || req.email.length > 100) {
        throw CommandError.badRequest('Email invalid');
      }
      const taken = queryOne(db, 'SELECT COUNT(*) as cnt FROM users WHERE email = ? AND id != ?', [req.email, user.id], r => r.cnt as number);
      if (taken && taken > 0) throw CommandError.badRequest('Email deja folosit');
    }
    if (req.full_name && req.full_name.trim().length < 3) {
      throw CommandError.badRequest('Numele complet trebuie să aibă minim 3 caractere');
    }

    db.run("UPDATE users SET full_name = ?, email = ?, updated_at = datetime('now') WHERE id = ?",
      [req.full_name ?? user.full_name, req.email ?? user.email, user.id]);

    const preferences = this.ensurePreferences(db, user.id);
    const theme = req.theme ?? preferences.theme;
    if (theme !== 'light' && theme !== 'dark') throw CommandError.badRequest('Tema invalidă');

    db.run(
      `UPDATE user_preferences SET theme = ?, notifications_enabled = ?, tutorial_completed = ?,
       bio = ?, phone = ?, updated_at = datetime('now') WHERE user_id = ?`,
      [theme, (req.notifications_enabled ?? preferences.notifications_enabled) ? 1 : 0,
       (req.tutorial_completed ?? preferences.tutorial_completed) ? 1 : 0,
       req.bio ?? preferences.bio, req.phone ?? preferences.phone, user.id]
    );

    logAudit(db, user.id, 'PROFILE_UPDATE', 'user_preferences', user.id, '{"scope":"self_service"}');

    const refreshedUser = this.reloadUser(db, user.id);
    return this.getProfile(db, refreshedUser);
  }

  static exportPersonalData(db: Database, user: UserWithRole): PersonalDataExport {
    const profile = this.reloadUser(db, user.id);
    const preferences = this.ensurePreferences(db, user.id);
    const notifications = this.getNotifications(db, user.id, 50);
    const recent_activity = this.getRecentActivity(db, user.id, 50);
    const project_assignments = this.getPersonalProjects(db, user);

    return {
      generated_at: new Date().toISOString(), profile, preferences,
      notifications, recent_activity, project_assignments, time_entries: [],
    };
  }

  static importPersonalData(db: Database, user: UserWithRole, req: ImportPersonalDataRequest): WorkspaceProfile {
    return this.updateProfile(db, user, {
      bio: req.bio, phone: req.phone, theme: req.theme,
      notifications_enabled: req.notifications_enabled,
      tutorial_completed: req.tutorial_completed,
    });
  }

  static getSystemMonitor(db: Database, user: UserWithRole): SystemMonitorData {
    const perms = getRolePermissions(db, user.role_id);
    if (!perms.includes('manage_users') && !perms.includes('all')) {
      throw CommandError.forbidden('Acces refuzat');
    }

    return {
      app_version: '2.4.1',
      db_path: 'electron-app',
      total_users: qNumber(db, 'SELECT COUNT(*) FROM users'),
      active_sessions: qNumber(db, "SELECT COUNT(*) FROM sessions WHERE datetime(expires_at) > datetime('now')"),
      unread_notifications: qNumber(db, 'SELECT COUNT(*) FROM user_notifications WHERE read = 0'),
      open_alerts: qNumber(db, 'SELECT COUNT(*) FROM alerts WHERE acknowledged = 0'),
      open_reports: qNumber(db, "SELECT COUNT(*) FROM moderation_reports WHERE status IN ('open', 'reviewing')"),
      role_breakdown: queryRows(db,
        `SELECT r.name as role_name, COUNT(u.id) as total_users,
                COALESCE(SUM(CASE WHEN u.active = 1 THEN 1 ELSE 0 END), 0) as active_users
         FROM roles r LEFT JOIN users u ON u.role_id = r.id
         GROUP BY r.id, r.name ORDER BY total_users DESC, r.name ASC`,
        [], r => r as RoleUserCount),
      recent_audit_logs: this.getGlobalAuditLogs(db, 20),
    };
  }

  static getModerationDashboard(db: Database, user: UserWithRole): ModerationDashboard {
    this.ensureModerationAccess(db, user);

    return {
      summary: {
        open_reports: qNumber(db, "SELECT COUNT(*) FROM moderation_reports WHERE status = 'open'"),
        reviewing_reports: qNumber(db, "SELECT COUNT(*) FROM moderation_reports WHERE status = 'reviewing'"),
        resolved_reports: qNumber(db, "SELECT COUNT(*) FROM moderation_reports WHERE status = 'resolved'"),
      },
      reports: queryRows(db,
        `SELECT mr.id, mr.reporter_user_id, reporter.full_name as reporter_name,
                mr.assigned_to_user_id, assignee.full_name as assigned_to_name,
                mr.subject_type, mr.subject_id, mr.reason, mr.details, mr.status,
                mr.resolution_notes, mr.created_at, mr.updated_at, mr.resolved_at
         FROM moderation_reports mr
         LEFT JOIN users reporter ON reporter.id = mr.reporter_user_id
         LEFT JOIN users assignee ON assignee.id = mr.assigned_to_user_id
         ORDER BY CASE mr.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, mr.created_at DESC`,
        [], r => r as ModerationReport),
    };
  }

  static createModerationReport(db: Database, user: UserWithRole, req: CreateModerationReportRequest): ModerationReport {
    if (!req.subject_type.trim() || !req.reason.trim()) {
      throw CommandError.badRequest('Tipul și motivul raportării sunt obligatorii');
    }

    db.run(
      `INSERT INTO moderation_reports (reporter_user_id, assigned_to_user_id, subject_type, subject_id, reason, details, status, created_at, updated_at)
       VALUES (?,
               (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name IN ('moderator', 'hr', 'admin') AND u.active = 1 ORDER BY CASE r.name WHEN 'moderator' THEN 0 WHEN 'hr' THEN 1 ELSE 2 END LIMIT 1),
               ?, ?, ?, ?, 'open', datetime('now'), datetime('now'))`,
      [user.id, req.subject_type.trim(), req.subject_id ?? null, req.reason.trim(), req.details ?? null]
    );
    const reportId = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    logAudit(db, user.id, 'REPORT_CREATED', 'moderation_report', reportId,
      JSON.stringify({ subject_type: req.subject_type.trim() }));

    return this.getSingleReport(db, reportId);
  }

  static resolveModerationReport(db: Database, user: UserWithRole, req: ResolveModerationReportRequest): ModerationReport {
    this.ensureModerationAccess(db, user);
    if (!['reviewing', 'resolved', 'dismissed'].includes(req.status)) {
      throw CommandError.badRequest('Status raport invalid');
    }

    db.run(
      `UPDATE moderation_reports SET assigned_to_user_id = ?, status = ?, resolution_notes = ?,
       updated_at = datetime('now'),
       resolved_at = CASE WHEN ? IN ('resolved', 'dismissed') THEN datetime('now') ELSE NULL END
       WHERE id = ?`,
      [user.id, req.status, req.resolution_notes ?? null, req.status, req.report_id]
    );
    logAudit(db, user.id, 'REPORT_REVIEWED', 'moderation_report', req.report_id,
      JSON.stringify({ status: req.status }));

    return this.getSingleReport(db, req.report_id);
  }

  private static ensurePreferences(db: Database, userId: number): UserPreference {
    db.run('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)', [userId]);
    const result = queryOne(db,
      `SELECT user_id, theme, notifications_enabled, tutorial_completed, bio, phone, dashboard_layout, created_at, updated_at
       FROM user_preferences WHERE user_id = ?`,
      [userId],
      (row) => ({
        user_id: row.user_id as number, theme: (row.theme as string) || 'light',
        notifications_enabled: !!(row.notifications_enabled as number),
        tutorial_completed: !!(row.tutorial_completed as number),
        bio: row.bio as string | null, phone: row.phone as string | null,
        dashboard_layout: row.dashboard_layout as string | null,
        created_at: row.created_at as string, updated_at: row.updated_at as string,
      })
    );
    if (!result) throw CommandError.internal('Eroare la încărcarea preferințelor');
    return result;
  }

  private static getNotifications(db: Database, userId: number, limit: number): UserNotification[] {
    return queryRows(db,
      `SELECT id, user_id, kind, title, message, link_page, read, created_at, read_at
       FROM user_notifications WHERE user_id = ? ORDER BY read ASC, created_at DESC LIMIT ?`,
      [userId, limit],
      (row) => ({ ...row, read: !!(row.read as number) } as UserNotification)
    );
  }

  private static getRecentActivity(db: Database, userId: number, limit: number): AuditLog[] {
    return queryRows(db,
      `SELECT id, user_id, action, entity_type, entity_id, details, ip_address, created_at
       FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit], r => r as AuditLog
    );
  }

  private static getGlobalAuditLogs(db: Database, limit: number): AuditLog[] {
    return queryRows(db,
      'SELECT id, user_id, action, entity_type, entity_id, details, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?',
      [limit], r => r as AuditLog
    );
  }

  private static getPersonalProjects(db: Database, user: UserWithRole): PersonalProjectRecord[] {
    return queryRows(db,
      `SELECT p.id as project_id, p.name, p.status, ps.name as stage_name, 'manager' as relationship
       FROM projects p LEFT JOIN project_stages ps ON ps.id = p.stage_id
       WHERE p.manager_id = ? ORDER BY p.updated_at DESC, p.id DESC`,
      [user.id], r => r as PersonalProjectRecord
    );
  }

  private static getSingleReport(db: Database, reportId: number): ModerationReport {
    const result = queryOne(db,
      `SELECT mr.id, mr.reporter_user_id, reporter.full_name as reporter_name,
              mr.assigned_to_user_id, assignee.full_name as assigned_to_name,
              mr.subject_type, mr.subject_id, mr.reason, mr.details, mr.status,
              mr.resolution_notes, mr.created_at, mr.updated_at, mr.resolved_at
       FROM moderation_reports mr
       LEFT JOIN users reporter ON reporter.id = mr.reporter_user_id
       LEFT JOIN users assignee ON assignee.id = mr.assigned_to_user_id
       WHERE mr.id = ?`,
      [reportId], r => r as ModerationReport
    );
    if (!result) throw CommandError.notFound('Raport negăsit');
    return result;
  }

  private static reloadUser(db: Database, userId: number): UserWithRole {
    const result = queryOne(db,
      `SELECT u.id, u.username, u.email, u.full_name, u.role_id,
              r.name as role_name, r.description as role_description,
              u.active, u.last_login, u.custom_pages, u.must_change_password,
              u.created_at, u.updated_at
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
      [userId],
      (row) => ({
        id: row.id as number, username: row.username as string, email: row.email as string,
        password_hash: null, full_name: row.full_name as string, role_id: row.role_id as number,
        role_name: row.role_name as string, role_description: (row.role_description as string) || '',
        active: !!(row.active as number), last_login: row.last_login as string | null,
        custom_pages: row.custom_pages as string | null,
        must_change_password: !!(row.must_change_password as number),
        created_at: row.created_at as string, updated_at: row.updated_at as string,
      })
    );
    if (!result) throw CommandError.notFound('Utilizator negăsit');
    return result;
  }

  private static ensureModerationAccess(db: Database, user: UserWithRole): void {
    const perms = getRolePermissions(db, user.role_id);
    if (!perms.some(p => ['all', 'manage_alerts', 'manage_reports'].includes(p))) {
      throw CommandError.forbidden('Acces refuzat');
    }
  }
}
