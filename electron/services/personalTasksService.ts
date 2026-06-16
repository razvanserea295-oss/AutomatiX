



import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr, validateId, validateEnum } from '../middleware/validate';
import type { UserWithRole } from './authService';

export interface PersonalTask {
  id: number;
  user_id: number;
  user_name: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  notes: string | null;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'normal' | 'high';
  due_date: string | null;
  project_id: number | null;
  project_name: string | null;
  source_type: string | null;
  source_id: number | null;
  assigned_by_user_id: number | null;
  assigned_by_name: string | null;
  completed_at: string | null;
  completed_by_user_id: number | null;
  completed_by_name: string | null;
  completion_note: string | null;
  completion_status: 'resolved' | 'unresolved' | 'needs_clarification' | null;
  




  clarification_pending: boolean;
  created_at: string;
  updated_at: string;
}

export interface Mention {
  id: number;
  mentioned_user_id: number;
  actor_user_id: number;
  actor_name: string | null;
  source_type: string;
  source_id: number;
  snippet: string;
  is_read: boolean;
  created_at: string;
}

function rowsAll(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

function rowToTask(r: any): PersonalTask {
  return {
    id: r.id as number,
    user_id: r.user_id as number,
    user_name: (r.user_name as string | null) ?? null,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    instructions: (r.instructions as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    status: r.status as PersonalTask['status'],
    priority: r.priority as PersonalTask['priority'],
    due_date: (r.due_date as string | null) ?? null,
    project_id: (r.project_id as number | null) ?? null,
    project_name: (r.project_name as string | null) ?? null,
    source_type: (r.source_type as string | null) ?? null,
    source_id: (r.source_id as number | null) ?? null,
    assigned_by_user_id: (r.assigned_by_user_id as number | null) ?? null,
    assigned_by_name: (r.assigned_by_name as string | null) ?? null,
    completed_at: (r.completed_at as string | null) ?? null,
    completed_by_user_id: (r.completed_by_user_id as number | null) ?? null,
    completed_by_name: (r.completed_by_name as string | null) ?? null,
    completion_note: (r.completion_note as string | null) ?? null,
    completion_status: (r.completion_status as PersonalTask['completion_status']) ?? null,
    clarification_pending: ((r.clarification_pending as number | null) || 0) === 1,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

const TASK_SQL = `
  SELECT t.id, t.user_id, u.full_name AS user_name,
         t.title, t.description, t.instructions, t.notes, t.status, t.priority,
         t.due_date, t.project_id, p.name AS project_name,
         t.source_type, t.source_id,
         t.assigned_by_user_id, ab.full_name AS assigned_by_name,
         t.completed_at, t.completed_by_user_id, cb.full_name AS completed_by_name,
         t.completion_note, t.completion_status, t.clarification_pending,
         t.created_at, t.updated_at
  FROM personal_tasks t
  LEFT JOIN users u ON u.id = t.user_id
  LEFT JOIN users ab ON ab.id = t.assigned_by_user_id
  LEFT JOIN users cb ON cb.id = t.completed_by_user_id
  LEFT JOIN projects p ON p.id = t.project_id
`;

export class PersonalTasksService {
  static list(db: Database, user: UserWithRole, includeDone = false): PersonalTask[] {
    const where = includeDone
      ? 'WHERE t.user_id = ?'
      : "WHERE t.user_id = ? AND t.status NOT IN ('done', 'cancelled')";
    return rowsAll(db, `${TASK_SQL} ${where} ORDER BY
      CASE t.priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      t.due_date IS NULL, t.due_date, t.created_at DESC`, [user.id]).map(rowToTask);
  }

  static create(db: Database, user: UserWithRole, req: {
    title: string; description?: string;
    instructions?: string | null;
    notes?: string | null;
    priority?: 'low' | 'normal' | 'high';
    due_date?: string | null;
    project_id?: number | null;
    source_type?: string | null;
    source_id?: number | null;
  }): PersonalTask {
    if (!req.title?.trim()) throw CommandError.badRequest('Titlul taskului este obligatoriu');
    
    
    
    
    
    
    
    const validated = {
      title: capStr(req.title, 500, 'titlu', { required: true })!,
      description: capStr(req.description, 10_000, 'descriere'),
      instructions: capStr(req.instructions, 50_000, 'instrucțiuni'),
      notes: capStr(req.notes, 10_000, 'note'),
      priority: validateEnum(req.priority, ['low', 'normal', 'high'] as const, 'normal', 'priority')!,
      due_date: capStr(req.due_date, 32, 'due_date'),
      project_id: validateId(req.project_id, 'project_id'),
      source_type: capStr(req.source_type, 64, 'source_type'),
      source_id: validateId(req.source_id, 'source_id'),
    };
    db.run(
      `INSERT INTO personal_tasks (user_id, title, description, instructions, notes, priority, due_date, project_id, source_type, source_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, validated.title, validated.description,
       validated.instructions, validated.notes,
       validated.priority,
       validated.due_date, validated.project_id, validated.source_type, validated.source_id],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();
    return this.list(db, user, true).find(t => t.id === id)!;
  }

  static update(db: Database, user: UserWithRole, req: {
    id: number; title?: string; description?: string | null;
    instructions?: string | null;
    notes?: string | null;
    status?: 'open' | 'in_progress' | 'done' | 'cancelled';
    priority?: 'low' | 'normal' | 'high'; due_date?: string | null;
    completion_note?: string | null;
    completion_status?: 'resolved' | 'unresolved' | 'needs_clarification' | null;
  }): PersonalTask {
    
    
    const before = this.getRawById(db, req.id);
    if (!before) throw CommandError.notFound('Task inexistent');
    
    const isOwner = before.user_id === user.id;
    const isDelegator = before.assigned_by_user_id === user.id;
    if (!isOwner && !isDelegator) {
      throw CommandError.forbidden('Nu poți modifica acest task');
    }

    const isCompletingNow =
      req.status === 'done' && before.status !== 'done';

    db.run(
      `UPDATE personal_tasks SET
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         instructions = COALESCE(?, instructions),
         notes = COALESCE(?, notes),
         status = COALESCE(?, status),
         priority = COALESCE(?, priority),
         due_date = COALESCE(?, due_date),
         completion_note = COALESCE(?, completion_note),
         completion_status = COALESCE(?, completion_status),
         completed_at = CASE
           WHEN ? = 'done' AND completed_at IS NULL THEN datetime('now')
           WHEN ? IS NOT NULL AND ? != 'done' THEN NULL
           ELSE completed_at
         END,
         completed_by_user_id = CASE
           WHEN ? = 'done' AND completed_by_user_id IS NULL THEN ?
           WHEN ? IS NOT NULL AND ? != 'done' THEN NULL
           ELSE completed_by_user_id
         END,
         clarification_pending = CASE
           WHEN ? = 'done' THEN 0
           ELSE clarification_pending
         END,
         updated_at = datetime('now')
       WHERE id = ? AND (user_id = ? OR assigned_by_user_id = ?)`,
      [
        req.title ?? null, req.description ?? null,
        req.instructions ?? null, req.notes ?? null,
        req.status ?? null,
        req.priority ?? null, req.due_date ?? null,
        req.completion_note ?? null, req.completion_status ?? null,
        
        req.status ?? null,
        req.status ?? null, req.status ?? null,
        
        req.status ?? null, user.id,
        req.status ?? null, req.status ?? null,
        
        req.status ?? null,
        
        req.id, user.id, user.id,
      ],
    );

    
    
    if (isCompletingNow && before.assigned_by_user_id && before.assigned_by_user_id !== user.id) {
      try {
        const statusLabel =
          req.completion_status === 'unresolved' ? ' — marcat NEREZOLVAT' :
          req.completion_status === 'needs_clarification' ? ' — necesită clarificări' : '';
        db.run(
          `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
           VALUES (?, 'task_completed', ?, ?, 'tasks', datetime('now'))`,
          [
            before.assigned_by_user_id,
            `Task finalizat de ${user.full_name || user.username}${statusLabel}`,
            (before.title as string).slice(0, 200) + (req.completion_note ? ` · "${req.completion_note.slice(0, 100)}"` : ''),
          ],
        );
      } catch {  }
      
      try {
        const snippet = `Task "${before.title}" — ${
          req.completion_status === 'unresolved' ? 'marcat NEREZOLVAT'
          : req.completion_status === 'needs_clarification' ? 'necesită clarificări'
          : 'finalizat'
        }${req.completion_note ? `: ${req.completion_note}` : ''}`;
        db.run(
          `INSERT INTO mentions (mentioned_user_id, actor_user_id, source_type, source_id, snippet)
           VALUES (?, ?, 'personal_task', ?, ?)`,
          [before.assigned_by_user_id, user.id, before.id, snippet.slice(0, 200)],
        );
      } catch {  }
    }

    return this.list(db, user, true).find(t => t.id === req.id)
        ?? this.listAssignedByMe(db, user, true).find(t => t.id === req.id)!;
  }

  





  static requestClarification(db: Database, user: UserWithRole, req: {
    id: number; question: string;
  }): PersonalTask {
    const before = this.getRawById(db, req.id);
    if (!before) throw CommandError.notFound('Task inexistent');
    if (before.user_id !== user.id) {
      throw CommandError.forbidden('Doar utilizatorul căruia i-a fost asignat task-ul poate cere clarificări');
    }
    const text = (req.question || '').trim();
    if (!text) throw CommandError.badRequest('Scrie ce vrei să clarifici');

    
    
    
    const stamp = `[${new Date().toISOString().slice(0, 16).replace('T', ' ')} - clarificare cerută de ${user.full_name || user.username}]`;
    db.run(
      `UPDATE personal_tasks SET
         notes = COALESCE(notes, '') || CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE char(10) || char(10) END
                || ? || char(10) || ?,
         clarification_pending = 1,
         updated_at = datetime('now')
       WHERE id = ?`,
      [stamp, text, req.id],
    );

    if (before.assigned_by_user_id) {
      try {
        db.run(
          `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
           VALUES (?, 'task_clarification', ?, ?, 'tasks', datetime('now'))`,
          [
            before.assigned_by_user_id,
            `Clarificare cerută de ${user.full_name || user.username}`,
            (before.title as string).slice(0, 100) + ` · "${text.slice(0, 120)}"`,
          ],
        );
      } catch {  }
      try {
        db.run(
          `INSERT INTO mentions (mentioned_user_id, actor_user_id, source_type, source_id, snippet)
           VALUES (?, ?, 'personal_task', ?, ?)`,
          [
            before.assigned_by_user_id, user.id, before.id,
            `Clarificare cerută la "${before.title}": ${text.slice(0, 200)}`,
          ],
        );
      } catch {  }
    }
    return this.getById(db, user, req.id);
  }

  





  static reopen(db: Database, user: UserWithRole, req: {
    id: number; response_note: string; reassign_to_user_id?: number | null;
  }): PersonalTask {
    const before = this.getRawById(db, req.id);
    if (!before) throw CommandError.notFound('Task inexistent');
    if (before.assigned_by_user_id !== user.id) {
      const role = (user.role_name || '').toLowerCase();
      if (role !== 'admin' && role !== 'manager') {
        throw CommandError.forbidden('Doar delegatorul poate redeschide task-ul');
      }
    }
    const note = (req.response_note || '').trim();
    const stamp = `[${new Date().toISOString().slice(0, 16).replace('T', ' ')} - răspuns de ${user.full_name || user.username}]`;
    const newAssignee = req.reassign_to_user_id || before.user_id;

    db.run(
      `UPDATE personal_tasks SET
         status = 'open',
         user_id = ?,
         completion_note = NULL,
         completion_status = NULL,
         completed_at = NULL,
         completed_by_user_id = NULL,
         clarification_pending = 0,
         notes = COALESCE(notes, '') || CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE char(10) || char(10) END
                 || ? || ${note ? "char(10) || ?" : "''"},
         updated_at = datetime('now')
       WHERE id = ?`,
      note ? [newAssignee, stamp, note, req.id] : [newAssignee, stamp, req.id],
    );

    
    try {
      db.run(
        `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
         VALUES (?, 'task_reopened', ?, ?, 'tasks', datetime('now'))`,
        [
          newAssignee,
          `Task redeschis de ${user.full_name || user.username}`,
          (before.title as string).slice(0, 100) + (note ? ` · "${note.slice(0, 100)}"` : ''),
        ],
      );
    } catch {  }
    try {
      db.run(
        `INSERT INTO mentions (mentioned_user_id, actor_user_id, source_type, source_id, snippet)
         VALUES (?, ?, 'personal_task', ?, ?)`,
        [
          newAssignee, user.id, before.id,
          (req.reassign_to_user_id ? 'Re-asignat ' : 'Trimis înapoi: ') + `"${before.title}"${note ? ` — ${note.slice(0, 200)}` : ''}`,
        ],
      );
    } catch {  }

    return this.getById(db, user, req.id);
  }

  



  private static getRawById(db: Database, id: number): {
    id: number; user_id: number; title: string; status: string;
    assigned_by_user_id: number | null;
  } | null {
    const stmt = db.prepare(
      `SELECT id, user_id, title, status, assigned_by_user_id
       FROM personal_tasks WHERE id = ?`,
    );
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); return null; }
    const r = stmt.getAsObject() as any;
    stmt.free();
    return {
      id: r.id, user_id: r.user_id, title: r.title, status: r.status,
      assigned_by_user_id: r.assigned_by_user_id ?? null,
    };
  }

  static delete(db: Database, user: UserWithRole, id: number): void {
    
    db.run('DELETE FROM personal_tasks WHERE id = ? AND (user_id = ? OR assigned_by_user_id = ?)',
      [id, user.id, user.id]);
  }

  



  static assignTo(db: Database, manager: UserWithRole, req: {
    target_user_id: number;
    title: string;
    description?: string;
    instructions?: string | null;
    notes?: string | null;
    priority?: 'low' | 'normal' | 'high';
    due_date?: string | null;
    project_id?: number | null;
  }): PersonalTask {
    
    
    
    
    if (!req.target_user_id) throw CommandError.badRequest('Selectează utilizatorul');
    if (!req.title?.trim()) throw CommandError.badRequest('Titlul este obligatoriu');

    db.run(
      `INSERT INTO personal_tasks (
        user_id, title, description, instructions, notes, priority, due_date, project_id, assigned_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.target_user_id, req.title.trim(), req.description ?? null,
       req.instructions ?? null, req.notes ?? null,
       req.priority || 'normal', req.due_date ?? null, req.project_id ?? null, manager.id],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    
    try {
      db.run(
        `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
         VALUES (?, 'task_assigned', ?, ?, 'tasks', datetime('now'))`,
        [req.target_user_id,
         `Task nou de la ${manager.full_name || manager.username}`,
         req.title.trim().slice(0, 200)],
      );
    } catch {  }

    
    
    
    
    
    if (req.target_user_id !== manager.id) {
      try {
        const snippet = req.title.trim().length > 200
          ? req.title.trim().slice(0, 197) + '…'
          : req.title.trim();
        db.run(
          `INSERT INTO mentions (mentioned_user_id, actor_user_id, source_type, source_id, snippet)
           VALUES (?, ?, 'personal_task', ?, ?)`,
          [req.target_user_id, manager.id, id, snippet],
        );
      } catch {  }
    }

    const stmt = db.prepare(`${TASK_SQL} WHERE t.id = ?`);
    stmt.bind([id]);
    stmt.step();
    const r = stmt.getAsObject();
    stmt.free();
    return rowToTask(r);
  }

  




  private static canDelegate(_user: UserWithRole): boolean {
    return true;
  }

  




  static getById(db: Database, user: UserWithRole, id: number): PersonalTask {
    const stmt = db.prepare(`${TASK_SQL} WHERE t.id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Task inexistent');
    }
    const task = rowToTask(stmt.getAsObject());
    stmt.free();
    const role = (user.role_name || '').toLowerCase();
    const isPrivileged = role === 'admin' || role === 'manager';
    if (!isPrivileged && task.user_id !== user.id && task.assigned_by_user_id !== user.id) {
      throw CommandError.forbidden('Nu ai acces la acest task');
    }
    return task;
  }

  






  static sweepDeadlineNotifications(db: Database): { sent: number } {
    let sent = 0;
    
    const approaching = rowsAll(db, `
      SELECT t.id, t.user_id, t.title, t.due_date,
             u.full_name as assignee_name
      FROM personal_tasks t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.status NOT IN ('done','cancelled')
        AND t.due_date IS NOT NULL
        AND julianday(t.due_date) - julianday(date('now')) BETWEEN 0 AND 1
        AND NOT EXISTS (
          SELECT 1 FROM user_notifications n
          WHERE n.user_id = t.user_id
            AND n.kind = 'task_due_soon'
            AND n.message LIKE '%task#' || t.id || '%'
        )
    `);
    for (const r of approaching) {
      try {
        db.run(
          `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
           VALUES (?, 'task_due_soon', ?, ?, 'tasks', datetime('now'))`,
          [r.user_id, 'Deadline aproape',
           `task#${r.id}: "${(r.title as string).slice(0, 100)}" — termen ${r.due_date}`],
        );
        sent++;
      } catch {  }
    }
    
    const overdue = rowsAll(db, `
      SELECT t.id, t.user_id, t.title, t.due_date
      FROM personal_tasks t
      WHERE t.status NOT IN ('done','cancelled')
        AND t.due_date IS NOT NULL
        AND julianday(date('now')) > julianday(t.due_date)
        AND NOT EXISTS (
          SELECT 1 FROM user_notifications n
          WHERE n.user_id = t.user_id
            AND n.kind = 'task_overdue'
            AND n.message LIKE '%task#' || t.id || '%'
        )
    `);
    for (const r of overdue) {
      try {
        db.run(
          `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
           VALUES (?, 'task_overdue', ?, ?, 'tasks', datetime('now'))`,
          [r.user_id, 'Task întârziat',
           `task#${r.id}: "${(r.title as string).slice(0, 100)}" — termen depășit (${r.due_date})`],
        );
        sent++;
      } catch {  }
    }
    return { sent };
  }

  





  static listAssignableUsers(
    db: Database, _user: UserWithRole,
  ): Array<{ id: number; full_name: string; username: string }> {
    
    
    
    return rowsAll(db,
      `SELECT id, full_name, username FROM users WHERE active = 1 ORDER BY full_name`,
    ).map(r => ({
      id: r.id as number,
      full_name: r.full_name as string,
      username: r.username as string,
    }));
  }

  



  static listAssignedByMe(db: Database, user: UserWithRole, includeDone = false): PersonalTask[] {
    const where = includeDone
      ? 'WHERE t.assigned_by_user_id = ? AND t.user_id != ?'
      : "WHERE t.assigned_by_user_id = ? AND t.user_id != ? AND t.status NOT IN ('done','cancelled')";
    const stmt = db.prepare(`${TASK_SQL} ${where} ORDER BY t.created_at DESC`);
    stmt.bind([user.id, user.id]);
    const out: PersonalTask[] = [];
    while (stmt.step()) out.push(rowToTask(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  
  
  

  



  static extractMentions(db: Database, body: string): Array<{ user_id: number; username: string }> {
    const matches = body.match(/@([a-zA-Z0-9_.-]+)/g);
    if (!matches) return [];
    const usernames = Array.from(new Set(matches.map(m => m.slice(1).toLowerCase())));
    if (usernames.length === 0) return [];
    const placeholders = usernames.map(() => '?').join(',');
    return rowsAll(db,
      `SELECT id, username FROM users WHERE LOWER(username) IN (${placeholders})`,
      usernames).map(r => ({ user_id: r.id as number, username: r.username as string }));
  }

  static recordMentions(db: Database, actor: UserWithRole, body: string, source: { type: string; id: number }): number {
    const mentioned = this.extractMentions(db, body);
    let count = 0;
    for (const m of mentioned) {
      if (m.user_id === actor.id) continue;  
      const snippet = body.length > 200 ? body.slice(0, 197) + '…' : body;
      db.run(
        `INSERT INTO mentions (mentioned_user_id, actor_user_id, source_type, source_id, snippet)
         VALUES (?, ?, ?, ?, ?)`,
        [m.user_id, actor.id, source.type, source.id, snippet],
      );
      count++;
    }
    return count;
  }

  static listMentions(db: Database, user: UserWithRole, onlyUnread = false): Mention[] {
    const where = onlyUnread
      ? 'WHERE m.mentioned_user_id = ? AND m.is_read = 0'
      : 'WHERE m.mentioned_user_id = ?';
    return rowsAll(db, `
      SELECT m.id, m.mentioned_user_id, m.actor_user_id, u.full_name AS actor_name,
             m.source_type, m.source_id, m.snippet, m.is_read, m.created_at
      FROM mentions m LEFT JOIN users u ON u.id = m.actor_user_id
      ${where} ORDER BY m.created_at DESC LIMIT 100
    `, [user.id]).map(r => ({
      id: r.id as number,
      mentioned_user_id: r.mentioned_user_id as number,
      actor_user_id: r.actor_user_id as number,
      actor_name: (r.actor_name as string | null) ?? null,
      source_type: r.source_type as string,
      source_id: r.source_id as number,
      snippet: r.snippet as string,
      is_read: ((r.is_read as number) || 0) === 1,
      created_at: r.created_at as string,
    }));
  }

  static markMentionRead(db: Database, user: UserWithRole, mentionId: number): void {
    db.run('UPDATE mentions SET is_read = 1 WHERE id = ? AND mentioned_user_id = ?', [mentionId, user.id]);
  }

  static markAllMentionsRead(db: Database, user: UserWithRole): void {
    db.run('UPDATE mentions SET is_read = 1 WHERE mentioned_user_id = ? AND is_read = 0', [user.id]);
  }

  static unreadMentionCount(db: Database, user: UserWithRole): number {
    const stmt = db.prepare('SELECT COUNT(*) FROM mentions WHERE mentioned_user_id = ? AND is_read = 0');
    stmt.bind([user.id]);
    let n = 0;
    if (stmt.step()) n = stmt.get()[0] as number;
    stmt.free();
    return n;
  }
}
