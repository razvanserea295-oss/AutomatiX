import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';
import { getRolePermissions } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';





export interface ProjectCustomStage {
  id: number; project_id: number; name: string; order_index: number;
  description: string | null; status: string; created_at: string;
}

export interface CreateProjectCustomStageRequest {
  project_id: number; name: string; order_index: number; description?: string | null;
}

export interface UpdateProjectCustomStageRequest {
  id: number; name?: string | null; order_index?: number | null;
  description?: string | null; status?: string | null;
}

export interface ProjectPiece {
  id: number; project_id: number; stage_id: number; stage_name: string;
  name: string; original_name: string | null;
  category: string; specs: string | null; quantity: number;
  status: string; parent_piece_id: number | null; sort_order: number;
  assembly_key: string; production_tracking: string; hall_notes: string | null;
  fulfillment_type: string; fulfillment_status: string;
  source_file_name: string | null; source_file_path: string | null;
  created_at: string; updated_at: string;
  
  version: number;
}

export interface CreateProjectPieceRequest {
  project_id: number; stage_id: number; name: string; category: string;
  specs?: string | null; quantity: number; parent_piece_id?: number | null;
  sort_order?: number | null; assembly_key?: string | null;
  production_tracking?: string | null; hall_notes?: string | null;
  fulfillment_type?: string | null; fulfillment_status?: string | null;
}

export interface UpdateProjectPieceRequest {
  id: number; stage_id?: number | null; name?: string | null; original_name?: string | null;
  category?: string | null;
  specs?: string | null; quantity?: number | null; status?: string | null;
  parent_piece_id?: number | null; sort_order?: number | null;
  assembly_key?: string | null; production_tracking?: string | null;
  hall_notes?: string | null; fulfillment_type?: string | null; fulfillment_status?: string | null;
  
  expected_version?: number;
}

export interface BulkImportRow {
  name: string; category: string; specs?: string | null; quantity: number;
  assembly_key?: string | null; parent_batch_index?: number | null;
  production_tracking?: string | null; fulfillment_type?: string | null;
}

export interface BulkImportProjectPiecesRequest {
  project_id: number; stage_id?: number | null; create_default_stage: boolean;
  rows: BulkImportRow[];
}

export interface PieceMaterialRequirement {
  id: number; project_piece_id: number; material_id: number;
  material_name: string; material_code: string;
  quantity_plan: number; notes: string | null; created_at: string;
}

