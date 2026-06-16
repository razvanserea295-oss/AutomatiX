import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { hashPassword } from '../security/password';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';
import { getRolePermissions } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';





export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role_id: number;
  active?: boolean;
  
  job_title?: string | null;
}

export interface UpdateUserRequest {
  id: number;
  username?: string | null;
  email?: string | null;
  password?: string | null;
  full_name?: string | null;
  role_id?: number | null;
  active?: boolean | null;
  job_title?: string | null;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
function hasPermission(permissions: string[], perm: string): boolean {
  return permissions.includes('all') || permissions.includes(perm);
}

function logAudit(db: Database, userId: number, action: string, entityType: string, entityId: number | null, details: string | null): void {
  logAuditEvent(db, userId, action, entityType, entityId, details);
}

const USER_SQL = `SELECT u.id, u.username, u.email, u.password_hash, u.full_name, u.role_id,
       r.name as role_name, r.description as role_description,
       u.active, u.last_login, u.custom_pages, u.must_change_password,
       u.dashboard_config, u.job_title,
       u.created_at, u.updated_at
FROM users u JOIN roles r ON u.role_id = r.id`;

function mapUserRow(row: any, hidePassword = true): UserWithRole {
  return {
    id: row.id as number, username: row.username as string, email: row.email as string,
    password_hash: hidePassword ? null : row.password_hash as string,
    full_name: row.full_name as string, role_id: row.role_id as number,
    role_name: row.role_name as string, role_description: (row.role_description as string) || '',
    active: !!(row.active as number), last_login: row.last_login as string | null,
    custom_pages: row.custom_pages as string | null,
    must_change_password: !!(row.must_change_password as number),
    dashboard_config: row.dashboard_config as string | null,
    job_title: row.job_title as string | null,
    created_at: row.created_at as string, updated_at: row.updated_at as string,
  };
}





export class UserService {
  static getAll(db: Database, currentUser: UserWithRole): UserWithRole[] {
    const perms = getRolePermissions(db, currentUser.role_id);
    if (!hasPermission(perms, 'view_all') && !hasPermission(perms, 'manage_users')) {
      throw CommandError.forbidden('Acces refuzat');
    }
    return queryRows(db, `${USER_SQL} ORDER BY u.created_at DESC`, [], r => mapUserRow(r));
  }

  static getById(db: Database, id: number, currentUser: UserWithRole): UserWithRole {
    const perms = getRolePermissions(db, currentUser.role_id);
    if (currentUser.id !== id && !hasPermission(perms, 'view_all') && !hasPermission(perms, 'manage_users')) {
      throw CommandError.forbidden('Acces refuzat');
    }
    const result = queryOne(db, `${USER_SQL} WHERE u.id = ?`, [id], r => mapUserRow(r));
    if (!result) throw CommandError.notFound('Utilizator negăsit');
    return result;
  }

  static async create(db: Database, req: CreateUserRequest, currentUser: UserWithRole): Promise<UserWithRole> {
    const perms = getRolePermissions(db, currentUser.role_id);
    if (!hasPermission(perms, 'manage_users')) throw CommandError.forbidden('Acces refuzat');

    this.validateUsername(req.username);
    this.validateEmail(req.email);

    if (!req.password || req.password.length < 8) {
      throw CommandError.badRequest('Parola este obligatorie și trebuie să aibă minim 8 caractere');
    }

    
    const existingUser = queryOne(db, 'SELECT COUNT(*) as cnt FROM users WHERE username = ?', [req.username], r => r.cnt as number);
    if (existingUser && existingUser > 0) throw CommandError.conflict('Utilizator deja existent');

    const existingEmail = queryOne(db, 'SELECT COUNT(*) as cnt FROM users WHERE email = ?', [req.email], r => r.cnt as number);
    if (existingEmail && existingEmail > 0) throw CommandError.conflict('Utilizator deja existent');

    const passwordHash = await hashPassword(req.password);

    
    
    const jobTitle = (req.job_title ?? '').toString().trim().slice(0, 120) || null;
    db.run(
      'INSERT INTO users (username, email, password_hash, full_name, role_id, active, must_change_password, job_title) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
      [req.username, req.email, passwordHash, req.full_name, req.role_id, (req.active ?? true) ? 1 : 0, jobTitle]
    );
    const userId = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    logAudit(db, currentUser.id, 'CREATE', 'user', userId,
      JSON.stringify({ username: req.username, role_id: req.role_id }));
    return this.getById(db, userId, currentUser);
  }

