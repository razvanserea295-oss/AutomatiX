import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';





export interface EngineeringNode {
  id: number; project_id: number; parent_id: number | null;
  node_type: string; name: string; code: string | null;
  quantity: number; resolution: string; status: string;
  sort_order: number; specs: string | null; notes: string | null;
  source_library_id: number | null; children: EngineeringNode[];
}

export interface CreateEngineeringNodeRequest {
  project_id: number; parent_id?: number | null; node_type: string;
  name: string; code?: string | null; quantity?: number | null;
  resolution?: string | null; specs?: string | null; notes?: string | null;
}

export interface UpdateEngineeringNodeRequest {
  id: number; name?: string | null; code?: string | null;
  quantity?: number | null; resolution?: string | null; status?: string | null;
  sort_order?: number | null; specs?: string | null; notes?: string | null;
}

export interface MoveNodeRequest {
  node_id: number; new_parent_id: number | null; sort_order?: number | null;
}

export interface EngineeringBomItem {
  id: number; node_id: number; node_name: string;
  material_id: number | null; material_name: string | null;
  standard_part_id: number | null; standard_part_name: string | null;
  custom_part_id: number | null; custom_part_name: string | null;
  quantity: number; notes: string | null;
}

export interface AddBomItemRequest {
  node_id: number; material_id?: number | null;
  standard_part_id?: number | null; custom_part_id?: number | null;
  quantity: number; notes?: string | null;
}

export interface MaterialNeedRow {
  material_id: number; material_name: string; material_code: string;
  unit: string; total_needed: number; in_stock: number;
  reserved: number; available: number; to_order: number;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
function mapNode(row: any): EngineeringNode {
  return {
    id: row.id as number, project_id: row.project_id as number,
    parent_id: row.parent_id as number | null, node_type: row.node_type as string,
    name: row.name as string, code: row.code as string | null,
    quantity: (row.quantity as number) || 1, resolution: row.resolution as string,
    status: row.status as string, sort_order: (row.sort_order as number) || 0,
    specs: row.specs as string | null, notes: row.notes as string | null,
    source_library_id: row.source_library_id as number | null, children: [],
  };
}

const NODE_SQL = `SELECT id, project_id, parent_id, node_type, name, code, quantity, resolution, status, sort_order, specs, notes, source_library_id
FROM engineering_nodes`;

function getNode(db: Database, id: number): EngineeringNode {
  const result = queryOne(db, `${NODE_SQL} WHERE id = ?`, [id], mapNode);
  if (!result) throw CommandError.notFound('Nod negasit');
  return result;
}

function validateParentType(db: Database, parentId: number | null, allowed: string[]): boolean {
  if (parentId === null || parentId === undefined) return false;
  const parentType = queryOne(db, 'SELECT node_type FROM engineering_nodes WHERE id = ?', [parentId], r => r.node_type as string);
  if (!parentType) throw CommandError.notFound('Nodul parinte nu exista');
  return allowed.includes(parentType);
}

function buildChildren(parentId: number | null, all: EngineeringNode[]): EngineeringNode[] {
  return all
    .filter(n => n.parent_id === parentId)
    .map(n => ({ ...n, children: buildChildren(n.id, all) }));
}





export class EngineeringService {
  static getTree(db: Database, projectId: number): EngineeringNode[] {
    const all = queryRows(db,
      `${NODE_SQL} WHERE project_id = ? ORDER BY CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END, parent_id, sort_order`,
      [projectId], mapNode
    );
    return buildChildren(null, all);
  }

