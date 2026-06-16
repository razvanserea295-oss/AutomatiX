















import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { NotifierService } from './notifierService';
import { queryOne } from '../db/sqlHelpers';









export function stageOwnerRole(stageId: number): string {
  
  if (stageId === 1) return 'marketer';     
  if (stageId === 2) return 'proiectant';   
  if (stageId === 8) return 'hala';         
  if (stageId === 9) return 'manager';      
  return 'hala';                            
}





function isStrictGate(fromStageId: number | null, toStageId: number): boolean {
  if (fromStageId === null) return false;
  
  if (fromStageId === 1 && toStageId === 2) return true;
  
  if (fromStageId === 2 && (toStageId >= 3 && toStageId <= 19) && toStageId !== 9) return true;
  
  if (fromStageId === 7 && toStageId === 8) return true;
  
  if (toStageId === 9 && fromStageId !== 9) return true;
  return false;
}





export interface ProjectHandoff {
  id: number;
  project_id: number;
  project_name: string;
  from_stage_id: number | null;
  from_stage_name: string | null;
  to_stage_id: number;
  to_stage_name: string;
  from_user_id: number;
  from_user_name: string | null;
  to_role: string;
  to_user_id: number | null;
  to_user_name: string | null;
  status: string;                  
  is_urgent: boolean;
  handoff_notes: string | null;
  ai_summary: string | null;
  rejected_reason: string | null;
  sla_due_at: string;
  escalated_at: string | null;
  accepted_by_user_id: number | null;
  accepted_at: string | null;
  rejected_at: string | null;
  forced_by_user_id: number | null;
  forced_reason: string | null;
  created_at: string;
}

interface CreateHandoffInput {
  project_id: number;
  from_stage_id: number | null;
  to_stage_id: number;
  from_user_id: number;
  to_role: string;
  to_user_id?: number | null;
  is_urgent?: boolean;
  handoff_notes?: string | null;
}





const SELECT_SQL = `
  SELECT
    h.id, h.project_id, p.name as project_name,
    h.from_stage_id, fs.name as from_stage_name,
    h.to_stage_id, ts.name as to_stage_name,
    h.from_user_id, fu.full_name as from_user_name,
    h.to_role, h.to_user_id, tu.full_name as to_user_name,
    h.status, h.is_urgent, h.handoff_notes, h.ai_summary,
    h.rejected_reason, h.sla_due_at, h.escalated_at,
    h.accepted_by_user_id, h.accepted_at,
    h.rejected_at, h.forced_by_user_id, h.forced_reason, h.created_at
  FROM project_handoffs h
  LEFT JOIN projects p ON p.id = h.project_id
  LEFT JOIN project_stages fs ON fs.id = h.from_stage_id
  LEFT JOIN project_stages ts ON ts.id = h.to_stage_id
  LEFT JOIN users fu ON fu.id = h.from_user_id
  LEFT JOIN users tu ON tu.id = h.to_user_id
`;

function rowToHandoff(row: any): ProjectHandoff {
  return {
    id: row.id as number,
    project_id: row.project_id as number,
    project_name: row.project_name as string,
    from_stage_id: row.from_stage_id as number | null,
    from_stage_name: row.from_stage_name as string | null,
    to_stage_id: row.to_stage_id as number,
    to_stage_name: row.to_stage_name as string,
    from_user_id: row.from_user_id as number,
    from_user_name: row.from_user_name as string | null,
    to_role: row.to_role as string,
    to_user_id: row.to_user_id as number | null,
    to_user_name: row.to_user_name as string | null,
    status: row.status as string,
    is_urgent: !!row.is_urgent,
    handoff_notes: row.handoff_notes as string | null,
    ai_summary: row.ai_summary as string | null,
    rejected_reason: row.rejected_reason as string | null,
    sla_due_at: row.sla_due_at as string,
    escalated_at: row.escalated_at as string | null,
    accepted_by_user_id: row.accepted_by_user_id as number | null,
    accepted_at: row.accepted_at as string | null,
    rejected_at: row.rejected_at as string | null,
    forced_by_user_id: row.forced_by_user_id as number | null,
    forced_reason: row.forced_reason as string | null,
    created_at: row.created_at as string,
  };
}

function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const out: T[] = [];
  while (stmt.step()) out.push(mapper(stmt.getAsObject()));
  stmt.free();
  return out;
}




export class HandoffService {
  





