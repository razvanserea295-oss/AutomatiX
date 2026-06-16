import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr, validateNumber } from '../middleware/validate';
import { roleHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';
import type { UserWithRole } from './authService';





export interface Material {
  id: number;
  code: string;
  name: string;
  unit: string;
  unit_cost: number;
  currency: string;
  stock: number;
  min_stock: number;
  category: string;
  supplier: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialRequest {
  code: string;
  name: string;
  unit: string;
  unit_cost: number;
  currency?: string | null;
  stock: number;
  min_stock: number;
  category: string;
  supplier?: string | null;
  location?: string | null;
}

export interface UpdateMaterialRequest {
  id: number;
  name?: string;
  unit_cost?: number;
  currency?: string | null;
  stock?: number;
  min_stock?: number;
  category?: string;
  supplier?: string | null;
  location?: string | null;
}

export interface MaterialConsumptionWithDetails {
  id: number;
  project_id: number;
  project_name: string;
  material_id: number;
  material_name: string;
  stage_id: number | null;
  stage_name: string | null;
  project_piece_id: number | null;
  piece_name: string | null;
  quantity: number;
  unit_cost: number;
  loss_rate: number;
  date: string;
  notes: string | null;
  created_by: string;
}

export interface CreateMaterialConsumptionRequest {
  project_id: number;
  material_id: number;
  stage_id?: number | null;
  project_piece_id?: number | null;
  quantity: number;
  unit_cost: number;
  loss_rate: number;
  date: string;
  notes?: string | null;
}





function hasPermission(db: Database, roleId: number, expected: string[]): boolean {
  return roleHasAny(db, roleId, expected);
}

function audit(db: Database, userId: number, action: string, entityType: string, entityId: number | null): void {
  try { logAuditEvent(db, userId, action, entityType, entityId); } catch {  }
}





export class MaterialService {
  static getMaterials(db: Database): Material[] {
    const stmt = db.prepare(
      `SELECT id, code, name, unit, unit_cost, currency, stock, min_stock, category, supplier, location, created_at, updated_at
       FROM materials ORDER BY name ASC`
    );
    const results: Material[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as number,
        code: row.code as string,
        name: row.name as string,
        unit: row.unit as string,
        unit_cost: row.unit_cost as number,
        currency: (row.currency as string) || 'RON',
        stock: row.stock as number,
        min_stock: row.min_stock as number,
        category: row.category as string,
        supplier: row.supplier as string | null,
        location: row.location as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      });
    }
    stmt.free();
    return results;
  }

  static getMaterial(db: Database, id: number): Material {
    const stmt = db.prepare(
      `SELECT id, code, name, unit, unit_cost, currency, stock, min_stock, category, supplier, location, created_at, updated_at
       FROM materials WHERE id = ?`
    );
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Resursă negăsită');
    }
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: row.id as number,
      code: row.code as string,
      name: row.name as string,
      unit: row.unit as string,
      unit_cost: row.unit_cost as number,
      currency: (row.currency as string) || 'RON',
      stock: row.stock as number,
      min_stock: row.min_stock as number,
      category: row.category as string,
      supplier: row.supplier as string | null,
      location: row.location as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  static createMaterial(db: Database, user: UserWithRole, req: CreateMaterialRequest): Material {
    if (!hasPermission(db, user.role_id, ['all', 'manage_costs', 'manage_projects'])) {
      throw CommandError.forbidden('Acces refuzat');
    }
    
    
    
    
    
    
    
    const v = {
      name: capStr(req.name, 250, 'name', { required: true })!,
      unit: capStr(req.unit, 32, 'unit') || 'buc',
      category: capStr(req.category, 100, 'category') || 'altele',
      supplier: capStr(req.supplier, 200, 'supplier'),
      location: capStr(req.location, 100, 'location'),
      unit_cost: validateNumber(req.unit_cost, 'unit_cost', { min: 0, max: 1e8 }) ?? 0,
      currency: capStr(req.currency, 8, 'currency') || 'RON',
      stock: validateNumber(req.stock, 'stock', { min: 0, max: 1e9 }) ?? 0,
      min_stock: validateNumber(req.min_stock, 'min_stock', { min: 0, max: 1e9 }) ?? 0,
    };
    let code = capStr(req.code, 64, 'code') || '';
    if (!code) {
      
      
      
      const stmt = db.prepare(
        "SELECT code FROM materials WHERE code LIKE 'MAT-%' ORDER BY CAST(SUBSTR(code, 5) AS INTEGER) DESC LIMIT 1",
      );
      let next = 1;
      if (stmt.step()) {
        const last = stmt.get()[0] as string;
        const n = parseInt(last.replace(/^MAT-/, ''), 10);
        if (Number.isFinite(n)) next = n + 1;
      }
      stmt.free();
      code = `MAT-${String(next).padStart(4, '0')}`;
    }

    db.run(
      `INSERT INTO materials (code, name, unit, unit_cost, currency, stock, min_stock, category, supplier, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, v.name, v.unit, v.unit_cost, v.currency, v.stock, v.min_stock, v.category, v.supplier, v.location]
    );

    
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    audit(db, user.id, 'CREATE', 'material', id);
    return this.getMaterial(db, id);
  }

  static updateMaterial(db: Database, user: UserWithRole, req: UpdateMaterialRequest): Material {
    if (!hasPermission(db, user.role_id, ['all', 'manage_costs', 'manage_projects'])) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const cur = this.getMaterial(db, req.id);

    const v = {
      name: capStr(req.name, 250, 'name'),
      unit_cost: validateNumber(req.unit_cost, 'unit_cost', { min: 0, max: 1e8 }),
      currency: capStr(req.currency, 8, 'currency') || undefined,
      stock: validateNumber(req.stock, 'stock', { min: 0, max: 1e9 }),
      min_stock: validateNumber(req.min_stock, 'min_stock', { min: 0, max: 1e9 }),
      category: capStr(req.category, 100, 'category'),
      supplier: req.supplier !== undefined ? capStr(req.supplier, 200, 'supplier') : undefined,
      location: req.location !== undefined ? capStr(req.location, 100, 'location') : undefined,
    };

    db.run(
      `UPDATE materials SET name = ?, unit_cost = ?, currency = ?, stock = ?, min_stock = ?, category = ?, supplier = ?, location = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        v.name ?? cur.name,
        v.unit_cost ?? cur.unit_cost,
        v.currency ?? cur.currency,
        v.stock ?? cur.stock,
        v.min_stock ?? cur.min_stock,
        v.category ?? cur.category,
        v.supplier !== undefined ? v.supplier : cur.supplier,
        v.location !== undefined ? v.location : cur.location,
        req.id,
      ]
    );

    audit(db, user.id, 'UPDATE', 'material', req.id);
    return this.getMaterial(db, req.id);
  }

  static deleteMaterial(db: Database, user: UserWithRole, id: number): void {
    if (!hasPermission(db, user.role_id, ['all', 'manage_costs', 'manage_projects'])) {
      throw CommandError.forbidden('Acces refuzat');
    }
    
    this.getMaterial(db, id);
    db.run('DELETE FROM materials WHERE id = ?', [id]);
    audit(db, user.id, 'DELETE', 'material', id);
  }

  static getConsumptions(db: Database, projectId?: number | null): MaterialConsumptionWithDetails[] {
    let sql = `SELECT mc.id, mc.project_id, p.name as project_name, mc.material_id, m.name as material_name,
                    mc.stage_id, ps.name as stage_name, mc.project_piece_id, pp.name as piece_name,
                    mc.quantity, mc.unit_cost, mc.loss_rate, mc.date, mc.notes,
                    u.full_name as created_by
             FROM material_consumptions mc
             JOIN projects p ON mc.project_id = p.id
             JOIN materials m ON mc.material_id = m.id
             LEFT JOIN project_stages ps ON mc.stage_id = ps.id
             LEFT JOIN project_pieces pp ON mc.project_piece_id = pp.id
             JOIN users u ON mc.created_by = u.id`;

    if (projectId != null) {
      sql += ' WHERE mc.project_id = ?';
    }
    sql += ' ORDER BY mc.date DESC, mc.created_at DESC';

    const stmt = db.prepare(sql);
    if (projectId != null) {
      stmt.bind([projectId]);
    }

    const results: MaterialConsumptionWithDetails[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as number,
        project_id: row.project_id as number,
        project_name: row.project_name as string,
        material_id: row.material_id as number,
        material_name: row.material_name as string,
        stage_id: row.stage_id as number | null,
        stage_name: row.stage_name as string | null,
        project_piece_id: row.project_piece_id as number | null,
        piece_name: row.piece_name as string | null,
        quantity: row.quantity as number,
        unit_cost: row.unit_cost as number,
        loss_rate: row.loss_rate as number,
        date: row.date as string,
        notes: row.notes as string | null,
        created_by: row.created_by as string,
      });
    }
    stmt.free();
    return results;
  }

  static createConsumption(
    db: Database,
    user: UserWithRole,
    req: CreateMaterialConsumptionRequest
  ): MaterialConsumptionWithDetails {
    if (!hasPermission(db, user.role_id, ['all', 'manage_production', 'manage_projects', 'manage_costs'])) {
      throw CommandError.forbidden('Acces refuzat');
    }
    if (req.quantity <= 0) {
      throw CommandError.badRequest('Quantity trebuie > 0');
    }

    
    if (req.project_piece_id != null) {
      const ppStmt = db.prepare('SELECT project_id FROM project_pieces WHERE id = ?');
      ppStmt.bind([req.project_piece_id]);
      if (!ppStmt.step()) {
        ppStmt.free();
        throw CommandError.badRequest('Reper invalid pentru consum');
      }
      const ppProj = ppStmt.get()[0] as number;
      ppStmt.free();
      if (ppProj !== req.project_id) {
        throw CommandError.badRequest('Reperul nu aparține proiectului selectat');
      }
    }

    
    const stockStmt = db.prepare('SELECT stock FROM materials WHERE id = ?');
    stockStmt.bind([req.material_id]);
    if (!stockStmt.step()) {
      stockStmt.free();
      throw CommandError.notFound('Resursă negăsită');
    }
    const currentStock = stockStmt.get()[0] as number;
    stockStmt.free();
    if (currentStock < req.quantity) {
      throw CommandError.badRequest('Stoc insuficient');
    }

    db.run(
      `INSERT INTO material_consumptions (project_id, material_id, stage_id, project_piece_id, quantity, unit_cost, loss_rate, date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.project_id, req.material_id, req.stage_id ?? null, req.project_piece_id ?? null,
       req.quantity, req.unit_cost, req.loss_rate, req.date, req.notes ?? null, user.id]
    );

    db.run(
      "UPDATE materials SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?",
      [req.quantity, req.material_id]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    audit(db, user.id, 'CREATE', 'consumption', id);

    
    const fetchStmt = db.prepare(
      `SELECT mc.id, mc.project_id, p.name as project_name, mc.material_id, m.name as material_name,
              mc.stage_id, ps.name as stage_name, mc.project_piece_id, pp.name as piece_name,
              mc.quantity, mc.unit_cost, mc.loss_rate, mc.date, mc.notes,
              u.full_name as created_by
       FROM material_consumptions mc
       JOIN projects p ON mc.project_id = p.id
       JOIN materials m ON mc.material_id = m.id
       LEFT JOIN project_stages ps ON mc.stage_id = ps.id
       LEFT JOIN project_pieces pp ON mc.project_piece_id = pp.id
       JOIN users u ON mc.created_by = u.id
       WHERE mc.id = ?`
    );
    fetchStmt.bind([id]);
    if (!fetchStmt.step()) {
      fetchStmt.free();
      throw CommandError.internal('Eroare la citirea consumului creat');
    }
    const row = fetchStmt.getAsObject();
    fetchStmt.free();

    return {
      id: row.id as number,
      project_id: row.project_id as number,
      project_name: row.project_name as string,
      material_id: row.material_id as number,
      material_name: row.material_name as string,
      stage_id: row.stage_id as number | null,
      stage_name: row.stage_name as string | null,
      project_piece_id: row.project_piece_id as number | null,
      piece_name: row.piece_name as string | null,
      quantity: row.quantity as number,
      unit_cost: row.unit_cost as number,
      loss_rate: row.loss_rate as number,
      date: row.date as string,
      notes: row.notes as string | null,
      created_by: row.created_by as string,
    };
  }
}