  static async update(db: Database, req: UpdateUserRequest, currentUser: UserWithRole): Promise<UserWithRole> {
    const perms = getRolePermissions(db, currentUser.role_id);
    const isManagingOthers = currentUser.id !== req.id;
    const hasManagePerm = hasPermission(perms, 'manage_users');

    
    
    
    if (!hasManagePerm && isManagingOthers) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const existing = this.getById(db, req.id, currentUser);

    
    
    
    const canEditPrivileged = hasManagePerm;
    const safeUsername = canEditPrivileged ? req.username : undefined;
    const safeRoleId = canEditPrivileged ? req.role_id : undefined;
    const safeActive = canEditPrivileged ? req.active : undefined;

    if (safeUsername) {
      this.validateUsername(safeUsername);
      const taken = queryOne(db, 'SELECT COUNT(*) as cnt FROM users WHERE username = ? AND id != ?', [safeUsername, req.id], r => r.cnt as number);
      if (taken && taken > 0) throw CommandError.conflict('Utilizator deja existent');
    }

    if (req.email) {
      this.validateEmail(req.email);
      const taken = queryOne(db, 'SELECT COUNT(*) as cnt FROM users WHERE email = ? AND id != ?', [req.email, req.id], r => r.cnt as number);
      if (taken && taken > 0) throw CommandError.conflict('Utilizator deja existent');
    }

    const username = safeUsername ?? existing.username;
    const email = req.email ?? existing.email;
    const fullName = req.full_name ?? existing.full_name;
    const roleId = safeRoleId ?? existing.role_id;
    const active = safeActive ?? existing.active;

    
    
    const incomingTitle = (canEditPrivileged && req.job_title !== undefined)
      ? (req.job_title === null ? null : String(req.job_title).trim().slice(0, 120) || null)
      : (existing as any).job_title ?? null;

    
    
    
    
    if (existing.role_name === 'admin' && existing.active) {
      const willLoseAdmin =
        (canEditPrivileged && safeRoleId != null && safeRoleId !== existing.role_id) ||
        (canEditPrivileged && safeActive === false);
      if (willLoseAdmin) {
        const adminCount = queryOne(db,
          "SELECT COUNT(*) as cnt FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin' AND u.active = 1",
          [], r => r.cnt as number) || 0;
        if (adminCount <= 1) {
          throw CommandError.badRequest('Ultimul administrator activ nu poate fi modificat astfel');
        }
      }
    }

    db.run(
      "UPDATE users SET username = ?, email = ?, full_name = ?, role_id = ?, active = ?, job_title = ?, updated_at = datetime('now') WHERE id = ?",
      [username, email, fullName, roleId, active ? 1 : 0, incomingTitle, req.id]
    );

    if (req.password) {
      if (req.password.length < 8) {
        throw CommandError.badRequest('Parola trebuie să aibă minim 8 caractere');
      }
      const passwordHash = await hashPassword(req.password);
      
      db.run(
        "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?",
        [passwordHash, req.id]
      );
    }

    logAudit(db, currentUser.id, 'UPDATE', 'user', req.id, JSON.stringify({ username }));
    return this.getById(db, req.id, currentUser);
  }

