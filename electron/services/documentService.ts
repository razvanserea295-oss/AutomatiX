import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr } from '../middleware/validate';
import type { UserWithRole } from './authService';
import path from 'path';
import fs from 'fs';


let app: any = undefined;
try {
  const _e = require('electron');
  if (_e && typeof _e === 'object') { app = _e.app; }
} catch {  }
import { queryOne } from '../db/sqlHelpers';
import { userHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';





export interface DocumentWithDetails {
  id: number;
  project_id: number | null;
  project_name: string | null;
  category_id: number;
  category_name: string;
  name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  original_name: string;
  version: string;
  uploaded_by: number;
  uploaded_by_name: string;
  uploaded_at: string;
  updated_at: string;
  is_private: boolean;
  

  source?: 'document' | 'contract';
}

export interface DocumentCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface CreateDocumentRequest {
  project_id?: number | null;
  category_id: number;
  name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  original_name: string;
  version?: string | null;
  
  file_data?: string | null;
  file_mime?: string | null;
  
  is_private?: boolean;
}

export interface UpdateDocumentRequest {
  id: number;
  name?: string | null;
  category_id?: number | null;
  version?: string | null;
  is_private?: boolean | null;
}

export interface CreateDocumentCategoryRequest {
  name: string;
  description?: string | null;
}

export interface UpdateDocumentCategoryRequest {
  id: number;
  name: string;
  description?: string | null;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
function canManageDocuments(db: Database, user: UserWithRole): boolean {
  return userHasAny(db, user, ['all', 'manage_documents', 'edit_documents'],
    ['documents']);
}

function logAudit(db: Database, user: UserWithRole, action: string, entityType: string, entityId: number | null, details: string | null): void {
  logAuditEvent(db, user.id, action, entityType, entityId, details);
}

const DOC_SQL = `SELECT d.id, d.project_id, p.name as project_name, d.category_id, c.name as category_name,
       d.name, d.file_type, d.file_size, d.file_path, d.original_name, d.version,
       d.uploaded_by, u.full_name as uploaded_by_name, d.uploaded_at, d.updated_at,
       d.is_private
FROM documents d LEFT JOIN projects p ON d.project_id = p.id
JOIN document_categories c ON d.category_id = c.id JOIN users u ON d.uploaded_by = u.id`;

function mapDocRow(row: any): DocumentWithDetails {
  return {
    id: row.id as number,
    project_id: row.project_id == null ? null : (row.project_id as number),
    project_name: row.project_name == null ? null : (row.project_name as string),
    category_id: row.category_id as number, category_name: row.category_name as string,
    name: row.name as string, file_type: row.file_type as string, file_size: row.file_size as number,
    file_path: row.file_path as string, original_name: row.original_name as string,
    version: row.version as string, uploaded_by: row.uploaded_by as number,
    uploaded_by_name: row.uploaded_by_name as string, uploaded_at: row.uploaded_at as string,
    updated_at: row.updated_at as string,
    is_private: ((row.is_private as number) || 0) === 1,
  };
}











function privacyFilter(user: UserWithRole): { sql: string; params: any[] } {
  const role = (user.role_name || '').toLowerCase();
  if (role === 'admin' || role === 'manager') {
    return { sql: '', params: [] };
  }
  return {
    sql: '(d.is_private = 0 OR d.uploaded_by = ?)',
    params: [user.id],
  };
}





export class DocumentService {
  static getAll(db: Database, user: UserWithRole): DocumentWithDetails[] {
    const { sql, params } = privacyFilter(user);
    const where = sql ? ` WHERE ${sql}` : '';
    return queryRows(db, `${DOC_SQL}${where} ORDER BY d.uploaded_at DESC`, params, mapDocRow);
  }

  static getByProject(db: Database, user: UserWithRole, projectId: number): DocumentWithDetails[] {
    const { sql, params } = privacyFilter(user);
    const extra = sql ? ` AND ${sql}` : '';
    const docs = queryRows(db,
      `${DOC_SQL} WHERE d.project_id = ?${extra} ORDER BY d.uploaded_at DESC`,
      [projectId, ...params],
      mapDocRow,
    );
    
    
    
    return [...docs, ...this.getContractAttachmentDocs(db, projectId)];
  }

  

  private static getContractAttachmentDocs(db: Database, projectId: number): DocumentWithDetails[] {
    const ext = (name: string | null): string => {
      const e = (name || '').split('.').pop() || '';
      return e && e.length <= 5 ? e.toLowerCase() : 'file';
    };
    return queryRows(db,
      `SELECT ca.id, ca.filename, ca.mime, LENGTH(ca.data) AS size,
              ca.created_at, u.full_name AS uploaded_by_name, ca.created_by_user_id,
              c.project_id AS project_id, c.contract_code AS contract_code
       FROM contract_attachments ca
       JOIN contracts c ON c.id = ca.contract_id
       LEFT JOIN users u ON u.id = ca.created_by_user_id
       WHERE c.project_id = ?
       ORDER BY ca.created_at DESC, ca.id DESC`,
      [projectId],
      (r): DocumentWithDetails => ({
        id: r.id as number,
        project_id: (r.project_id as number | null) ?? projectId,
        project_name: null,
        category_id: 0,
        category_name: `Contract ${(r.contract_code as string | null) ?? ''}`.trim(),
        name: (r.filename as string | null) ?? 'fișier contract',
        file_type: ext(r.filename as string | null),
        file_size: (r.size as number) ?? 0,
        file_path: '',
        original_name: (r.filename as string | null) ?? 'fișier contract',
        version: '1',
        uploaded_by: (r.created_by_user_id as number | null) ?? 0,
        uploaded_by_name: (r.uploaded_by_name as string | null) ?? '—',
        uploaded_at: r.created_at as string,
        updated_at: r.created_at as string,
        is_private: false,
        source: 'contract',
      }),
    );
  }

  static getById(db: Database, user: UserWithRole, id: number): DocumentWithDetails {
    const result = queryOne(db, `${DOC_SQL} WHERE d.id = ?`, [id], mapDocRow);
    if (!result) throw CommandError.notFound('Document negăsit');
    
    
    if (result.is_private) {
      const role = (user.role_name || '').toLowerCase();
      const isAdminMgr = role === 'admin' || role === 'manager';
      if (!isAdminMgr && result.uploaded_by !== user.id) {
        throw CommandError.forbidden('Document privat — nu ai acces');
      }
    }
    return result;
  }

  





  static getFileData(db: Database, id: number): { data: string | null; mime: string | null; filename: string; size: number } {
    const stmt = db.prepare(
      `SELECT file_data, file_mime, original_name, file_size FROM documents WHERE id = ?`,
    );
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Document negăsit');
    }
    const r = stmt.getAsObject() as any;
    stmt.free();
    return {
      data: (r.file_data as string | null) ?? null,
      mime: (r.file_mime as string | null) ?? null,
      filename: (r.original_name as string) || `document-${id}`,
      size: (r.file_size as number) || 0,
    };
  }

  static create(db: Database, req: CreateDocumentRequest, user: UserWithRole): DocumentWithDetails {
    
    
    
    if (!canManageDocuments(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (!req.name.trim()) throw CommandError.badRequest('Numele documentului este obligatoriu');
    if (req.category_id <= 0) throw CommandError.badRequest('Categorie invalidă');

    
    
    const safeFilePath = String(req.file_path || '').replace(/\\/g, '/');
    if (!safeFilePath || safeFilePath.includes('..') || safeFilePath.includes('/') || safeFilePath.startsWith('.')) {
      throw CommandError.badRequest('Cale fișier invalidă (un singur segment, fără `..` sau `/`)');
    }

    
    
    const projectId = req.project_id != null && Number(req.project_id) > 0
      ? Number(req.project_id)
      : null;

    
    
    
    
    
    const fileData = capStr(req.file_data, 10 * 1024 * 1024 * 1024, 'file_data', { trim: false });

    const isPrivate = req.is_private ? 1 : 0;
    db.run(
      `INSERT INTO documents (project_id, category_id, name, file_type, file_size, file_path, original_name, version, uploaded_by, file_data, file_mime, is_private)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId, req.category_id, req.name, req.file_type, req.file_size,
        safeFilePath, req.original_name, req.version || '1.0', user.id,
        fileData, req.file_mime ?? null, isPrivate,
      ],
    );
    const docId = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    logAudit(db, user, 'UPLOAD', 'document', docId,
      JSON.stringify({ name: req.name, project_id: projectId, size: req.file_size, is_private: !!isPrivate }));
    return this.getById(db, user, docId);
  }

  static update(db: Database, req: UpdateDocumentRequest, user: UserWithRole): DocumentWithDetails {
    
    if (!canManageDocuments(db, user)) throw CommandError.forbidden('Acces refuzat');
    const existing = this.getById(db, user, req.id);
    const name = req.name ?? existing.name;
    const categoryId = req.category_id ?? existing.category_id;
    const version = req.version ?? existing.version;
    
    
    
    const role = (user.role_name || '').toLowerCase();
    const canTogglePrivate = role === 'admin' || role === 'manager' || existing.uploaded_by === user.id;
    const isPrivate = (req.is_private != null && canTogglePrivate) ? (req.is_private ? 1 : 0) : (existing.is_private ? 1 : 0);

    db.run(
      "UPDATE documents SET name = ?, category_id = ?, version = ?, is_private = ?, updated_at = datetime('now') WHERE id = ?",
      [name, categoryId, version, isPrivate, req.id]
    );
    logAudit(db, user, 'UPDATE', 'document', req.id, JSON.stringify({ name, is_private: !!isPrivate }));
    return this.getById(db, user, req.id);
  }

  static delete(db: Database, id: number, user: UserWithRole): void {
    
    
    if (!canManageDocuments(db, user)) throw CommandError.forbidden('Acces refuzat');
    const doc = this.getById(db, user, id);
    const docsDir = this.getDocumentsDir();
    
    
    const fullPath = path.resolve(docsDir, doc.file_path);
    if (fullPath.startsWith(path.resolve(docsDir) + path.sep) && fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch {  }
    }
    db.run('DELETE FROM documents WHERE id = ?', [id]);
    logAudit(db, user, 'DELETE', 'document', id, null);
  }

  static getCategories(db: Database): DocumentCategory[] {
    return queryRows(db, 'SELECT id, name, description FROM document_categories ORDER BY sort_order, name', [],
      (row) => ({ id: row.id as number, name: row.name as string, description: row.description as string | null }));
  }

  static updateCategoriesOrder(db: Database, user: UserWithRole, ids: number[]): void {
    if (!canManageDocuments(db, user)) throw CommandError.forbidden('Acces refuzat');
    ids.forEach((id, idx) => {
      db.run('UPDATE document_categories SET sort_order = ? WHERE id = ?', [idx, id]);
    });
  }

  static createCategory(db: Database, req: CreateDocumentCategoryRequest, user: UserWithRole): DocumentCategory {
    if (!canManageDocuments(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (!req.name.trim()) throw CommandError.badRequest('Numele categoriei este obligatoriu');

    db.run('INSERT INTO document_categories (name, description) VALUES (?, ?)',
      [req.name.trim(), req.description?.trim() ?? null]);
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;

    const result = queryOne(db, 'SELECT id, name, description FROM document_categories WHERE id = ?', [id],
      (row) => ({ id: row.id as number, name: row.name as string, description: row.description as string | null }));
    if (!result) throw CommandError.internal('Eroare la creare categorie');
    return result;
  }

  static updateCategory(db: Database, req: UpdateDocumentCategoryRequest, user: UserWithRole): DocumentCategory {
    if (!canManageDocuments(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (!req.name.trim()) throw CommandError.badRequest('Numele categoriei este obligatoriu');

    db.run('UPDATE document_categories SET name = ?, description = ? WHERE id = ?',
      [req.name.trim(), req.description?.trim() ?? null, req.id]);

    const result = queryOne(db, 'SELECT id, name, description FROM document_categories WHERE id = ?', [req.id],
      (row) => ({ id: row.id as number, name: row.name as string, description: row.description as string | null }));
    if (!result) throw CommandError.notFound('Categorie negăsită');
    return result;
  }

  static getFilePath(db: Database, user: UserWithRole, id: number): string {
    const doc = this.getById(db, user, id);
    return path.join(this.getDocumentsDir(), doc.file_path);
  }

  private static getDocumentsDir(): string {
    try {
      
      
      
      
      const docsDir = app
        ? path.join(app.getPath('userData'), 'documents')
        : path.join(process.cwd(), 'data', 'documents');
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
      return docsDir;
    } catch {
      return './documents';
    }
  }
}
