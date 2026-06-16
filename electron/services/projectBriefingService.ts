


























import fs from 'fs';
import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr, validateId, validateDate, validateEnum } from '../middleware/validate';
import type { UserWithRole } from './authService';
import { NotificationsService } from './notificationsService';
import { logAuditEvent } from '../db/auditLogs';

export type BriefingStatus =
  | 'draft' | 'sent' | 'acknowledged' | 'clarification_requested'
  | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export type BriefingPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ProjectBriefing {
  id: number;
  title: string;
  project_id: number | null;
  project_name: string | null;
  created_by_user_id: number;
  created_by_name: string;
  assigned_to_user_id: number;
  assigned_to_name: string;
  scope: string | null;
  technical_requirements: string | null;
  client_expectations: string | null;
  deadline: string | null;
  priority: BriefingPriority;
  attachments_json: string | null;
  status: BriefingStatus;
  rejection_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  open_clarifications: number;
}

export interface Clarification {
  id: number;
  briefing_id: number;
  asked_by_user_id: number;
  asked_by_name: string;
  question: string;
  asked_at: string;
  answered_by_user_id: number | null;
  answered_by_name: string | null;
  answer: string | null;
  answered_at: string | null;
  status: 'pending' | 'answered';
}

const BRIEFING_SELECT = `
  SELECT b.id, b.title, b.project_id, p.name AS project_name,
         b.created_by_user_id, uc.full_name AS created_by_name,
         b.assigned_to_user_id, ua.full_name AS assigned_to_name,
         b.scope, b.technical_requirements, b.client_expectations,
         b.deadline, b.priority, b.attachments_json,
         b.status, b.rejection_reason, b.completed_at,
         b.created_at, b.updated_at,
         (SELECT COUNT(*) FROM briefing_clarifications c
            WHERE c.briefing_id = b.id AND c.status = 'pending') AS open_clarifications
    FROM project_briefings b
    JOIN users uc ON uc.id = b.created_by_user_id
    JOIN users ua ON ua.id = b.assigned_to_user_id
    LEFT JOIN projects p ON p.id = b.project_id`;