  static create(db: Database, input: CreateHandoffInput): ProjectHandoff {
    
    if (isStrictGate(input.from_stage_id, input.to_stage_id)) {
      const pending = queryOne(db,
        "SELECT COUNT(*) as cnt FROM project_handoffs WHERE project_id = ? AND status = 'pending'",
        [input.project_id], r => r.cnt as number);
      if (pending && pending > 0) {
        throw CommandError.conflict('Există deja o predare pendinte pe acest proiect');
      }
    }

    db.run(
      `INSERT INTO project_handoffs
        (project_id, from_stage_id, to_stage_id, from_user_id, to_role, to_user_id,
         is_urgent, handoff_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.project_id, input.from_stage_id, input.to_stage_id, input.from_user_id,
       input.to_role, input.to_user_id ?? null,
       input.is_urgent ? 1 : 0, input.handoff_notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    const result = queryOne(db, `${SELECT_SQL} WHERE h.id = ?`, [id], rowToHandoff);
    if (!result) throw CommandError.internal('Eroare la creare predare');

    
    
    const recipientIds: number[] = [];
    if (result.to_user_id != null) {
      recipientIds.push(result.to_user_id);
    } else {
      const stmt = db.prepare(
        `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
          WHERE u.active = 1 AND LOWER(r.name) = LOWER(?)`
      );
      stmt.bind([result.to_role]);
      while (stmt.step()) recipientIds.push(stmt.get()[0] as number);
      stmt.free();
    }
    for (const uid of recipientIds) {
      try {
        db.run(
          `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
           VALUES (?, 'handoff', ?, ?, ?, datetime('now'))`,
          [uid,
           `Predare nouă: ${result.project_name}`,
           `${result.from_stage_name ?? '—'} → ${result.to_stage_name}${result.is_urgent ? ' [URGENT]' : ''}`,
           'handoffs']
        );
      } catch {  }
    }
    void NotifierService.send(db, {
      to: { userIds: recipientIds },
      subject: `[automatiX] ${result.is_urgent ? '🔥 URGENT — ' : ''}Predare nouă: ${result.project_name}`,
      text:
        `Ai o predare nouă în inbox.\n\n` +
        `Proiect: ${result.project_name}\n` +
        `Etapa: ${result.from_stage_name ?? '—'} → ${result.to_stage_name}\n` +
        `Termen SLA: ${result.sla_due_at}\n\n` +
        `Deschide automatiX → Inbox pentru a accepta sau respinge.`,
    });

    return result;
  }

  

  static hasPendingStrictHandoff(db: Database, projectId: number): boolean {
    const cnt = queryOne(db,
      "SELECT COUNT(*) as cnt FROM project_handoffs WHERE project_id = ? AND status = 'pending'",
      [projectId], r => r.cnt as number);
    return (cnt || 0) > 0;
  }

  
  static isStrictGate = isStrictGate;
  static stageOwnerRole = stageOwnerRole;

  



  static accept(db: Database, user: UserWithRole, handoffId: number): ProjectHandoff {
    const existing = queryOne(db, `${SELECT_SQL} WHERE h.id = ?`, [handoffId], rowToHandoff);
    if (!existing) throw CommandError.notFound('Predare negăsită');
    if (existing.status !== 'pending') {
      throw CommandError.badRequest(`Predarea este deja ${existing.status}`);
    }
    
    const userRole = user.role_name.toLowerCase();
    const isManager = userRole === 'admin' || userRole === 'manager';
    const isAssignee = existing.to_user_id === user.id;
    const isCorrectRole = existing.to_role === userRole;
    if (!isManager && !isAssignee && !isCorrectRole) {
      throw CommandError.forbidden('Doar rolul destinatar poate accepta');
    }

    db.run(
      `UPDATE project_handoffs
       SET status = 'accepted', accepted_by_user_id = ?, accepted_at = datetime('now')
       WHERE id = ?`,
      [user.id, handoffId]
    );
    const result = queryOne(db, `${SELECT_SQL} WHERE h.id = ?`, [handoffId], rowToHandoff);
    if (!result) throw CommandError.internal('Eroare la actualizare');
    return result;
  }

  



  static reject(db: Database, user: UserWithRole, handoffId: number, reason: string): ProjectHandoff {
    if (!reason?.trim()) throw CommandError.badRequest('Motivul este obligatoriu pentru respingere');
    const existing = queryOne(db, `${SELECT_SQL} WHERE h.id = ?`, [handoffId], rowToHandoff);
    if (!existing) throw CommandError.notFound('Predare negăsită');
    if (existing.status !== 'pending') {
      throw CommandError.badRequest(`Predarea este deja ${existing.status}`);
    }
    const userRole = user.role_name.toLowerCase();
    const isManager = userRole === 'admin' || userRole === 'manager';
    const isAssignee = existing.to_user_id === user.id;
    const isCorrectRole = existing.to_role === userRole;
    if (!isManager && !isAssignee && !isCorrectRole) {
      throw CommandError.forbidden('Doar rolul destinatar sau Manager pot respinge');
    }

    db.run(
      `UPDATE project_handoffs
       SET status = 'rejected', rejected_at = datetime('now'), rejected_reason = ?,
           accepted_by_user_id = ?
       WHERE id = ?`,
      [reason.trim(), user.id, handoffId]
    );

    
    if (existing.from_stage_id !== null) {
      db.run(
        "UPDATE projects SET stage_id = ?, updated_at = datetime('now') WHERE id = ?",
        [existing.from_stage_id, existing.project_id]
      );
    }

    const result = queryOne(db, `${SELECT_SQL} WHERE h.id = ?`, [handoffId], rowToHandoff);
    if (!result) throw CommandError.internal('Eroare la actualizare');
    return result;
  }

  



  static force(db: Database, user: UserWithRole, handoffId: number, reason: string): ProjectHandoff {
    const userRole = user.role_name.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'manager') {
      throw CommandError.forbidden('Doar Manager-ul poate forța o tranziție');
    }
    if (!reason?.trim()) throw CommandError.badRequest('Motivul este obligatoriu pentru forțare');
    const existing = queryOne(db, `${SELECT_SQL} WHERE h.id = ?`, [handoffId], rowToHandoff);
    if (!existing) throw CommandError.notFound('Predare negăsită');
    if (existing.status !== 'pending') {
      throw CommandError.badRequest(`Predarea este deja ${existing.status}`);
    }
    db.run(
      `UPDATE project_handoffs
       SET status = 'forced', forced_by_user_id = ?, forced_reason = ?,
           accepted_at = datetime('now')
       WHERE id = ?`,
      [user.id, reason.trim(), handoffId]
    );
    const result = queryOne(db, `${SELECT_SQL} WHERE h.id = ?`, [handoffId], rowToHandoff);
    if (!result) throw CommandError.internal('Eroare la actualizare');
    return result;
  }

  


  static setUrgent(db: Database, user: UserWithRole, handoffId: number, urgent: boolean): ProjectHandoff {
    const userRole = user.role_name.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'manager') {
      throw CommandError.forbidden('Doar Manager-ul poate marca urgent');
    }
    db.run('UPDATE project_handoffs SET is_urgent = ? WHERE id = ?', [urgent ? 1 : 0, handoffId]);
    const result = queryOne(db, `${SELECT_SQL} WHERE h.id = ?`, [handoffId], rowToHandoff);
    if (!result) throw CommandError.notFound('Predare negăsită');
    return result;
  }

  



  static listForUser(db: Database, user: UserWithRole): ProjectHandoff[] {
    const userRole = user.role_name.toLowerCase();
    const isManager = userRole === 'admin' || userRole === 'manager';
    if (isManager) {
      
      return queryRows(db,
        `${SELECT_SQL} WHERE h.status = 'pending'
         ORDER BY h.is_urgent DESC, h.created_at ASC`,
        [], rowToHandoff
      );
    }
    return queryRows(db,
      `${SELECT_SQL} WHERE h.status = 'pending' AND (h.to_role = ? OR h.to_user_id = ?)
       ORDER BY h.is_urgent DESC, h.created_at ASC`,
      [userRole, user.id], rowToHandoff
    );
  }

  
  static listForProject(db: Database, projectId: number): ProjectHandoff[] {
    return queryRows(db,
      `${SELECT_SQL} WHERE h.project_id = ? ORDER BY h.created_at DESC`,
      [projectId], rowToHandoff
    );
  }

  

  static escalateOverdue(db: Database): ProjectHandoff[] {
    const stmt = db.prepare(
      `${SELECT_SQL}
       WHERE h.status = 'pending' AND h.escalated_at IS NULL
         AND datetime(h.sla_due_at) < datetime('now')`
    );
    const overdue: ProjectHandoff[] = [];
    while (stmt.step()) overdue.push(rowToHandoff(stmt.getAsObject()));
    stmt.free();

    for (const h of overdue) {
      db.run(
        "UPDATE project_handoffs SET escalated_at = datetime('now') WHERE id = ?",
        [h.id]
      );
    }
    return overdue;
  }

  
  static getById(db: Database, id: number): ProjectHandoff {
    const result = queryOne(db, `${SELECT_SQL} WHERE h.id = ?`, [id], rowToHandoff);
    if (!result) throw CommandError.notFound('Predare negăsită');
    return result;
  }

  
  static updateAiSummary(db: Database, id: number, summary: string): void {
    db.run('UPDATE project_handoffs SET ai_summary = ? WHERE id = ?', [summary, id]);
  }
}
