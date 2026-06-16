import type { Database } from 'sql.js';
import { HandoffService } from './handoffService';
import { CommandError } from '../middleware/errors';
import { capStr } from '../middleware/validate';
import { roleHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';
import type { UserWithRole } from './authService';





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
  
  version: number;
}

export interface CreateProjectRequest {
  name: string;
  client_id: number;
  status?: string | null;
  stage_id?: number | null;
  priority?: string | null;
  manager_id?: number | null;
  description?: string | null;
  estimated_value?: number;
  estimated_cost?: number;
  deadline?: string | null;
  start_date?: string | null;
}

export interface UpdateProjectRequest {
  id: number;
  


  expected_version?: number;
  name?: string | null;
  client_id?: number | null;
  status?: string | null;
  stage_id?: number | null;
  priority?: string | null;
  manager_id?: number | null;
  description?: string | null;
  estimated_value?: number | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  deadline?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  operational_flow_json?: string | null;
}

export interface ProjectStage {
  id: number;
  name: string;
  order_index: number;
  description: string | null;
}

export interface Client {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  county: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientRequest {
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  county?: string | null;
  notes?: string | null;
}

export interface UpdateClientRequest {
  id: number;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  county?: string | null;
  notes?: string | null;
}

export interface ProjectComment {
  id: number;
  project_id: number;
  stage_id: number | null;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
}

export interface CreateCommentRequest {
  project_id: number;
  stage_id?: number | null;
  content: string;
}

export interface ProjectActivity {
  id: number;
  project_id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  details: string | null;
  created_at: string;
}

export interface ProjectStats {
  in_production: number;
  approved: number;
  blocked: number;
  completed: number;
  offers: number;
  total: number;
}





function hasPermission(db: Database, roleId: number, expected: string[]): boolean {
  return roleHasAny(db, roleId, expected);
}

function canViewProjects(db: Database, user: UserWithRole): boolean {
  return hasPermission(db, user.role_id, ['all', 'view_all', 'view_projects', 'manage_projects', 'edit_projects', 'view_own_projects']);
}

function canCreateProjects(db: Database, user: UserWithRole): boolean {
  return hasPermission(db, user.role_id, ['all', 'manage_projects']);
}

function canEditProjects(db: Database, user: UserWithRole): boolean {
  return hasPermission(db, user.role_id, ['all', 'manage_projects', 'edit_projects']);
}






function canEditProjectStage(db: Database, user: UserWithRole): boolean {
  return hasPermission(db, user.role_id,
    ['all', 'manage_projects', 'edit_projects', 'manage_production', 'production_advance']);
}

function canComment(db: Database, user: UserWithRole): boolean {
  return hasPermission(db, user.role_id, ['all', 'manage_projects', 'edit_projects', 'view_projects', 'view_own_projects', 'time_tracking']);
}

function logAudit(db: Database, userId: number, action: string, entityType: string, entityId: number | null, details?: string | null): void {
  try { logAuditEvent(db, userId, action, entityType, entityId, details ?? null); } catch {  }
}

function addActivity(
  db: Database, projectId: number, userId: number | null,
  action: string, fieldName?: string | null, oldValue?: string | null,
  newValue?: string | null, details?: string | null
): void {
  try {
    db.run(
      `INSERT INTO project_activity (project_id, user_id, action, field_name, old_value, new_value, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [projectId, userId, action, fieldName ?? null, oldValue ?? null, newValue ?? null, details ?? null]
    );
  } catch {  }
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime());
}

const VALID_STATUSES = ['ofertă', 'oferta', 'aprobat', 'în producție', 'in productie', 'livrare', 'finalizat', 'blocat', 'anulat', 'active', 'delayed', 'completed', 'blocked'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];





















function deriveStatusFromStageId(stageId: number | null | undefined, fallback: string): string {
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

function validateStatus(status: string): void {
  if (!VALID_STATUSES.includes(status)) {
    throw CommandError.badRequest('Status invalid');
  }
}

function validatePriority(priority: string): void {
  if (!VALID_PRIORITIES.includes(priority)) {
    throw CommandError.badRequest('Prioritate invalidă');
  }
}

function validateClientExists(db: Database, clientId: number): void {
  const stmt = db.prepare('SELECT EXISTS(SELECT 1 FROM clients WHERE id = ?)');
  stmt.bind([clientId]);
  stmt.step();
  const exists = stmt.get()[0] as number;
  stmt.free();
  if (!exists) {
    throw CommandError.badRequest('Client invalid');
  }
}

function validateUserExists(db: Database, userId: number): void {
  const stmt = db.prepare('SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)');
  stmt.bind([userId]);
  stmt.step();
  const exists = stmt.get()[0] as number;
  stmt.free();
  if (!exists) {
    throw CommandError.badRequest('Responsabil invalid');
  }
}

function qNumber(db: Database, sql: string): number {
  const stmt = db.prepare(sql);
  let val = 0;
  if (stmt.step()) { val = (stmt.get()[0] as number) || 0; }
  stmt.free();
  return val;
}

const PROJECT_SELECT = `SELECT p.id, p.name, p.client_id, c.name as client_name,
        p.status, p.stage_id, ps.name as stage_name, p.priority,
        p.manager_id, u.full_name as manager_name,
        p.description, p.estimated_value, p.estimated_cost, p.actual_cost,
        p.deadline, p.start_date, p.end_date, p.created_at, p.updated_at, p.operational_flow_json,
        p.version
 FROM projects p
 JOIN clients c ON p.client_id = c.id
 JOIN project_stages ps ON p.stage_id = ps.id
 JOIN users u ON p.manager_id = u.id`;

function rowToProject(row: any[]): ProjectWithDetails {
  
  
  
  
  
  
  const dbStatus = row[4] as string;
  const stageId = row[5] as number | null;
  const status = deriveStatusFromStageId(stageId, dbStatus);
  return {
    id: row[0] as number,
    name: row[1] as string,
    client_id: row[2] as number,
    client_name: row[3] as string,
    status,
    stage_id: row[5] as number,
    stage_name: row[6] as string,
    priority: row[7] as string,
    manager_id: row[8] as number,
    manager_name: row[9] as string,
    description: row[10] as string | null,
    estimated_value: (row[11] as number) || 0,
    estimated_cost: (row[12] as number) || 0,
    actual_cost: (row[13] as number) || 0,
    deadline: row[14] as string | null,
    start_date: row[15] as string | null,
    end_date: row[16] as string | null,
    created_at: row[17] as string,
    updated_at: row[18] as string,
    operational_flow_json: row[19] as string | null,
    version: (row[20] as number) ?? 0,
  };
}

function seedNotebookCustomStages(db: Database, projectId: number): void {
  const countStmt = db.prepare('SELECT COUNT(*) FROM project_custom_stages WHERE project_id = ?');
  countStmt.bind([projectId]);
  countStmt.step();
  const count = countStmt.get()[0] as number;
  countStmt.free();
  if (count > 0) return;

  const ROWS: [string, number, string][] = [
    ['Contract și produs', 10, 'Titular contract, produs livrat, preț vânzare, termen execuție / PIF.'],
    ['Proiectare', 20, 'Elemente proiectate existente; ce urmează proiectat + termene.'],
    ['Necesar materiale — stoc hală', 30, 'Materiale deja în hală / stoc.'],
    ['Necesar materiale — de comandat', 40, 'Materiale de achiziționat.'],
    ['Achiziții materiale și repere', 50, 'Furnizor, termen livrare (comandă lansată), dată livrare, verificare.'],
    ['Debitare', 60, 'Laser/plasma, ferăstrău.'],
    ['Ansamblare primară', 70, 'Ansamblare intermediară.'],
    ['Ansamblare definitivă', 80, 'Înainte de finisaje / tratamente externe.'],
    ['Alte operații producție', 90, 'Alte faze pe șopron.'],
    ['Vopsire', 100, 'Cantități, specificații, comandă, livrare (aviz), dată.'],
    ['Zincare', 110, 'Expediere aviz, retur zincat (CMR etc.), livrare directă client dacă e cazul.'],
    ['Montaj site — mecanic', 120, 'Muncitori / echipe, termen.'],
    ['Montaj site — electric și PIF', 130, 'Personal electric, punere în funcțiune.'],
    ['Livrare / testare', 140, 'Livrare client, verificări finale.'],
    ['Finalizat', 150, 'Închis, facturat.'],
  ];

  for (const [name, orderIndex, description] of ROWS) {
    db.run(
      `INSERT INTO project_custom_stages (project_id, name, order_index, description, status)
       VALUES (?, ?, ?, ?, 'planificat')`,
      [projectId, name, orderIndex, description]
    );
  }
}





export class ProjectService {
  static getAll(db: Database, user: UserWithRole): ProjectWithDetails[] {
    if (!canViewProjects(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const stmt = db.prepare(`${PROJECT_SELECT} ORDER BY p.created_at DESC`);
    const results: ProjectWithDetails[] = [];
    while (stmt.step()) {
      results.push(rowToProject(stmt.get()));
    }
    stmt.free();
    return results;
  }

  static getById(db: Database, id: number, user: UserWithRole): ProjectWithDetails {
    if (!canViewProjects(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const stmt = db.prepare(`${PROJECT_SELECT} WHERE p.id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Proiect negăsit');
    }
    const project = rowToProject(stmt.get());
    stmt.free();
    return project;
  }

  static create(db: Database, req: CreateProjectRequest, user: UserWithRole): ProjectWithDetails {
    if (!canCreateProjects(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    
    const projectName = capStr(req.name, 255, 'name', { required: true })!;
    const projectDescription = capStr(req.description, 50_000, 'description');
    if ((req.estimated_value ?? 0) < 0 || (req.estimated_cost ?? 0) < 0) {
      throw CommandError.badRequest('Valorile estimate trebuie să fie >= 0');
    }
    if ((req.estimated_value ?? 0) > 1e10 || (req.estimated_cost ?? 0) > 1e10) {
      throw CommandError.badRequest('Valorile estimate sunt nerealist de mari');
    }
    validateClientExists(db, req.client_id);

    const managerId = req.manager_id ?? user.id;
    validateUserExists(db, managerId);

    const status = req.status || 'ofertă';
    validateStatus(status);

    const priority = req.priority || 'medium';
    validatePriority(priority);

    if (req.deadline) { if (!isValidDate(req.deadline)) throw CommandError.badRequest('Format dată invalid. Folosește YYYY-MM-DD'); }
    if (req.start_date) { if (!isValidDate(req.start_date)) throw CommandError.badRequest('Format dată invalid. Folosește YYYY-MM-DD'); }

    db.run(
      `INSERT INTO projects (name, client_id, status, stage_id, priority, manager_id, description, estimated_value, estimated_cost, deadline, start_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectName, req.client_id, status, req.stage_id ?? 1, priority, managerId,
       projectDescription, req.estimated_value ?? 0, req.estimated_cost ?? 0,
       req.deadline ?? null, req.start_date ?? null]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const projectId = idStmt.get()[0] as number;
    idStmt.free();

    addActivity(db, projectId, user.id, 'project_created', null, null, null, 'Proiect creat');
    logAudit(db, user.id, 'CREATE', 'project', projectId, 'Project created');
    seedNotebookCustomStages(db, projectId);

    return this.getById(db, projectId, user);
  }

  static update(db: Database, req: UpdateProjectRequest, user: UserWithRole): ProjectWithDetails {
    
    
    const reqKeys = Object.keys(req).filter(k => k !== 'id' && (req as any)[k] !== undefined && (req as any)[k] !== null);
    const stageOnly = reqKeys.length === 1 && reqKeys[0] === 'stage_id';

    if (stageOnly) {
      if (!canEditProjectStage(db, user)) throw CommandError.forbidden('Acces refuzat');
    } else if (!canEditProjects(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const existing = this.getById(db, req.id, user);

    
    
    
    
    if (req.expected_version !== undefined && req.expected_version !== existing.version) {
      throw CommandError.conflict(
        'Proiectul a fost modificat de alt utilizator între timp. Reîncarcă și încearcă din nou.'
      );
    }

    if (req.client_id != null) validateClientExists(db, req.client_id);
    if (req.manager_id != null) validateUserExists(db, req.manager_id);
    if (req.status) validateStatus(req.status);
    if (req.priority) validatePriority(req.priority);
    if (req.deadline) { if (!isValidDate(req.deadline)) throw CommandError.badRequest('Format dată invalid. Folosește YYYY-MM-DD'); }

    const name = req.name ?? existing.name;
    const clientId = req.client_id ?? existing.client_id;
    const managerId = req.manager_id ?? existing.manager_id;
    const stageId = req.stage_id ?? existing.stage_id;

    
    
    
    
    let status = req.status ?? existing.status;
    if (req.status == null && req.stage_id != null && req.stage_id !== existing.stage_id) {
      status = deriveStatusFromStageId(stageId, existing.status);
    }

    
    
    
    
    if (req.stage_id != null && req.stage_id !== existing.stage_id
        && existing.stage_id !== null && existing.stage_id <= 2 && stageId > 2 && stageId !== 9) {
      const stmt = db.prepare(
        `SELECT COUNT(*) FROM designer_checklists
         WHERE project_id = ? AND status != 'finalized'`
      );
      stmt.bind([req.id]);
      stmt.step();
      const pendingChecklists = stmt.get()[0] as number;
      stmt.free();
      if (pendingChecklists > 0) {
        throw CommandError.badRequest(
          'Fișa proiectant nu e finalizată. Finalizează fișa înainte de a muta proiectul în producție.'
        );
      }
    }

    
    
    
    
    
    if (req.stage_id != null && req.stage_id !== existing.stage_id) {
      if (HandoffService.hasPendingStrictHandoff(db, req.id)) {
        throw CommandError.conflict(
          'Există o predare pendinte pe acest proiect. Acceptă sau respinge predarea înainte de a muta stage-ul.'
        );
      }
    }
    const priority = req.priority ?? existing.priority;
    const description = req.description !== undefined ? req.description : existing.description;
    const estimatedValue = req.estimated_value ?? existing.estimated_value;
    const estimatedCost = req.estimated_cost ?? existing.estimated_cost;
    const actualCost = req.actual_cost ?? existing.actual_cost;
    const deadline = req.deadline !== undefined ? req.deadline : existing.deadline;
    const startDate = req.start_date !== undefined ? req.start_date : existing.start_date;
    const endDate = req.end_date !== undefined ? req.end_date : existing.end_date;
    const flowJson = req.operational_flow_json !== undefined ? req.operational_flow_json : existing.operational_flow_json;

    db.run(
      `UPDATE projects
       SET name = ?, client_id = ?, manager_id = ?, status = ?, stage_id = ?, priority = ?,
           description = ?, estimated_value = ?, estimated_cost = ?, actual_cost = ?,
           deadline = ?, start_date = ?, end_date = ?, operational_flow_json = ?,
           version = version + 1, updated_at = datetime('now')
       WHERE id = ?`,
      [name, clientId, managerId, status, stageId, priority,
       description, estimatedValue, estimatedCost, actualCost,
       deadline, startDate, endDate, flowJson, req.id]
    );

    
    
    
    
    
    if (existing.stage_id !== stageId && (stageId === 8 || stageId === 9)) {
      db.run(
        "UPDATE finance_invoices SET status = 'sent', updated_at = datetime('now') WHERE project_id = ? AND status = 'draft'",
        [req.id]
      );
    }

    
    
    
    if (existing.stage_id !== stageId) {
      if (stageId === 2) {
        db.run(
          "UPDATE contracts SET status = 'active', updated_at = datetime('now') WHERE project_id = ? AND status = 'draft'",
          [req.id]
        );
      } else if (stageId === 9) {
        db.run(
          "UPDATE contracts SET status = 'closed', updated_at = datetime('now') WHERE project_id = ? AND status IN ('active', 'amended')",
          [req.id]
        );
      }
    }

    
    
    
    
    

    addActivity(db, req.id, user.id, 'project_updated', null, null, null, 'Date proiect actualizate');

    
    
    
    
    if (req.stage_id != null && req.stage_id !== existing.stage_id) {
      const toRole = HandoffService.stageOwnerRole(stageId);
      const fromRole = existing.stage_id != null ? HandoffService.stageOwnerRole(existing.stage_id) : null;
      
      
      if (fromRole !== toRole) {
        try {
          HandoffService.create(db, {
            project_id: req.id,
            from_stage_id: existing.stage_id,
            to_stage_id: stageId,
            from_user_id: user.id,
            to_role: toRole,
            handoff_notes: null,
          });
        } catch (e) {
          
          
          console.error('[projectService.update] handoff create failed:', e);
        }
      }
    }

    if (existing.status !== status) {
      addActivity(db, req.id, user.id, 'status_changed', 'status', existing.status, status, 'Status proiect schimbat');
    }
    if (existing.deadline !== deadline) {
      addActivity(db, req.id, user.id, 'deadline_changed', 'deadline', existing.deadline ?? undefined, deadline ?? undefined, 'Deadline schimbat');
    }
    if (existing.manager_id !== managerId) {
      addActivity(db, req.id, user.id, 'responsabil_changed', 'manager_id', String(existing.manager_id), String(managerId), 'Responsabil schimbat');
    }

    logAudit(db, user.id, 'UPDATE', 'project', req.id, 'Project updated');
    return this.getById(db, req.id, user);
  }

  static delete(db: Database, id: number, user: UserWithRole): void {
    if (!canEditProjects(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const existing = this.getById(db, id, user);

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    db.run('BEGIN');
    try {
      
      db.run(`DELETE FROM piece_assignments
               WHERE piece_id IN (SELECT id FROM project_pieces WHERE project_id = ?)`, [id]);
      db.run(`DELETE FROM piece_order_tracking
               WHERE piece_id IN (SELECT id FROM project_pieces WHERE project_id = ?)`, [id]);

      
      
      
      
      
      for (const tbl of [
        'project_pieces',
        'project_custom_stages',
        'project_revenues',
        'project_expenses',
        'project_handoffs',
        'project_briefings',
        'project_finance_overrides',
        'material_consumptions',
        
        'project_activities',
        'project_documents',
      ]) {
        try {
          db.run(`DELETE FROM ${tbl} WHERE project_id = ?`, [id]);
        } catch (e) {
          console.warn(`[delete project ${id}] skip ${tbl}:`, e instanceof Error ? e.message : e);
        }
      }

      
      
      db.run(`UPDATE sales_leads SET converted_project_id = NULL WHERE converted_project_id = ?`, [id]);

      
      db.run('DELETE FROM projects WHERE id = ?', [id]);
      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }

    logAudit(db, user.id, 'DELETE', 'project', id, `Project deleted: ${existing.name}`);
  }

  static getStages(db: Database): ProjectStage[] {
    const stmt = db.prepare(
      'SELECT id, name, order_index, description FROM project_stages ORDER BY order_index'
    );
    const results: ProjectStage[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as number,
        name: row.name as string,
        order_index: row.order_index as number,
        description: row.description as string | null,
      });
    }
    stmt.free();
    return results;
  }

  static getClients(db: Database): Client[] {
    const stmt = db.prepare(
      `SELECT id, name, contact_person, phone, email, city, county, notes, created_at, updated_at
       FROM clients ORDER BY name`
    );
    const results: Client[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as number,
        name: row.name as string,
        contact_person: row.contact_person as string | null,
        phone: row.phone as string | null,
        email: row.email as string | null,
        city: row.city as string | null,
        county: row.county as string | null,
        notes: row.notes as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      });
    }
    stmt.free();
    return results;
  }

  static createClient(db: Database, req: CreateClientRequest, user: UserWithRole): Client {
    if (!canCreateProjects(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }
    const v = {
      name: capStr(req.name, 250, 'name', { required: true })!,
      contact_person: capStr(req.contact_person, 200, 'contact_person'),
      phone: capStr(req.phone, 50, 'phone'),
      email: capStr(req.email, 254, 'email'),
      city: capStr(req.city, 100, 'city'),
      county: capStr(req.county, 100, 'county'),
      notes: capStr(req.notes, 20_000, 'notes'),
    };

    db.run(
      `INSERT INTO clients (name, contact_person, phone, email, city, county, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [v.name, v.contact_person, v.phone,
       v.email, v.city, v.county,
       v.notes]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    logAudit(db, user.id, 'CREATE', 'client', id, `Created client ${req.name}`);

    const fetchStmt = db.prepare(
      `SELECT id, name, contact_person, phone, email, city, county, notes, created_at, updated_at
       FROM clients WHERE id = ?`
    );
    fetchStmt.bind([id]);
    fetchStmt.step();
    const row = fetchStmt.getAsObject();
    fetchStmt.free();

    return {
      id: row.id as number,
      name: row.name as string,
      contact_person: row.contact_person as string | null,
      phone: row.phone as string | null,
      email: row.email as string | null,
      city: row.city as string | null,
      county: row.county as string | null,
      notes: row.notes as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  static updateClient(db: Database, req: UpdateClientRequest, user: UserWithRole): Client {
    if (!canEditProjects(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }
    const v = {
      name: capStr(req.name, 250, 'name', { required: true })!,
      contact_person: capStr(req.contact_person, 200, 'contact_person'),
      phone: capStr(req.phone, 50, 'phone'),
      email: capStr(req.email, 254, 'email'),
      city: capStr(req.city, 100, 'city'),
      county: capStr(req.county, 100, 'county'),
      notes: capStr(req.notes, 20_000, 'notes'),
    };

    db.run(
      `UPDATE clients SET
          name = ?, contact_person = ?, phone = ?, email = ?,
          city = ?, county = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [v.name, v.contact_person, v.phone,
       v.email, v.city, v.county,
       v.notes, req.id]
    );

    logAudit(db, user.id, 'UPDATE', 'client', req.id, `Updated client ${req.id}`);

    const fetchStmt = db.prepare(
      `SELECT id, name, contact_person, phone, email, city, county, notes, created_at, updated_at
       FROM clients WHERE id = ?`
    );
    fetchStmt.bind([req.id]);
    if (!fetchStmt.step()) {
      fetchStmt.free();
      throw CommandError.notFound('Proiect negăsit');
    }
    const row = fetchStmt.getAsObject();
    fetchStmt.free();

    return {
      id: row.id as number,
      name: row.name as string,
      contact_person: row.contact_person as string | null,
      phone: row.phone as string | null,
      email: row.email as string | null,
      city: row.city as string | null,
      county: row.county as string | null,
      notes: row.notes as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  static deleteClient(db: Database, user: UserWithRole, id: number): void {

    const countStmt = db.prepare('SELECT COUNT(*) FROM projects WHERE client_id = ?');
    countStmt.bind([id]);
    countStmt.step();
    const projectCount = countStmt.get()[0] as number;
    countStmt.free();

    if (projectCount > 0) {
      throw CommandError.badRequest(
        `Clientul nu poate fi șters deoarece are ${projectCount} proiecte asociate. Ștergeți mai întâi proiectele.`
      );
    }

    db.run('DELETE FROM clients WHERE id = ?', [id]);
    logAudit(db, user.id, 'delete', 'client', id, null);
  }

  static getComments(db: Database, projectId: number, user: UserWithRole): ProjectComment[] {
    if (!canComment(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const stmt = db.prepare(
      `SELECT pc.id, pc.project_id, pc.stage_id, pc.user_id, u.full_name as user_name,
              pc.content, pc.created_at
       FROM project_comments pc
       JOIN users u ON pc.user_id = u.id
       WHERE pc.project_id = ?
       ORDER BY pc.created_at DESC`
    );
    stmt.bind([projectId]);

    const results: ProjectComment[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      results.push({
        id: row[0] as number,
        project_id: row[1] as number,
        stage_id: row[2] as number | null,
        user_id: row[3] as number,
        user_name: row[4] as string,
        content: row[5] as string,
        created_at: row[6] as string,
      });
    }
    stmt.free();
    return results;
  }

  static addComment(db: Database, req: CreateCommentRequest & { attachments?: any[]; }, user: UserWithRole): ProjectComment {
    if (!canComment(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }
    if (!req.content?.trim()) {
      throw CommandError.badRequest('Comentariul nu poate fi gol');
    }

    
    
    const mentionedIds: number[] = [];
    const mentionRegex = /@([a-zA-Z0-9._]+)/g;
    const usernames = new Set<string>();
    let m;
    while ((m = mentionRegex.exec(req.content)) !== null) {
      usernames.add(m[1].toLowerCase());
    }
    for (const username of usernames) {
      const stmt = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?');
      stmt.bind([username]);
      if (stmt.step()) mentionedIds.push(stmt.get()[0] as number);
      stmt.free();
    }
    const attachmentsJson = (req.attachments && req.attachments.length > 0)
      ? JSON.stringify(req.attachments)
      : null;
    const mentionedJson = mentionedIds.length > 0 ? JSON.stringify(mentionedIds) : null;

    db.run(
      'INSERT INTO project_comments (project_id, stage_id, user_id, content, attachments, mentioned_user_ids) VALUES (?, ?, ?, ?, ?, ?)',
      [req.project_id, req.stage_id ?? null, user.id, req.content.trim(), attachmentsJson, mentionedJson]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const commentId = idStmt.get()[0] as number;
    idStmt.free();

    addActivity(db, req.project_id, user.id, 'comment_added', null, null, null,
      mentionedIds.length > 0 ? `Comentariu cu menționări (${mentionedIds.length})` : 'Comentariu adăugat');
    logAudit(db, user.id, 'CREATE', 'comment', commentId, 'Comment added');

    
    for (const targetUserId of mentionedIds) {
      if (targetUserId === user.id) continue;  
      try {
        db.run(
          `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
           VALUES (?, 'mention', ?, ?, ?, datetime('now'))`,
          [targetUserId, `Menționat de ${user.full_name ?? user.username}`,
           req.content.trim().slice(0, 200), 'projects']
        );
      } catch {  }

      
      try {
        const snippet = req.content.trim().slice(0, 200);
        db.run(
          `INSERT INTO mentions (mentioned_user_id, actor_user_id, source_type, source_id, snippet)
           VALUES (?, ?, 'project_comment', ?, ?)`,
          [targetUserId, user.id, commentId, snippet],
        );
      } catch {  }
    }

    const fetchStmt = db.prepare(
      `SELECT pc.id, pc.project_id, pc.stage_id, pc.user_id, u.full_name as user_name,
              pc.content, pc.created_at
       FROM project_comments pc
       JOIN users u ON pc.user_id = u.id
       WHERE pc.id = ?`
    );
    fetchStmt.bind([commentId]);
    fetchStmt.step();
    const row = fetchStmt.get();
    fetchStmt.free();

    return {
      id: row[0] as number,
      project_id: row[1] as number,
      stage_id: row[2] as number | null,
      user_id: row[3] as number,
      user_name: row[4] as string,
      content: row[5] as string,
      created_at: row[6] as string,
    };
  }

  static getHistory(db: Database, projectId: number, user: UserWithRole): ProjectActivity[] {
    if (!canViewProjects(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const stmt = db.prepare(
      `SELECT pa.id, pa.project_id, pa.user_id, u.full_name as user_name, pa.action,
              pa.field_name, pa.old_value, pa.new_value, pa.details, pa.created_at
       FROM project_activity pa
       LEFT JOIN users u ON u.id = pa.user_id
       WHERE pa.project_id = ?
       ORDER BY pa.created_at DESC`
    );
    stmt.bind([projectId]);

    const results: ProjectActivity[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      results.push({
        id: row[0] as number,
        project_id: row[1] as number,
        user_id: row[2] as number | null,
        user_name: row[3] as string | null,
        action: row[4] as string,
        field_name: row[5] as string | null,
        old_value: row[6] as string | null,
        new_value: row[7] as string | null,
        details: row[8] as string | null,
        created_at: row[9] as string,
      });
    }
    stmt.free();
    return results;
  }

  static getStats(db: Database, user: UserWithRole): ProjectStats {
    if (!canViewProjects(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const in_production = qNumber(db, "SELECT COUNT(*) FROM projects WHERE status = 'în producție'");
    const approved = qNumber(db, "SELECT COUNT(*) FROM projects WHERE status = 'aprobat'");
    const blocked = qNumber(db, "SELECT COUNT(*) FROM projects WHERE status = 'blocat'");
    const completed = qNumber(db, "SELECT COUNT(*) FROM projects WHERE status = 'finalizat'");
    const offers = qNumber(db, "SELECT COUNT(*) FROM projects WHERE status = 'ofertă'");

    return {
      in_production,
      approved,
      blocked,
      completed,
      offers,
      total: in_production + approved + blocked + completed + offers,
    };
  }

  static updateStage(db: Database, projectId: number, stageId: number, user: UserWithRole): ProjectWithDetails {
    if (!canEditProjects(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const existing = this.getById(db, projectId, user);

    db.run(
      "UPDATE projects SET stage_id = ?, updated_at = datetime('now') WHERE id = ?",
      [stageId, projectId]
    );

    addActivity(db, projectId, user.id, 'stage_changed', 'stage_id', String(existing.stage_id), String(stageId), 'Etapă schimbată');
    logAudit(db, user.id, 'UPDATE', 'project', projectId, 'Stage updated');

    return this.getById(db, projectId, user);
  }
}