  static delete(db: Database, id: number, currentUser: UserWithRole): void {
    const perms = getRolePermissions(db, currentUser.role_id);
    if (!hasPermission(perms, 'manage_users')) throw CommandError.forbidden('Acces refuzat');
    if (currentUser.id === id) throw CommandError.badRequest('Nu vă puteți șterge propriul cont');

    const target = this.getById(db, id, currentUser);
    if (target.role_name === 'admin') {
      const adminCount = queryOne(db,
        "SELECT COUNT(*) as cnt FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin' AND u.active = 1",
        [], r => r.cnt as number) || 0;
      if (target.active && adminCount <= 1) {
        throw CommandError.badRequest('Ultimul administrator activ nu poate fi șters');
      }
    }

    
    
    
    
    
    
    
    
    
    
    
    
    type Fk = { table: string; column: string; nullable: boolean; onDelete: string };
    const fks: Fk[] = [];

    
    const tables: string[] = [];
    {
      const stmt = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> 'users'"
      );
      while (stmt.step()) tables.push(stmt.get()[0] as string);
      stmt.free();
    }

    
    for (const t of tables) {
      
      const fkStmt = db.prepare(`PRAGMA foreign_key_list(${t})`);
      const tableFks: Array<{ from: string; to: string; refTable: string; onDelete: string }> = [];
      while (fkStmt.step()) {
        const row = fkStmt.getAsObject() as any;
        if (String(row.table).toLowerCase() === 'users' && String(row.to).toLowerCase() === 'id') {
          tableFks.push({
            from: row.from as string,
            to: row.to as string,
            refTable: row.table as string,
            onDelete: String(row.on_delete || '').toUpperCase(),
          });
        }
      }
      fkStmt.free();

      if (tableFks.length === 0) continue;

      
      const colStmt = db.prepare(`PRAGMA table_info(${t})`);
      const colMeta: Record<string, { notnull: number }> = {};
      while (colStmt.step()) {
        const r = colStmt.getAsObject() as any;
        colMeta[r.name as string] = { notnull: r.notnull as number };
      }
      colStmt.free();

      for (const fk of tableFks) {
        fks.push({
          table: t,
          column: fk.from,
          nullable: !(colMeta[fk.from]?.notnull),
          onDelete: fk.onDelete,
        });
      }
    }

    
    
    
    
    
    
    
    function hasUniqueOnCol(tbl: string, col: string): boolean {
      try {
        const idxStmt = db.prepare(`PRAGMA index_list("${tbl}")`);
        const uniqueIndexes: string[] = [];
        while (idxStmt.step()) {
          const r = idxStmt.getAsObject() as { name: string; unique: number };
          if (r.unique) uniqueIndexes.push(r.name);
        }
        idxStmt.free();
        for (const ix of uniqueIndexes) {
          const colStmt = db.prepare(`PRAGMA index_info("${ix}")`);
          while (colStmt.step()) {
            const r = colStmt.getAsObject() as { name: string };
            if (String(r.name).toLowerCase() === col.toLowerCase()) {
              colStmt.free();
              return true;
            }
          }
          colStmt.free();
        }
      } catch {  }
      return false;
    }

    
    
    
    
    
    for (const fk of fks) {
      if (fk.onDelete === 'CASCADE' || fk.onDelete === 'SET NULL' || fk.onDelete === 'SET DEFAULT') {
        continue;
      }
      if (hasUniqueOnCol(fk.table, fk.column)) {
        
        
        
        
        db.run(`DELETE FROM "${fk.table}" WHERE "${fk.column}" = ?`, [id]);
        continue;
      }
      if (fk.nullable) {
        db.run(`UPDATE "${fk.table}" SET "${fk.column}" = NULL WHERE "${fk.column}" = ?`, [id]);
      } else {
        db.run(`UPDATE "${fk.table}" SET "${fk.column}" = ? WHERE "${fk.column}" = ?`, [currentUser.id, id]);
      }
    }

    
    
    
    db.run(
      'UPDATE alerts SET acknowledged_by = NULL, acknowledged_at = NULL, acknowledged = 0 WHERE acknowledged_by = ?',
      [id],
    );

    db.run('DELETE FROM users WHERE id = ?', [id]);
    logAudit(db, currentUser.id, 'DELETE', 'user', id,
      JSON.stringify({ deleted_user_id: id, deleted_username: target.username, reassigned_to: currentUser.id }));
  }

  static getRoles(db: Database): Role[] {
    return queryRows(db,
      'SELECT id, name, description, permissions, created_at, updated_at FROM roles ORDER BY id',
      [],
      (row) => ({
        id: row.id as number, name: row.name as string, description: row.description as string,
        permissions: row.permissions as string, created_at: row.created_at as string, updated_at: row.updated_at as string,
      })
    );
  }

  static updateUserPages(db: Database, currentUser: UserWithRole, userId: number, pages: any): void {
    if (currentUser.role_name.toLowerCase() !== 'admin') {
      throw CommandError.forbidden('Doar adminul poate schimba permisiunile');
    }
    const pagesJson = typeof pages === 'string' ? pages : JSON.stringify(pages);
    // Permission changes are a privilege-escalation vector — always audit,
    // capturing the before/after page grants.
    const before = queryOne(db, 'SELECT custom_pages FROM users WHERE id = ?', [userId], r => (r.custom_pages as string | null) ?? null);
    db.run('UPDATE users SET custom_pages = ? WHERE id = ?', [pagesJson, userId]);
    logAudit(db, currentUser.id, 'UPDATE', 'user_permissions', userId,
      JSON.stringify({ before: before ?? null, after: pagesJson }));
  }

  



  static updateUserDashboardConfig(db: Database, currentUser: UserWithRole, userId: number, config: any): void {
    const isAdmin = currentUser.role_name.toLowerCase() === 'admin';
    if (!isAdmin && currentUser.id !== userId) {
      throw CommandError.forbidden('Doar adminul poate schimba dashboardul altui user');
    }
    const json = typeof config === 'string' ? config : JSON.stringify(config);
    db.run('UPDATE users SET dashboard_config = ? WHERE id = ?', [json, userId]);
  }

  private static validateUsername(username: string): void {
    if (username.length < 3) throw CommandError.badRequest('Username trebuie să aibă minim 3 caractere');
    if (username.length > 50) throw CommandError.badRequest('Username trebuie să aibă maxim 50 de caractere');
    if (!/^[a-zA-Z0-9_\-.]+$/.test(username)) {
      throw CommandError.badRequest('Username poate conține doar litere, cifre, _, -, .');
    }
  }

  private static validateEmail(email: string): void {
    if (!email.includes('@') || !email.includes('.')) throw CommandError.badRequest('Email invalid');
    if (email.length > 100) throw CommandError.badRequest('Email prea lung');
  }
}
