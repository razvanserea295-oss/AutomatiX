import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { logAuditEvent } from '../db/auditLogs';

export interface SharedFile {
  id: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string | null;
  data: string | null;
  uploaded_by: number;
  uploaded_by_name: string;
  created_at: string;
  description?: string | null;
  folder_id: number | null;
}

export interface CreateSharedFileRequest {
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path?: string | null;
  data?: string | null;
  description?: string | null;
  folder_id?: number | null;
}

export interface SharedFolder {
  id: number;
  name: string;
  parent_id: number | null;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

function getUserName(db: Database, userId: number): string {
  try {
    const stmt = db.prepare('SELECT full_name FROM users WHERE id = ?');
    stmt.bind([userId]);
    const result = stmt.step() ? String(stmt.getAsObject().full_name ?? 'Unknown') : 'Unknown';
    stmt.free();
    return result;
  } catch {
    return 'Unknown';
  }
}

export class SharedStoragePool {
  static create(db: Database, userId: number, name: string, req: CreateSharedFileRequest): SharedFile {
    if (!req.filename || !req.mime_type) {
      throw CommandError.badRequest('Numele fișierului și tipul MIME sunt obligatorii');
    }
    if (!Number.isFinite(req.size_bytes) || req.size_bytes <= 0) {
      throw CommandError.badRequest('Dimensiunea fișierului trebuie să fie un număr pozitiv');
    }

    db.run(
      `INSERT INTO shared_storage_pool (filename, mime_type, size_bytes, storage_path, data, uploaded_by, description, folder_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.filename, req.mime_type, req.size_bytes, req.storage_path ?? null, req.data ?? null, userId, req.description ?? null, req.folder_id ?? null]
    );
    
    // Get the last inserted row id
    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const id = Number(idStmt.getAsObject().id);
    idStmt.free();
    
    logAuditEvent(db, userId, 'UPLOAD_SHARED_FILE', 'shared_file', id, `Uploaded: ${req.filename}`);
    
    return this.getById(db, id)!;
  }

  static getById(db: Database, id: number): SharedFile | null {
    const stmt = db.prepare(
      `SELECT id, filename, mime_type, size_bytes, storage_path, data, uploaded_by,
              description, created_at, folder_id FROM shared_storage_pool WHERE id = ?`
    );
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); return null; }
    const row = stmt.getAsObject();
    stmt.free();

    return {
      id: Number(row.id),
      filename: String(row.filename),
      mime_type: String(row.mime_type),
      size_bytes: Number(row.size_bytes),
      storage_path: row.storage_path != null ? String(row.storage_path) : null,
      data: row.data != null ? String(row.data) : null,
      uploaded_by: Number(row.uploaded_by),
      uploaded_by_name: getUserName(db, Number(row.uploaded_by)),
      created_at: String(row.created_at),
      description: row.description != null ? String(row.description) : null,
      folder_id: row.folder_id != null ? Number(row.folder_id) : null,
    };
  }

  static list(db: Database, folderId: number | null = null): SharedFile[] {
    const results: SharedFile[] = [];
    const stmt = db.prepare(
      folderId == null
        ? `SELECT id, filename, mime_type, size_bytes, storage_path, data, uploaded_by,
                  description, created_at, folder_id FROM shared_storage_pool
             WHERE folder_id IS NULL ORDER BY created_at DESC`
        : `SELECT id, filename, mime_type, size_bytes, storage_path, data, uploaded_by,
                  description, created_at, folder_id FROM shared_storage_pool
             WHERE folder_id = ? ORDER BY created_at DESC`
    );
    if (folderId != null) stmt.bind([folderId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: Number(row.id),
        filename: String(row.filename),
        mime_type: String(row.mime_type),
        size_bytes: Number(row.size_bytes),
        storage_path: row.storage_path != null ? String(row.storage_path) : null,
        data: row.data != null ? String(row.data) : null,
        uploaded_by: Number(row.uploaded_by),
        uploaded_by_name: getUserName(db, Number(row.uploaded_by)),
        created_at: String(row.created_at),
        description: row.description != null ? String(row.description) : null,
        folder_id: row.folder_id != null ? Number(row.folder_id) : null,
      });
    }
    stmt.free();
    return results;
  }

  static delete(db: Database, userId: number, id: number): boolean {
    const file = this.getById(db, id);
    if (!file) throw CommandError.notFound('Fișier negăsit');

    db.run('DELETE FROM shared_storage_pool WHERE id = ?', [id]);
    logAuditEvent(db, userId, 'DELETE_SHARED_FILE', 'shared_file', id, `Deleted: ${file.filename}`);
    return true;
  }
}

export class SharedFolders {
  static list(db: Database, parentId: number | null = null): SharedFolder[] {
    const results: SharedFolder[] = [];
    const stmt = db.prepare(
      parentId == null
        ? `SELECT id, name, parent_id, created_by, created_at FROM shared_folders
             WHERE parent_id IS NULL ORDER BY name COLLATE NOCASE ASC`
        : `SELECT id, name, parent_id, created_by, created_at FROM shared_folders
             WHERE parent_id = ? ORDER BY name COLLATE NOCASE ASC`
    );
    if (parentId != null) stmt.bind([parentId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: Number(row.id),
        name: String(row.name),
        parent_id: row.parent_id != null ? Number(row.parent_id) : null,
        created_by: Number(row.created_by),
        created_by_name: getUserName(db, Number(row.created_by)),
        created_at: String(row.created_at),
      });
    }
    stmt.free();
    return results;
  }

  static getById(db: Database, id: number): SharedFolder | null {
    const stmt = db.prepare(
      `SELECT id, name, parent_id, created_by, created_at FROM shared_folders WHERE id = ?`
    );
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); return null; }
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: Number(row.id),
      name: String(row.name),
      parent_id: row.parent_id != null ? Number(row.parent_id) : null,
      created_by: Number(row.created_by),
      created_by_name: getUserName(db, Number(row.created_by)),
      created_at: String(row.created_at),
    };
  }

  static create(db: Database, userId: number, name: string, parentId: number | null): SharedFolder {
    const clean = (name || '').trim();
    if (!clean) throw CommandError.badRequest('Numele folderului este obligatoriu');
    if (clean.length > 120) throw CommandError.badRequest('Numele folderului este prea lung');
    if (parentId != null && !this.getById(db, parentId)) {
      throw CommandError.notFound('Folderul părinte nu există');
    }
    db.run(
      `INSERT INTO shared_folders (name, parent_id, created_by) VALUES (?, ?, ?)`,
      [clean, parentId ?? null, userId]
    );
    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const id = Number(idStmt.getAsObject().id);
    idStmt.free();
    logAuditEvent(db, userId, 'CREATE_SHARED_FOLDER', 'shared_folder', id, `Created folder: ${clean}`);
    return this.getById(db, id)!;
  }

  // A folder is deletable only when it holds no sub-folders and no files.
  static isEmpty(db: Database, id: number): boolean {
    const count = (table: string, col: string): number => {
      const s = db.prepare(`SELECT COUNT(*) as n FROM ${table} WHERE ${col} = ?`);
      s.bind([id]);
      s.step();
      const n = Number(s.getAsObject().n);
      s.free();
      return n;
    };
    return count('shared_folders', 'parent_id') === 0 && count('shared_storage_pool', 'folder_id') === 0;
  }

  static delete(db: Database, userId: number, id: number): boolean {
    const folder = this.getById(db, id);
    if (!folder) throw CommandError.notFound('Folder negăsit');
    if (!this.isEmpty(db, id)) {
      throw CommandError.badRequest('Folderul nu este gol — șterge mai întâi conținutul');
    }
    db.run('DELETE FROM shared_folders WHERE id = ?', [id]);
    logAuditEvent(db, userId, 'DELETE_SHARED_FOLDER', 'shared_folder', id, `Deleted folder: ${folder.name}`);
    return true;
  }
}