export interface CreatePieceMaterialRequirementRequest {
  project_piece_id: number; material_id: number;
  quantity_plan: number; notes?: string | null;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
const DEFAULT_TRACKING = '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","testare":"neinceput","livrat":"neinceput","montat":"neinceput","punere_functiune":"neinceput"}';

function normalizeFulfillmentType(raw?: string | null): string {
  const s = (raw || '').trim().toLowerCase();
  if (['fabricare', 'fabricat', 'productie', 'producție'].includes(s)) return 'fabricare';
  if (['cumparare', 'cumpărare', 'cumparat', 'achizitie', 'achiziție'].includes(s)) return 'cumparare';
  return 'nedecis';
}

function normalizeFulfillmentStatus(raw?: string | null): string {
  const s = (raw || 'draft').trim().toLowerCase();
  if (s === 'draft') return 'draft';
  if (['trimis_fabricare', 'fabricare'].includes(s)) return 'trimis_fabricare';
  if (['trimis_achizitii', 'achizitii'].includes(s)) return 'trimis_achizitii';
  if (['inchis', 'închis'].includes(s)) return 'inchis';
  return 'draft';
}















function derivePieceStatusFromStageId(stageId: number | null | undefined, fallback: string): string {
  if (stageId == null) return fallback;
  switch (stageId) {
    case 1: return 'planificat';
    case 8: return 'livrat';
    case 9: return 'testat';
    case 18:
    case 19: return 'montat';
    default: return 'in_productie';
  }
}









const STAGE_IMPLIES_TRACKING_DONE: Record<number, string[]> = {
  
  2: ['proiectare', 'dxf', 'desene'],                                                                       
  3: ['proiectare', 'dxf', 'desene', 'achizitie_materiale', 'debitare'],                                    
  4: ['proiectare', 'dxf', 'desene', 'achizitie_materiale', 'debitare', 'sudare'],                          
  5: ['proiectare', 'dxf', 'desene', 'achizitie_materiale', 'debitare', 'sudare', 'asamblare'],             
  6: ['proiectare', 'dxf', 'desene', 'achizitie_materiale', 'debitare', 'sudare', 'asamblare', 'vopsire'],  
  7: ['proiectare', 'dxf', 'desene', 'achizitie_materiale', 'debitare', 'sudare', 'asamblare', 'vopsire', 'executie', 'testare'], 
  8: ['proiectare', 'dxf', 'desene', 'achizitie_materiale', 'debitare', 'sudare', 'asamblare', 'vopsire', 'executie', 'testare', 'livrat'], 
  9: ['proiectare', 'dxf', 'desene', 'achizitie_materiale', 'debitare', 'sudare', 'prelucrare_mecanica', 'asamblare', 'vopsire', 'executie', 'testare', 'livrat', 'montat', 'punere_functiune'], 
  18: ['proiectare', 'dxf', 'desene', 'achizitie_materiale', 'debitare', 'sudare', 'asamblare', 'vopsire', 'livrat', 'montat'], 
  19: ['proiectare', 'dxf', 'desene', 'achizitie_materiale', 'debitare', 'sudare', 'asamblare', 'vopsire', 'livrat', 'montat'], 
};






function autoFillTrackingForStage(currentTrackingJson: string, stageId: number): string {
  const implied = STAGE_IMPLIES_TRACKING_DONE[stageId];
  if (!implied) return currentTrackingJson;
  let obj: Record<string, string> = {};
  try { obj = JSON.parse(currentTrackingJson) || {}; } catch { obj = {}; }
  let changed = false;
  for (const key of implied) {
    if (obj[key] !== 'finalizat') {
      obj[key] = 'finalizat';
      changed = true;
    }
  }
  return changed ? JSON.stringify(obj) : currentTrackingJson;
}






function deriveStatusFromTracking(trackingJson: string, fallback: string): string {
  try {
    const t = JSON.parse(trackingJson) as Record<string, string>;
    const isDone = (key: string) => t[key] === 'finalizat';
    if (isDone('punere_functiune')) return 'testat';
    if (isDone('montat')) return 'montat';
    if (isDone('livrat')) return 'livrat';
    if (isDone('testare')) return 'testat';
    const coreDone = ['executie'].every(isDone);
    if (coreDone) return 'fabricat';
  } catch {  }
  return fallback;
}

function validateTrackingJson(s: string): void {
  let obj: any;
  try { obj = JSON.parse(s); } catch { throw CommandError.badRequest('production_tracking JSON invalid'); }
  if (typeof obj !== 'object' || Array.isArray(obj)) throw CommandError.badRequest('production_tracking trebuie să fie obiect JSON');
  const allowedStatus = ['neinceput', 'in_lucru', 'finalizat'];
  for (const k of ['dxf', 'desene', 'executie', 'livrat', 'testare', 'montat', 'punere_functiune']) {
    if (obj[k] && !allowedStatus.includes(obj[k])) {
      throw CommandError.badRequest(`Valoare invalidă pentru ${k}: ${obj[k]}`);
    }
  }
}

function canManagePieces(db: Database, user: UserWithRole): boolean {
  const perms = getRolePermissions(db, user.role_id);
  return perms.some(p => ['all', 'manage_projects', 'manage_production'].includes(p));
}

function canFullPieceEdit(db: Database, user: UserWithRole): boolean {
  const perms = getRolePermissions(db, user.role_id);
  return perms.some(p => ['all', 'manage_projects'].includes(p));
}

function canHallPieceEdit(db: Database, user: UserWithRole): boolean {
  const perms = getRolePermissions(db, user.role_id);
  return perms.includes('manage_production');
}

function logAudit(db: Database, userId: number, action: string, entityType: string, entityId: number | null, details: string | null): void {
  logAuditEvent(db, userId, action, entityType, entityId, details);
}

const PIECE_SQL = `SELECT p.id, p.project_id, p.stage_id, s.name as stage_name, p.name, p.original_name, p.category, p.specs, p.quantity, p.status,
       p.parent_piece_id, p.sort_order, p.assembly_key, p.production_tracking, p.hall_notes,
       p.fulfillment_type, p.fulfillment_status, p.source_file_name, p.source_file_path, p.created_at, p.updated_at,
       p.version
FROM project_pieces p JOIN project_custom_stages s ON p.stage_id = s.id`;

function mapPiece(row: any): ProjectPiece {
  
  
  
  const stageId = row.stage_id as number | null;
  const dbStatus = row.status as string;
  const status = derivePieceStatusFromStageId(stageId, dbStatus);
  return { ...row, status } as ProjectPiece;
}





export class PieceService {
  /**
   * Returns custom stages for a project. If none exist, seeds them by copying
   * all global `project_stages` into `project_custom_stages` so the pieces
   * kanban always has the full pipeline visible.
   */
  static getProjectStages(db: Database, projectId: number): ProjectCustomStage[] {
    let stages = queryRows<ProjectCustomStage>(db,
      'SELECT id, project_id, name, order_index, description, status, created_at FROM project_custom_stages WHERE project_id = ? ORDER BY order_index ASC',
      [projectId], r => r as ProjectCustomStage
    );

    if (stages.length === 0) {
      // Seed from global project_stages (the full production pipeline)
      const globalStages = queryRows<{ name: string; order_index: number; description: string | null }>(db,
        'SELECT name, order_index, description FROM project_stages ORDER BY order_index ASC',
        [], r => r as any
      );
      for (const gs of globalStages) {
        db.run(
          'INSERT INTO project_custom_stages (project_id, name, order_index, description) VALUES (?, ?, ?, ?)',
          [projectId, gs.name, gs.order_index, gs.description ?? null]
        );
      }
      stages = queryRows<ProjectCustomStage>(db,
        'SELECT id, project_id, name, order_index, description, status, created_at FROM project_custom_stages WHERE project_id = ? ORDER BY order_index ASC',
        [projectId], r => r as ProjectCustomStage
      );
    }

    return stages;
  }

