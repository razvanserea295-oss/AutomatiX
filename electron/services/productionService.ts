import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { HandoffService } from './handoffService';
import { queryOne } from '../db/sqlHelpers';
import { logAuditEvent } from '../db/auditLogs';


function deriveStatusForStage(stageId: number | null, fallback: string): string {
  if (stageId == null) return fallback;
  if (fallback === 'blocat' || fallback === 'anulat') return fallback;
  switch (stageId) {
    case 1: return 'ofertă';
    case 2: return 'aprobat';
    case 8: return 'livrare';
    case 9: return 'finalizat';
    default: return 'în producție';
  }
}





export interface BoardStage {
  id: number;
  name: string;
  order_index: number;
  description: string | null;
}

export interface BoardProject {
  id: number;
  name: string;
  client_name: string;
  priority: string;
  deadline: string | null;
  estimated_value: number;
  comment_count: number;
  time_entries_count: number;
}

export interface BoardColumn {
  stage: BoardStage;
  projects: BoardProject[];
}

export interface StageTransition {
  id: number;
  project_id: number;
  from_stage_id: number | null;
  from_stage_name: string;
  to_stage_id: number;
  to_stage_name: string;
  user_id: number;
  user_name: string;
  notes: string | null;
  created_at: string;
}

export interface ProjectWithDetails {
  id: number;
  name: string;
  client_id: number;
  client_name: string;
  status: string;
  stage_id: number;
  stage_name: string;
  priority: string;
  manager_id: number;
  manager_name: string;
  description: string | null;
  estimated_value: number;
  estimated_cost: number;
  actual_cost: number;
  deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  operational_flow_json: string | null;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(mapper(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}
function logAudit(db: Database, user: UserWithRole, action: string, entityType: string, entityId: number | null, details: string | null): void {
  logAuditEvent(db, user.id, action, entityType, entityId, details);
}





export class ProductionService {
  static getBoardData(db: Database): BoardColumn[] {
    const stages = this.getAllStages(db);
    return stages.map(stage => ({
      stage,
      projects: this.getProjectsByStage(db, stage.id),
    }));
  }

  static getAllStages(db: Database): BoardStage[] {
    return queryRows(db,
      'SELECT id, name, order_index, description FROM project_stages ORDER BY order_index',
      [],
      (row) => ({
        id: row.id as number,
        name: row.name as string,
        order_index: row.order_index as number,
        description: row.description as string | null,
      })
    );
  }

  private static getProjectsByStage(db: Database, stageId: number): BoardProject[] {
    return queryRows(db,
      `SELECT p.id, p.name, c.name as client_name, p.priority, p.deadline, p.estimated_value,
              (SELECT COUNT(*) FROM project_comments pc WHERE pc.project_id = p.id) as comment_count,
              0 as time_entries_count
       FROM projects p
       JOIN clients c ON p.client_id = c.id
       WHERE p.stage_id = ? AND p.status NOT IN ('finalizat', 'anulat')
       ORDER BY
          CASE p.priority
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
          END,
          p.deadline ASC`,
      [stageId],
      (row) => ({
        id: row.id as number,
        name: row.name as string,
        client_name: row.client_name as string,
        priority: row.priority as string,
        deadline: row.deadline as string | null,
        estimated_value: (row.estimated_value as number) || 0,
        comment_count: (row.comment_count as number) || 0,
        time_entries_count: (row.time_entries_count as number) || 0,
      })
    );
  }

  static moveProjectToStage(
    db: Database,
    projectId: number,
    newStageId: number,
    currentUser: UserWithRole,
    notes: string | null
  ): ProjectWithDetails {
    const currentRow = queryOne(db,
      'SELECT stage_id FROM projects WHERE id = ?',
      [projectId],
      (row) => row.stage_id as number
    );
    if (currentRow === null) {
      throw CommandError.notFound('Proiect negăsit');
    }
    const currentStageId = currentRow;

    if (currentStageId === newStageId) {
      throw CommandError.badRequest('Proiectul este deja în această etapă');
    }

    
    
    
    if (HandoffService.hasPendingStrictHandoff(db, projectId)) {
      throw CommandError.conflict(
        'Există o predare pendinte pe acest proiect. Acceptă sau respinge predarea înainte de a muta stage-ul.'
      );
    }

    
    
    
    const currentStatus = queryOne(db,
      'SELECT status FROM projects WHERE id = ?', [projectId], r => r.status as string) || 'ofertă';
    const newStatus = deriveStatusForStage(newStageId, currentStatus);

    db.run(
      "UPDATE projects SET stage_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?",
      [newStageId, newStatus, projectId]
    );

    db.run(
      'INSERT INTO stage_transitions (project_id, from_stage_id, to_stage_id, user_id, notes) VALUES (?, ?, ?, ?, ?)',
      [projectId, currentStageId, newStageId, currentUser.id, notes]
    );

    
    
    
    const fromRole = HandoffService.stageOwnerRole(currentStageId);
    const toRole = HandoffService.stageOwnerRole(newStageId);
    if (fromRole !== toRole) {
      try {
        HandoffService.create(db, {
          project_id: projectId,
          from_stage_id: currentStageId,
          to_stage_id: newStageId,
          from_user_id: currentUser.id,
          to_role: toRole,
          handoff_notes: notes,
        });
      } catch (e) {
        console.error('[productionService.moveProjectToStage] handoff create failed:', e);
      }
    }

    const projectName = queryOne(db, 'SELECT name FROM projects WHERE id = ?', [projectId], r => r.name as string) || '';
    const fromStageName = queryOne(db, 'SELECT name FROM project_stages WHERE id = ?', [currentStageId], r => r.name as string) || '';
    const toStageName = queryOne(db, 'SELECT name FROM project_stages WHERE id = ?', [newStageId], r => r.name as string) || '';

    logAudit(db, currentUser, 'STAGE_CHANGE', 'project', projectId,
      JSON.stringify({ name: projectName, from_stage: fromStageName, to_stage: toStageName }));

    return this.getProjectDetails(db, projectId);
  }

  static getStageTransitions(db: Database, projectId: number): StageTransition[] {
    return queryRows(db,
      `SELECT st.id, st.project_id, st.from_stage_id,
              COALESCE(fs.name, '—') as from_stage_name,
              st.to_stage_id, ts.name as to_stage_name, st.user_id, u.full_name as user_name,
              st.notes, st.created_at
       FROM stage_transitions st
       LEFT JOIN project_stages fs ON st.from_stage_id = fs.id
       JOIN project_stages ts ON st.to_stage_id = ts.id
       JOIN users u ON st.user_id = u.id
       WHERE st.project_id = ?
       ORDER BY st.created_at DESC`,
      [projectId],
      (row) => ({
        id: row.id as number,
        project_id: row.project_id as number,
        from_stage_id: row.from_stage_id as number | null,
        from_stage_name: row.from_stage_name as string,
        to_stage_id: row.to_stage_id as number,
        to_stage_name: row.to_stage_name as string,
        user_id: row.user_id as number,
        user_name: row.user_name as string,
        notes: row.notes as string | null,
        created_at: row.created_at as string,
      })
    );
  }

  private static getProjectDetails(db: Database, projectId: number): ProjectWithDetails {
    const result = queryOne(db,
      `SELECT p.id, p.name, p.client_id, c.name as client_name,
              p.status, p.stage_id, ps.name as stage_name, p.priority,
              p.manager_id, u.full_name as manager_name,
              p.description, p.estimated_value, p.estimated_cost, p.actual_cost,
              p.deadline, p.start_date, p.end_date, p.created_at, p.updated_at, p.operational_flow_json
       FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN project_stages ps ON p.stage_id = ps.id
       JOIN users u ON p.manager_id = u.id
       WHERE p.id = ?`,
      [projectId],
      (row) => ({
        id: row.id as number,
        name: row.name as string,
        client_id: row.client_id as number,
        client_name: row.client_name as string,
        status: deriveStatusForStage(row.stage_id as number | null, row.status as string),
        stage_id: row.stage_id as number,
        stage_name: row.stage_name as string,
        priority: row.priority as string,
        manager_id: row.manager_id as number,
        manager_name: row.manager_name as string,
        description: row.description as string | null,
        estimated_value: (row.estimated_value as number) || 0,
        estimated_cost: (row.estimated_cost as number) || 0,
        actual_cost: (row.actual_cost as number) || 0,
        deadline: row.deadline as string | null,
        start_date: row.start_date as string | null,
        end_date: row.end_date as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        operational_flow_json: row.operational_flow_json as string | null,
      })
    );
    if (!result) throw CommandError.notFound('Proiect negăsit');
    return result;
  }
}