  static createNode(db: Database, req: CreateEngineeringNodeRequest): EngineeringNode {
    
    switch (req.node_type) {
      case 'project_root':
        if (req.parent_id) throw CommandError.badRequest('ProjectRoot nu poate avea parinte');
        break;
      case 'system':
        if (!validateParentType(db, req.parent_id ?? null, ['project_root']))
          throw CommandError.badRequest('Tipul nodului nu e permis sub parintele selectat');
        break;
      case 'assembly':
        if (!validateParentType(db, req.parent_id ?? null, ['system']))
          throw CommandError.badRequest('Tipul nodului nu e permis sub parintele selectat');
        break;
      case 'subassembly':
        if (!validateParentType(db, req.parent_id ?? null, ['assembly', 'subassembly']))
          throw CommandError.badRequest('Tipul nodului nu e permis sub parintele selectat');
        break;
      case 'component':
        if (!validateParentType(db, req.parent_id ?? null, ['assembly', 'subassembly', 'component']))
          throw CommandError.badRequest('Tipul nodului nu e permis sub parintele selectat');
        break;
      case 'part':
        if (!validateParentType(db, req.parent_id ?? null, ['assembly', 'subassembly', 'component']))
          throw CommandError.badRequest('Tipul nodului nu e permis sub parintele selectat');
        break;
      default:
        throw CommandError.badRequest(`Tip nod invalid: ${req.node_type}`);
    }

    const nextSort = queryOne(db,
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_sort FROM engineering_nodes WHERE project_id = ? AND parent_id IS ?',
      [req.project_id, req.parent_id ?? null], r => r.next_sort as number) || 1;

    const resolution = req.resolution || 'placeholder';

    db.run(
      `INSERT INTO engineering_nodes (project_id, parent_id, node_type, name, code, quantity, resolution, sort_order, specs, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.project_id, req.parent_id ?? null, req.node_type, req.name, req.code ?? null,
       req.quantity ?? 1, resolution, nextSort, req.specs ?? null, req.notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    return getNode(db, id);
  }

  static updateNode(db: Database, req: UpdateEngineeringNodeRequest): EngineeringNode {
    db.run(
      `UPDATE engineering_nodes SET
          name = COALESCE(?, name), code = COALESCE(?, code), quantity = COALESCE(?, quantity),
          resolution = COALESCE(?, resolution), status = COALESCE(?, status),
          sort_order = COALESCE(?, sort_order), specs = COALESCE(?, specs), notes = COALESCE(?, notes),
          updated_at = datetime('now')
       WHERE id = ?`,
      [req.name ?? null, req.code ?? null, req.quantity ?? null, req.resolution ?? null,
       req.status ?? null, req.sort_order ?? null, req.specs ?? null, req.notes ?? null, req.id]
    );
    return getNode(db, req.id);
  }

  static deleteNode(db: Database, nodeId: number): void {
    const collectIds = (id: number, ids: number[]): void => {
      ids.push(id);
      const children = queryRows(db, 'SELECT id FROM engineering_nodes WHERE parent_id = ?', [id], r => r.id as number);
      for (const childId of children) collectIds(childId, ids);
    };
    const ids: number[] = [];
    collectIds(nodeId, ids);
    for (const id of ids) {
      db.run('DELETE FROM engineering_bom WHERE node_id = ?', [id]);
      db.run('DELETE FROM engineering_nodes WHERE id = ?', [id]);
    }
  }

  static moveNode(db: Database, req: MoveNodeRequest): EngineeringNode {
    db.run(
      "UPDATE engineering_nodes SET parent_id = ?, sort_order = COALESCE(?, sort_order), updated_at = datetime('now') WHERE id = ?",
      [req.new_parent_id, req.sort_order ?? null, req.node_id]
    );
    return getNode(db, req.node_id);
  }

  static releaseTree(db: Database, projectId: number): void {
    const placeholders = queryOne(db,
      "SELECT COUNT(*) as cnt FROM engineering_nodes WHERE project_id = ? AND node_type = 'part' AND resolution = 'placeholder'",
      [projectId], r => r.cnt as number) || 0;
    if (placeholders > 0) throw CommandError.badRequest(`${placeholders} piese placeholder nu sunt rezolvate`);
    db.run("UPDATE engineering_nodes SET status = 'released', updated_at = datetime('now') WHERE project_id = ?", [projectId]);
  }

  static getBom(db: Database, projectId: number): EngineeringBomItem[] {
    return queryRows(db,
      `SELECT b.id, b.node_id, n.name as node_name, b.material_id, m.name as material_name,
              b.standard_part_id, sp.name as standard_part_name, b.custom_part_id, cp.name as custom_part_name,
              b.quantity, b.notes
       FROM engineering_bom b JOIN engineering_nodes n ON n.id = b.node_id
       LEFT JOIN materials m ON m.id = b.material_id
       LEFT JOIN standard_parts sp ON sp.id = b.standard_part_id
       LEFT JOIN custom_parts cp ON cp.id = b.custom_part_id
       WHERE n.project_id = ? ORDER BY n.sort_order, b.id`,
      [projectId], (row) => row as EngineeringBomItem
    );
  }

  static addBomItem(db: Database, req: AddBomItemRequest): EngineeringBomItem {
    db.run(
      `INSERT INTO engineering_bom (node_id, material_id, standard_part_id, custom_part_id, quantity, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.node_id, req.material_id ?? null, req.standard_part_id ?? null,
       req.custom_part_id ?? null, req.quantity, req.notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;

    const result = queryOne(db,
      `SELECT b.id, b.node_id, n.name as node_name, b.material_id, m.name as material_name,
              b.standard_part_id, sp.name as standard_part_name, b.custom_part_id, cp.name as custom_part_name,
              b.quantity, b.notes
       FROM engineering_bom b JOIN engineering_nodes n ON n.id = b.node_id
       LEFT JOIN materials m ON m.id = b.material_id
       LEFT JOIN standard_parts sp ON sp.id = b.standard_part_id
       LEFT JOIN custom_parts cp ON cp.id = b.custom_part_id WHERE b.id = ?`,
      [id], (row) => row as EngineeringBomItem
    );
    if (!result) throw CommandError.internal('Eroare la adăugare BOM');
    return result;
  }

  static deleteBomItem(db: Database, bomId: number): void {
    db.run('DELETE FROM engineering_bom WHERE id = ?', [bomId]);
  }

  static getMaterialNeeds(db: Database, projectId: number): MaterialNeedRow[] {
    return queryRows(db,
      `SELECT m.id as material_id, m.name as material_name, m.code as material_code, m.unit,
              COALESCE(SUM(b.quantity * n.quantity), 0) as total_needed,
              m.stock as in_stock,
              COALESCE((SELECT SUM(sr.quantity_reserved - sr.quantity_issued) FROM stock_reservations sr WHERE sr.material_id = m.id AND sr.status != 'cancelled'), 0) as reserved
       FROM engineering_bom b
       JOIN engineering_nodes n ON n.id = b.node_id
       JOIN materials m ON m.id = b.material_id
       WHERE n.project_id = ? AND b.material_id IS NOT NULL
       GROUP BY m.id ORDER BY m.name`,
      [projectId],
      (row) => {
        const totalNeeded = (row.total_needed as number) || 0;
        const inStock = (row.in_stock as number) || 0;
        const reserved = (row.reserved as number) || 0;
        const available = Math.max(inStock - reserved, 0);
        const toOrder = Math.max(totalNeeded - available, 0);
        return {
          material_id: row.material_id as number, material_name: row.material_name as string,
          material_code: row.material_code as string, unit: row.unit as string,
          total_needed: totalNeeded, in_stock: inStock, reserved, available, to_order: toOrder,
        };
      }
    );
  }
}