function mapBriefing(r: any): ProjectBriefing {
  return {
    id: r.id as number,
    title: r.title as string,
    project_id: (r.project_id as number | null) ?? null,
    project_name: (r.project_name as string | null) ?? null,
    created_by_user_id: r.created_by_user_id as number,
    created_by_name: r.created_by_name as string,
    assigned_to_user_id: r.assigned_to_user_id as number,
    assigned_to_name: r.assigned_to_name as string,
    scope: (r.scope as string | null) ?? null,
    technical_requirements: (r.technical_requirements as string | null) ?? null,
    client_expectations: (r.client_expectations as string | null) ?? null,
    deadline: (r.deadline as string | null) ?? null,
    priority: ((r.priority as string) || 'medium') as BriefingPriority,
    attachments_json: (r.attachments_json as string | null) ?? null,
    status: ((r.status as string) || 'sent') as BriefingStatus,
    rejection_reason: (r.rejection_reason as string | null) ?? null,
    completed_at: (r.completed_at as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    open_clarifications: (r.open_clarifications as number) || 0,
  };
}

function mapClar(r: any): Clarification {
  return {
    id: r.id as number,
    briefing_id: r.briefing_id as number,
    asked_by_user_id: r.asked_by_user_id as number,
    asked_by_name: r.asked_by_name as string,
    question: r.question as string,
    asked_at: r.asked_at as string,
    answered_by_user_id: (r.answered_by_user_id as number | null) ?? null,
    answered_by_name: (r.answered_by_name as string | null) ?? null,
    answer: (r.answer as string | null) ?? null,
    answered_at: (r.answered_at as string | null) ?? null,
    status: ((r.status as string) || 'pending') as 'pending' | 'answered',
  };
}

export class ProjectBriefingService {
  static list(
    db: Database,
    user: UserWithRole,
    mode: 'inbox' | 'sent' | 'all' = 'inbox',
    statusFilter?: BriefingStatus,
  ): ProjectBriefing[] {
    const where: string[] = [];
    const params: any[] = [];
    if (mode === 'inbox') {
      where.push('b.assigned_to_user_id = ?');
      params.push(user.id);
      where.push("b.status != 'draft'");
    } else if (mode === 'sent') {
      where.push('b.created_by_user_id = ?');
      params.push(user.id);
    } else {
      where.push("(b.status != 'draft' OR b.created_by_user_id = ?)");
      params.push(user.id);
    }
    if (statusFilter) {
      where.push('b.status = ?');
      params.push(statusFilter);
    }
    const sql = `${BRIEFING_SELECT} WHERE ${where.join(' AND ')}
      ORDER BY
        CASE b.priority
          WHEN 'critical' THEN 0
          WHEN 'high'     THEN 1
          WHEN 'medium'   THEN 2
          ELSE 3 END,
        b.deadline IS NULL,
        b.deadline,
        b.created_at DESC`;
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const out: ProjectBriefing[] = [];
    while (stmt.step()) out.push(mapBriefing(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  static get(db: Database, _user: UserWithRole, id: number): ProjectBriefing {
    const stmt = db.prepare(`${BRIEFING_SELECT} WHERE b.id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Briefing inexistent'); }
    const row = mapBriefing(stmt.getAsObject());
    stmt.free();
    return row;
  }

  
  
  
  
  

  static listAttachments(db: Database, briefingId: number): Array<{
    id: number; briefing_id: number; filename: string | null; mime: string | null;
    size: number; annotation: string | null; created_by_user_id: number | null;
    created_by_name: string | null; created_at: string;
  }> {
    const stmt = db.prepare(
      `SELECT ba.id, ba.briefing_id, ba.filename, ba.mime,
              COALESCE(ba.size_bytes, LENGTH(ba.data)) AS size,
              ba.annotation, ba.created_by_user_id, u.full_name AS created_by_name, ba.created_at
       FROM briefing_attachments ba
       LEFT JOIN users u ON u.id = ba.created_by_user_id
       WHERE ba.briefing_id = ?
       ORDER BY ba.created_at DESC, ba.id DESC`,
    );
    stmt.bind([briefingId]);
    const out: Array<{
      id: number; briefing_id: number; filename: string | null; mime: string | null;
      size: number; annotation: string | null; created_by_user_id: number | null;
      created_by_name: string | null; created_at: string;
    }> = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      out.push({
        id: r.id as number,
        briefing_id: r.briefing_id as number,
        filename: (r.filename as string | null) ?? null,
        mime: (r.mime as string | null) ?? null,
        size: (r.size as number) ?? 0,
        annotation: (r.annotation as string | null) ?? null,
        created_by_user_id: (r.created_by_user_id as number | null) ?? null,
        created_by_name: (r.created_by_name as string | null) ?? null,
        created_at: r.created_at as string,
      });
    }
    stmt.free();
    return out;
  }

  static addAttachment(db: Database, user: UserWithRole, req: {
    briefing_id: number; filename?: string | null; mime?: string | null;
    data: string; annotation?: string | null;
  }): { id: number } {
    const briefingId = validateId(req.briefing_id, 'briefing_id', true)!;
    
    this.get(db, user, briefingId);
    if (!req.data || typeof req.data !== 'string') throw CommandError.badRequest('Fișier lipsă');
    
    const MAX_CHARS = 50 * 1024 * 1024;
    if (req.data.length > MAX_CHARS) throw CommandError.badRequest('Fișier prea mare');
    const annotation = capStr(req.annotation, 2_000, 'annotation');
    db.run(
      `INSERT INTO briefing_attachments (briefing_id, filename, mime, data, annotation, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [briefingId, req.filename ?? null, req.mime ?? null, req.data, annotation ?? null, user.id],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid() AS id');
    idStmt.step();
    const id = idStmt.getAsObject().id as number;
    idStmt.free();
    logAuditEvent(db, user.id, 'BRIEFING_ATTACHMENT_ADD', 'briefing_attachment', id,
      `briefing ${briefingId} · ${req.filename ?? 'fără nume'}`);
    return { id };
  }

  





  static addDiskAttachment(db: Database, user: UserWithRole, req: {
    briefing_id: number; filename?: string | null; mime?: string | null;
    storage_path: string; size_bytes: number; annotation?: string | null;
  }): { id: number } {
    const briefingId = validateId(req.briefing_id, 'briefing_id', true)!;
    this.get(db, user, briefingId); 
    if (!req.storage_path) throw CommandError.badRequest('storage_path lipsă');
    const annotation = capStr(req.annotation, 2_000, 'annotation');
    
    
    db.run(
      `INSERT INTO briefing_attachments (briefing_id, filename, mime, data, storage_path, size_bytes, annotation, created_by_user_id)
       VALUES (?, ?, ?, '', ?, ?, ?, ?)`,
      [briefingId, req.filename ?? null, req.mime ?? null, req.storage_path, req.size_bytes, annotation ?? null, user.id],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid() AS id');
    idStmt.step();
    const id = idStmt.getAsObject().id as number;
    idStmt.free();
    logAuditEvent(db, user.id, 'BRIEFING_ATTACHMENT_ADD', 'briefing_attachment', id,
      `briefing ${briefingId} · ${req.filename ?? 'fără nume'} · disc ${req.size_bytes}B`);
    return { id };
  }

  

  static getAttachmentMeta(db: Database, attachmentId: number): {
    id: number; filename: string | null; mime: string | null;
    storage_path: string | null; data: string | null;
  } {
    const stmt = db.prepare('SELECT id, filename, mime, storage_path, data FROM briefing_attachments WHERE id = ?');
    stmt.bind([attachmentId]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Fișier negăsit'); }
    const r = stmt.getAsObject();
    stmt.free();
    return {
      id: r.id as number,
      filename: (r.filename as string | null) ?? null,
      mime: (r.mime as string | null) ?? null,
      storage_path: (r.storage_path as string | null) ?? null,
      data: (r.data as string | null) ?? null,
    };
  }

  static getAttachment(db: Database, attachmentId: number): {
    id: number; filename: string | null; mime: string | null; base64: string;
  } {
    const stmt = db.prepare('SELECT id, filename, mime, data FROM briefing_attachments WHERE id = ?');
    stmt.bind([attachmentId]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Fișier negăsit'); }
    const r = stmt.getAsObject();
    stmt.free();
    return {
      id: r.id as number,
      filename: (r.filename as string | null) ?? null,
      mime: (r.mime as string | null) ?? null,
      base64: r.data as string,
    };
  }

  static updateAttachmentNote(db: Database, _user: UserWithRole, attachmentId: number, annotation: string | null): void {
    const note = capStr(annotation, 2_000, 'annotation');
    db.run('UPDATE briefing_attachments SET annotation = ? WHERE id = ?', [note ?? null, attachmentId]);
  }

  static deleteAttachment(db: Database, user: UserWithRole, attachmentId: number): void {
    
    const stmt = db.prepare(
      `SELECT ba.created_by_user_id AS file_owner, b.created_by_user_id AS briefing_owner, ba.storage_path
       FROM briefing_attachments ba
       JOIN project_briefings b ON b.id = ba.briefing_id
       WHERE ba.id = ?`,
    );
    stmt.bind([attachmentId]);
    if (!stmt.step()) { stmt.free(); return; }
    const r = stmt.getAsObject();
    stmt.free();
    const isAdmin = (user.role_name || '').toLowerCase() === 'admin';
    if (!isAdmin && user.id !== (r.file_owner as number | null) && user.id !== (r.briefing_owner as number | null)) {
      throw CommandError.forbidden('Nu poți șterge acest fișier');
    }
    db.run('DELETE FROM briefing_attachments WHERE id = ?', [attachmentId]);
    
    const storagePath = (r.storage_path as string | null) ?? null;
    if (storagePath) {
      try { fs.unlinkSync(storagePath); } catch {  }
    }
    logAuditEvent(db, user.id, 'BRIEFING_ATTACHMENT_DELETE', 'briefing_attachment', attachmentId);
  }

  static create(
    db: Database,
    user: UserWithRole,
    req: {
      title: string;
      project_id?: number | null;
      assigned_to_user_id: number;
      scope?: string | null;
      technical_requirements?: string | null;
      client_expectations?: string | null;
      deadline?: string | null;
      priority?: BriefingPriority;
      attachments?: any;
      status?: 'draft' | 'sent';
    },
  ): ProjectBriefing {
    if (!req.assigned_to_user_id) throw CommandError.badRequest('Trebuie să selectezi un proiectant');
    const v = {
      title: capStr(req.title, 250, 'title', { required: true })!,
      project_id: validateId(req.project_id, 'project_id'),
      assigned_to_user_id: validateId(req.assigned_to_user_id, 'assigned_to_user_id', true)!,
      scope: capStr(req.scope, 50_000, 'scope'),
      technical_requirements: capStr(req.technical_requirements, 50_000, 'technical_requirements'),
      client_expectations: capStr(req.client_expectations, 50_000, 'client_expectations'),
      deadline: validateDate(req.deadline, 'deadline'),
      priority: validateEnum(req.priority, ['low', 'medium', 'high', 'critical'] as const, 'medium', 'priority')!,
    };

    
    
    
    let attachmentsJson: string | null = null;
    if (req.attachments) {
      attachmentsJson = JSON.stringify(req.attachments);
      if (attachmentsJson.length > 10 * 1024 * 1024 * 1024) {
        throw CommandError.badRequest('Atașamentele depășesc limita de 10 GB');
      }
    }

    const initialStatus = (req.status === 'draft') ? 'draft' : 'sent';
    db.run(
      `INSERT INTO project_briefings
       (title, project_id, created_by_user_id, assigned_to_user_id,
        scope, technical_requirements, client_expectations,
        deadline, priority, attachments_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        v.title,
        v.project_id,
        user.id,
        v.assigned_to_user_id,
        v.scope,
        v.technical_requirements,
        v.client_expectations,
        v.deadline,
        v.priority,
        attachmentsJson,
        initialStatus,
      ],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const newId = idStmt.get()[0] as number;
    idStmt.free();
    const created = this.get(db, user, newId);
    
    
    if (created.status === 'sent') {
      NotificationsService.notify(db, {
        userId: created.assigned_to_user_id,
        kind: 'briefing_received',
        title: `Briefing nou de la ${user.full_name || user.username}`,
        message: `${created.title}${created.project_name ? ` · ${created.project_name}` : ''}${created.deadline ? ` · termen ${created.deadline}` : ''}`,
        linkPage: 'briefings',
      });
    }
    return created;
  }

  static update(
    db: Database,
    user: UserWithRole,
    req: { id: number } & Partial<{
      title: string;
      project_id: number | null;
      assigned_to_user_id: number;
      scope: string | null;
      technical_requirements: string | null;
      client_expectations: string | null;
      deadline: string | null;
      priority: BriefingPriority;
      attachments: any;
    }>,
  ): ProjectBriefing {
    const existing = this.get(db, user, req.id);
    const isAdmin = (user.role_name || '').toLowerCase() === 'admin';
    if (!isAdmin && existing.created_by_user_id !== user.id) {
      throw CommandError.forbidden('Doar autorul sau adminul poate edita briefing-ul');
    }
    const locked = !['draft', 'sent'].includes(existing.status);
    if (locked) {
      throw CommandError.badRequest('Briefing-ul nu mai poate fi editat (status: ' + existing.status + ')');
    }

    const sets: string[] = [];
    const params: any[] = [];
    const setField = (col: string, val: any) => { sets.push(`${col} = ?`); params.push(val); };

    if (req.title !== undefined)                  setField('title', String(req.title).trim());
    if (req.project_id !== undefined)             setField('project_id', req.project_id);
    if (req.assigned_to_user_id !== undefined)    setField('assigned_to_user_id', req.assigned_to_user_id);
    if (req.scope !== undefined)                  setField('scope', req.scope);
    if (req.technical_requirements !== undefined) setField('technical_requirements', req.technical_requirements);
    if (req.client_expectations !== undefined)    setField('client_expectations', req.client_expectations);
    if (req.deadline !== undefined)               setField('deadline', req.deadline);
    if (req.priority !== undefined)               setField('priority', req.priority);
    if (req.attachments !== undefined)            setField('attachments_json', req.attachments ? JSON.stringify(req.attachments) : null);

    if (sets.length === 0) return existing;
    sets.push("updated_at = datetime('now')");
    params.push(req.id);
    db.run(`UPDATE project_briefings SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.get(db, user, req.id);
  }

  static updateStatus(
    db: Database,
    user: UserWithRole,
    req: { id: number; status: BriefingStatus; rejection_reason?: string | null },
  ): ProjectBriefing {
    const existing = this.get(db, user, req.id);
    const isAdmin = (user.role_name || '').toLowerCase() === 'admin';
    const isAuthor = existing.created_by_user_id === user.id;
    const isAssignee = existing.assigned_to_user_id === user.id;

    const next = req.status;
    let allowed = false;
    if (next === 'sent'         && existing.status === 'draft' && (isAuthor || isAdmin)) allowed = true;
    if (next === 'acknowledged' && existing.status === 'sent'  && (isAssignee || isAdmin)) allowed = true;
    if (next === 'accepted'     && ['sent', 'acknowledged', 'clarification_requested'].includes(existing.status) && (isAssignee || isAdmin)) allowed = true;
    if (next === 'rejected'     && ['sent', 'acknowledged', 'clarification_requested'].includes(existing.status) && (isAssignee || isAdmin)) allowed = true;
    if (next === 'completed'    && existing.status === 'accepted' && (isAssignee || isAdmin)) allowed = true;
    if (next === 'cancelled'    && (isAuthor || isAdmin)) allowed = true;
    if (!allowed) {
      throw CommandError.forbidden(`Tranziție nepermisă (${existing.status} → ${next})`);
    }

    const sets: string[] = ['status = ?', "updated_at = datetime('now')"];
    const params: any[] = [next];
    if (next === 'rejected') {
      sets.push('rejection_reason = ?');
      params.push(req.rejection_reason || null);
    }
    if (next === 'completed') {
      sets.push("completed_at = datetime('now')");
    }
    params.push(req.id);
    db.run(`UPDATE project_briefings SET ${sets.join(', ')} WHERE id = ?`, params);
    const updated = this.get(db, user, req.id);

    
    
    
    
    const actorName = user.full_name || user.username;
    if (next === 'sent' && existing.status === 'draft') {
      NotificationsService.notify(db, {
        userId: updated.assigned_to_user_id,
        kind: 'briefing_received',
        title: `Briefing nou de la ${actorName}`,
        message: `${updated.title}${updated.project_name ? ` · ${updated.project_name}` : ''}${updated.deadline ? ` · termen ${updated.deadline}` : ''}`,
        linkPage: 'briefings',
      });
    } else if (next === 'accepted') {
      NotificationsService.notify(db, {
        userId: updated.created_by_user_id,
        kind: 'briefing_accepted',
        title: `${actorName} a acceptat briefing-ul`,
        message: updated.title,
        linkPage: 'briefings',
      });
    } else if (next === 'rejected') {
      NotificationsService.notify(db, {
        userId: updated.created_by_user_id,
        kind: 'briefing_rejected',
        title: `${actorName} a respins briefing-ul`,
        message: `${updated.title}${updated.rejection_reason ? ` — ${updated.rejection_reason}` : ''}`,
        linkPage: 'briefings',
      });
    } else if (next === 'completed') {
      NotificationsService.notify(db, {
        userId: updated.created_by_user_id,
        kind: 'briefing_completed',
        title: `${actorName} a finalizat briefing-ul`,
        message: updated.title,
        linkPage: 'briefings',
      });
    } else if (next === 'cancelled') {
      
      
      const target = user.id === updated.created_by_user_id
        ? updated.assigned_to_user_id
        : updated.created_by_user_id;
      NotificationsService.notify(db, {
        userId: target,
        kind: 'briefing_cancelled',
        title: `${actorName} a anulat briefing-ul`,
        message: updated.title,
        linkPage: 'briefings',
      });
    }

    return updated;
  }

  












  static delete(db: Database, user: UserWithRole, id: number): void {
    if (!Number.isFinite(id) || id <= 0) {
      throw CommandError.badRequest('id briefing invalid');
    }
    const existing = this.get(db, user, id);
    const isAdmin = (user.role_name || '').toLowerCase() === 'admin';
    if (!isAdmin && existing.created_by_user_id !== user.id) {
      throw CommandError.forbidden('Doar autorul sau adminul poate șterge briefing-ul');
    }
    
    db.run('DELETE FROM briefing_clarifications WHERE briefing_id = ?', [id]);
    db.run('DELETE FROM project_briefings WHERE id = ?', [id]);
  }

  
  
  

  static listClarifications(db: Database, _user: UserWithRole, briefingId: number): Clarification[] {
    const stmt = db.prepare(`
      SELECT c.id, c.briefing_id,
             c.asked_by_user_id, ua.full_name AS asked_by_name, c.question, c.asked_at,
             c.answered_by_user_id, uan.full_name AS answered_by_name, c.answer, c.answered_at,
             c.status
        FROM briefing_clarifications c
        JOIN users ua ON ua.id = c.asked_by_user_id
        LEFT JOIN users uan ON uan.id = c.answered_by_user_id
       WHERE c.briefing_id = ?
       ORDER BY c.asked_at ASC`);
    stmt.bind([briefingId]);
    const out: Clarification[] = [];
    while (stmt.step()) out.push(mapClar(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  static askClarification(
    db: Database,
    user: UserWithRole,
    req: { briefing_id: number; question: string },
  ): Clarification {
    const q = capStr(req.question, 5_000, 'question', { required: true })!;
    const briefing = this.get(db, user, req.briefing_id);
    db.run(
      `INSERT INTO briefing_clarifications (briefing_id, asked_by_user_id, question)
       VALUES (?, ?, ?)`,
      [req.briefing_id, user.id, q],
    );
    db.run(
      `UPDATE project_briefings SET status = 'clarification_requested', updated_at = datetime('now')
         WHERE id = ? AND status IN ('sent','acknowledged')`,
      [req.briefing_id],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const newId = idStmt.get()[0] as number;
    idStmt.free();

    
    
    
    NotificationsService.notify(db, {
      userId: briefing.created_by_user_id,
      kind: 'briefing_clarification_asked',
      title: `${user.full_name || user.username} a pus o întrebare`,
      message: `${briefing.title} — "${q.slice(0, 140)}${q.length > 140 ? '…' : ''}"`,
      linkPage: 'briefings',
    });

    return this.getClarification(db, newId);
  }

  static answerClarification(
    db: Database,
    user: UserWithRole,
    req: { id: number; answer: string },
  ): Clarification {
    const a = capStr(req.answer, 10_000, 'answer', { required: true })!;
    const existing = this.getClarification(db, req.id);
    db.run(
      `UPDATE briefing_clarifications
          SET answer = ?, answered_by_user_id = ?, answered_at = datetime('now'),
              status = 'answered', updated_at = datetime('now')
        WHERE id = ?`,
      [a, user.id, req.id],
    );
    const pendingStmt = db.prepare(
      'SELECT COUNT(*) FROM briefing_clarifications WHERE briefing_id = ? AND status = \'pending\'',
    );
    pendingStmt.bind([existing.briefing_id]);
    pendingStmt.step();
    const pendingCount = pendingStmt.get()[0] as number;
    pendingStmt.free();
    if (pendingCount === 0) {
      db.run(
        `UPDATE project_briefings SET status = 'sent', updated_at = datetime('now')
           WHERE id = ? AND status = 'clarification_requested'`,
        [existing.briefing_id],
      );
    }

    
    
    const titleStmt = db.prepare('SELECT title FROM project_briefings WHERE id = ?');
    titleStmt.bind([existing.briefing_id]);
    const briefingTitle = titleStmt.step() ? (titleStmt.get()[0] as string) : '';
    titleStmt.free();

    
    
    if (existing.asked_by_user_id !== user.id) {
      NotificationsService.notify(db, {
        userId: existing.asked_by_user_id,
        kind: 'briefing_clarification_answered',
        title: `${user.full_name || user.username} a răspuns la întrebare`,
        message: `${briefingTitle} — "${a.slice(0, 140)}${a.length > 140 ? '…' : ''}"`,
        linkPage: 'briefings',
      });
    }

    return this.getClarification(db, req.id);
  }

  static reopenClarification(db: Database, _user: UserWithRole, id: number): Clarification {
    const existing = this.getClarification(db, id);
    if (existing.status !== 'answered') return existing;
    db.run(
      `UPDATE briefing_clarifications
          SET status = 'pending', answer = NULL, answered_by_user_id = NULL, answered_at = NULL,
              updated_at = datetime('now')
        WHERE id = ?`,
      [id],
    );
    db.run(
      `UPDATE project_briefings SET status = 'clarification_requested', updated_at = datetime('now')
         WHERE id = ?`,
      [existing.briefing_id],
    );
    return this.getClarification(db, id);
  }

  private static getClarification(db: Database, id: number): Clarification {
    const stmt = db.prepare(`
      SELECT c.id, c.briefing_id,
             c.asked_by_user_id, ua.full_name AS asked_by_name, c.question, c.asked_at,
             c.answered_by_user_id, uan.full_name AS answered_by_name, c.answer, c.answered_at,
             c.status
        FROM briefing_clarifications c
        JOIN users ua ON ua.id = c.asked_by_user_id
        LEFT JOIN users uan ON uan.id = c.answered_by_user_id
       WHERE c.id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Clarificare inexistentă'); }
    const row = mapClar(stmt.getAsObject());
    stmt.free();
    return row;
  }
}