  static createProjectStage(db: Database, user: UserWithRole, req: CreateProjectCustomStageRequest): ProjectCustomStage {
    if (!canManagePieces(db, user)) throw CommandError.forbidden('Acces refuzat');
    db.run(
      'INSERT INTO project_custom_stages (project_id, name, order_index, description) VALUES (?, ?, ?, ?)',
      [req.project_id, req.name, req.order_index, req.description ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    logAudit(db, user.id, 'CREATE', 'project_custom_stage', id, null);
    const result = queryOne(db,
      'SELECT id, project_id, name, order_index, description, status, created_at FROM project_custom_stages WHERE id = ?',
      [id], r => r as ProjectCustomStage);
    if (!result) throw CommandError.notFound('Stadiu negăsit');
    return result;
  }

  static updateProjectStage(db: Database, user: UserWithRole, req: UpdateProjectCustomStageRequest): ProjectCustomStage {
    if (!canManagePieces(db, user)) throw CommandError.forbidden('Acces refuzat');
    const current = queryOne(db,
      'SELECT id, project_id, name, order_index, description, status, created_at FROM project_custom_stages WHERE id = ?',
      [req.id], r => r as ProjectCustomStage);
    if (!current) throw CommandError.notFound('Stadiu negăsit');

    db.run(
      'UPDATE project_custom_stages SET name = ?, order_index = ?, description = ?, status = ? WHERE id = ?',
      [req.name ?? current.name, req.order_index ?? current.order_index,
       req.description ?? current.description, req.status ?? current.status, req.id]
    );
    logAudit(db, user.id, 'UPDATE', 'project_custom_stage', req.id, null);
    const result = queryOne(db,
      'SELECT id, project_id, name, order_index, description, status, created_at FROM project_custom_stages WHERE id = ?',
      [req.id], r => r as ProjectCustomStage);
    if (!result) throw CommandError.notFound('Stadiu negăsit');
    return result;
  }

  static getProjectPieces(db: Database, projectId: number): ProjectPiece[] {
    return queryRows(db,
      `${PIECE_SQL} WHERE p.project_id = ? ORDER BY s.order_index ASC, p.sort_order ASC, p.id ASC`,
      [projectId], mapPiece
    );
  }

  static createProjectPiece(db: Database, user: UserWithRole, req: CreateProjectPieceRequest): ProjectPiece {
    if (!canManagePieces(db, user)) throw CommandError.forbidden('Acces refuzat');
    const tracking = req.production_tracking || DEFAULT_TRACKING;
    validateTrackingJson(tracking);

    const ff = normalizeFulfillmentType(req.fulfillment_type);
    const fs = normalizeFulfillmentStatus(req.fulfillment_status);

    db.run(
      `INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, parent_piece_id, sort_order, assembly_key, production_tracking, hall_notes, fulfillment_type, fulfillment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.project_id, req.stage_id, req.name, req.category, req.specs ?? null, req.quantity,
       req.parent_piece_id ?? null, req.sort_order ?? 0, req.assembly_key ?? '', tracking,
       req.hall_notes ?? null, ff, fs]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    logAudit(db, user.id, 'CREATE', 'project_piece', id, null);
    return this.getPieceById(db, id);
  }

  static updateProjectPiece(db: Database, user: UserWithRole, req: UpdateProjectPieceRequest): ProjectPiece {
    const current = this.getPieceById(db, req.id);
    const full = canFullPieceEdit(db, user);
    const hallOnly = !full && canHallPieceEdit(db, user);
    if (!full && !hallOnly) throw CommandError.forbidden('Acces refuzat');

    if (req.expected_version !== undefined && req.expected_version !== current.version) {
      throw CommandError.conflict(
        'Piesa a fost modificată de alt utilizator între timp. Reîncarcă și încearcă din nou.'
      );
    }

    if (hallOnly) {
      let tracking = current.production_tracking;
      if (req.production_tracking) { validateTrackingJson(req.production_tracking); tracking = req.production_tracking; }

      
      
      
      
      const newStageId = req.stage_id ?? current.stage_id;
      if (req.stage_id != null && req.stage_id !== current.stage_id) {
        
        
        tracking = autoFillTrackingForStage(tracking, newStageId);
      }

      
      
      let status = req.status ?? current.status;
      if (req.status == null) {
        if (req.stage_id != null && req.stage_id !== current.stage_id) {
          status = derivePieceStatusFromStageId(newStageId, current.status);
        } else if (req.production_tracking && req.production_tracking !== current.production_tracking) {
          status = deriveStatusFromTracking(tracking, current.status);
        }
      }
      const hallNotes = req.hall_notes ?? current.hall_notes;

      db.run("UPDATE project_pieces SET stage_id = ?, status = ?, production_tracking = ?, hall_notes = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?",
        [newStageId, status, tracking, hallNotes, req.id]);
      logAudit(db, user.id, 'UPDATE', 'project_piece', req.id, 'hall_fields');
      return this.getPieceById(db, req.id);
    }

    if (req.production_tracking) validateTrackingJson(req.production_tracking);
    let tracking = req.production_tracking ?? current.production_tracking;
    validateTrackingJson(tracking);

    const ff = req.fulfillment_type ? normalizeFulfillmentType(req.fulfillment_type) : current.fulfillment_type;
    const fs = req.fulfillment_status ? normalizeFulfillmentStatus(req.fulfillment_status) : current.fulfillment_status;

    
    const originalName = req.original_name ?? current.original_name ?? current.name;

    const newStageId = req.stage_id ?? current.stage_id;

    
    
    
    
    if (req.stage_id != null && req.stage_id !== current.stage_id) {
      tracking = autoFillTrackingForStage(tracking, newStageId);
    }

    
    
    
    let newStatus = req.status ?? current.status;
    if (req.status == null) {
      if (req.stage_id != null && req.stage_id !== current.stage_id) {
        newStatus = derivePieceStatusFromStageId(newStageId, current.status);
      } else if (req.production_tracking && req.production_tracking !== current.production_tracking) {
        newStatus = deriveStatusFromTracking(tracking, current.status);
      }
    }

    db.run(
      `UPDATE project_pieces SET stage_id = ?, name = ?, original_name = ?, category = ?, specs = ?, quantity = ?, status = ?,
       parent_piece_id = ?, sort_order = ?, assembly_key = ?, production_tracking = ?, hall_notes = ?,
       fulfillment_type = ?, fulfillment_status = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?`,
      [newStageId, req.name ?? current.name, originalName, req.category ?? current.category,
       req.specs ?? current.specs, req.quantity ?? current.quantity, newStatus,
       req.parent_piece_id ?? current.parent_piece_id, req.sort_order ?? current.sort_order,
       req.assembly_key ?? current.assembly_key, tracking, req.hall_notes ?? current.hall_notes,
       ff, fs, req.id]
    );
    logAudit(db, user.id, 'UPDATE', 'project_piece', req.id, null);

    
    
    
    if (newStatus !== current.status && (newStatus === 'montat' || newStatus === 'finalizat')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PiecesOrderingService } = require('./piecesOrderingService');
        PiecesOrderingService.markInstalledByPieceStatus(db, req.id, user.id);
      } catch (e) {
        console.warn('[pieceService] auto-install hook failed:', e);
      }
    }

    return this.getPieceById(db, req.id);
  }

  static bulkImportProjectPieces(db: Database, user: UserWithRole, req: BulkImportProjectPiecesRequest): ProjectPiece[] {
    if (!canFullPieceEdit(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (!req.rows || req.rows.length === 0) return [];

    let stageId = req.stage_id;
    if (!stageId && req.create_default_stage) {
      const maxOrd = queryOne(db,
        'SELECT COALESCE(MAX(order_index), 0) as mx FROM project_custom_stages WHERE project_id = ?',
        [req.project_id], r => r.mx as number) || 0;
      db.run(
        "INSERT INTO project_custom_stages (project_id, name, order_index, description) VALUES (?, 'Lista piese import', ?, 'Generat la import Excel')",
        [req.project_id, maxOrd + 1]
      );
      stageId = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    }
    if (!stageId) throw CommandError.badRequest('Lipsește stage_id sau create_default_stage');

    const idMap: number[] = [];
    for (let i = 0; i < req.rows.length; i++) {
      const row = req.rows[i];
      const tracking = row.production_tracking || DEFAULT_TRACKING;
      validateTrackingJson(tracking);

      const parentId = row.parent_batch_index != null
        ? idMap[row.parent_batch_index]
        : null;

      const ff = normalizeFulfillmentType(row.fulfillment_type);

      db.run(
        `INSERT INTO project_pieces (project_id, stage_id, name, category, specs, quantity, parent_piece_id, sort_order, assembly_key, production_tracking, fulfillment_type, fulfillment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [req.project_id, stageId, row.name, row.category, row.specs ?? null, row.quantity,
         parentId, i, row.assembly_key ?? null, tracking, ff]
      );
      idMap.push((queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!);
    }

    logAudit(db, user.id, 'CREATE', 'project_piece', req.project_id, `bulk_import ${req.rows.length} rows`);
    return this.getProjectPieces(db, req.project_id);
  }

  static listPieceMaterialRequirements(db: Database, projectPieceId: number): PieceMaterialRequirement[] {
    return queryRows(db,
      `SELECT r.id, r.project_piece_id, r.material_id, m.name as material_name, m.code as material_code, r.quantity_plan, r.notes, r.created_at
       FROM piece_material_requirements r JOIN materials m ON r.material_id = m.id
       WHERE r.project_piece_id = ? ORDER BY r.id ASC`,
      [projectPieceId], r => r as PieceMaterialRequirement
    );
  }

  static createPieceMaterialRequirement(db: Database, user: UserWithRole, req: CreatePieceMaterialRequirementRequest): PieceMaterialRequirement {
    if (!canManagePieces(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (req.quantity_plan <= 0) throw CommandError.badRequest('Cantitate plan invalidă');

    db.run(
      'INSERT INTO piece_material_requirements (project_piece_id, material_id, quantity_plan, notes) VALUES (?, ?, ?, ?)',
      [req.project_piece_id, req.material_id, req.quantity_plan, req.notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    logAudit(db, user.id, 'CREATE', 'piece_material_requirement', id, null);

    const result = queryOne(db,
      `SELECT r.id, r.project_piece_id, r.material_id, m.name as material_name, m.code as material_code, r.quantity_plan, r.notes, r.created_at
       FROM piece_material_requirements r JOIN materials m ON r.material_id = m.id WHERE r.id = ?`,
      [id], r => r as PieceMaterialRequirement);
    if (!result) throw CommandError.notFound('Cerință material negăsită');
    return result;
  }

  static deletePieceMaterialRequirement(db: Database, user: UserWithRole, id: number): void {
    if (!canManagePieces(db, user)) throw CommandError.forbidden('Acces refuzat');
    db.run('DELETE FROM piece_material_requirements WHERE id = ?', [id]);
    logAudit(db, user.id, 'DELETE', 'piece_material_requirement', id, null);
  }

  





  static deleteProjectPiece(db: Database, user: UserWithRole, id: number): void {
    if (!canFullPieceEdit(db, user)) throw CommandError.forbidden('Acces refuzat');
    this.getPieceById(db, id); 
    db.run('DELETE FROM project_pieces WHERE id = ?', [id]);
    logAudit(db, user.id, 'DELETE', 'project_piece', id, null);
  }

  private static getPieceById(db: Database, id: number): ProjectPiece {
    const result = queryOne(db, `${PIECE_SQL} WHERE p.id = ?`, [id], mapPiece);
    if (!result) throw CommandError.notFound('Piesă negăsită');
    return result;
  }
}
