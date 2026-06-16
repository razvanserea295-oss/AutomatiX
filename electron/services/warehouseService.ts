import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';





export interface WarehouseLocation {
  id: number; code: string; name: string; location_type: string;
}

export interface CreateWarehouseLocationRequest {
  code: string; name: string; location_type?: string | null;
}

export interface StockMovement {
  id: number; material_id: number; material_name: string; material_code: string;
  location_name: string | null; movement_type: string; quantity: number;
  reference_type: string | null; reference_id: number | null;
  project_name: string | null; notes: string | null;
  created_by_name: string | null; created_at: string;
}

export interface RecordMovementRequest {
  material_id: number; location_id?: number | null; movement_type: string;
  quantity: number; reference_type?: string | null; reference_id?: number | null;
  project_id?: number | null; notes?: string | null;
}

export interface StockReservation {
  id: number; project_id: number; project_name: string;
  node_id: number; node_name: string; material_id: number; material_name: string;
  quantity_reserved: number; quantity_issued: number; status: string; created_at: string;
}

export interface CreateReservationRequest {
  project_id: number; node_id: number; material_id: number; quantity_reserved: number;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
const MOVEMENT_SQL = `SELECT sm.id, sm.material_id, m.name as material_name, m.code as material_code,
       wl.name as location_name, sm.movement_type, sm.quantity, sm.reference_type, sm.reference_id,
       p.name as project_name, sm.notes, u.full_name as created_by_name, sm.created_at
FROM stock_movements sm JOIN materials m ON m.id = sm.material_id
LEFT JOIN warehouse_locations wl ON wl.id = sm.location_id
LEFT JOIN projects p ON p.id = sm.project_id
LEFT JOIN users u ON u.id = sm.created_by`;

function mapMovement(row: any): StockMovement {
  return row as StockMovement;
}



const RESERVATION_SQL = `SELECT sr.id, sr.project_id, p.name as project_name, sr.node_id, n.name as node_name,
       sr.material_id, m.name as material_name, sr.quantity_reserved, sr.quantity_issued, sr.status, sr.created_at
FROM stock_reservations sr JOIN projects p ON p.id = sr.project_id
LEFT JOIN engineering_nodes n ON n.id = sr.node_id JOIN materials m ON m.id = sr.material_id`;

function mapReservation(row: any): StockReservation {
  return row as StockReservation;
}





export class WarehouseService {
  static getLocations(db: Database): WarehouseLocation[] {
    return queryRows(db,
      'SELECT id, code, name, location_type FROM warehouse_locations ORDER BY code',
      [], (row) => row as WarehouseLocation
    );
  }

  static createLocation(db: Database, req: CreateWarehouseLocationRequest): WarehouseLocation {
    const code = req.code.trim();
    const name = req.name.trim();
    if (!code || !name) throw CommandError.badRequest('Cod si nume sunt obligatorii');
    const locType = req.location_type || 'depozit';
    db.run('INSERT INTO warehouse_locations (code, name, location_type) VALUES (?, ?, ?)', [code, name, locType]);
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    const result = queryOne(db, 'SELECT id, code, name, location_type FROM warehouse_locations WHERE id = ?', [id],
      (row) => row as WarehouseLocation);
    if (!result) throw CommandError.internal('Eroare la creare locație');
    return result;
  }

  static getMovements(db: Database, materialId?: number | null): StockMovement[] {
    if (materialId) {
      return queryRows(db, `${MOVEMENT_SQL} WHERE sm.material_id = ? ORDER BY sm.created_at DESC LIMIT 200`,
        [materialId], mapMovement);
    }
    return queryRows(db, `${MOVEMENT_SQL} ORDER BY sm.created_at DESC LIMIT 200`, [], mapMovement);
  }

  static recordMovement(db: Database, user: UserWithRole, req: RecordMovementRequest): StockMovement {
    const valid = ['in', 'out', 'transfer', 'adjustment'];
    if (!valid.includes(req.movement_type)) {
      throw CommandError.badRequest(`Tip miscare invalid: ${req.movement_type}`);
    }

    db.run(
      `INSERT INTO stock_movements (material_id, location_id, movement_type, quantity, reference_type, reference_id, project_id, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.material_id, req.location_id ?? null, req.movement_type, req.quantity,
       req.reference_type ?? null, req.reference_id ?? null, req.project_id ?? null, req.notes ?? null, user.id]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;

    
    if (req.movement_type === 'in') {
      db.run("UPDATE materials SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?", [req.quantity, req.material_id]);
    } else if (req.movement_type === 'out') {
      db.run("UPDATE materials SET stock = MAX(stock - ?, 0), updated_at = datetime('now') WHERE id = ?", [req.quantity, req.material_id]);
    } else if (req.movement_type === 'adjustment') {
      db.run("UPDATE materials SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?", [req.quantity, req.material_id]);
    }

    
    
    
    
    if (req.movement_type === 'out' && req.project_id != null) {
      const unitCost = (queryOne(db, 'SELECT unit_cost FROM materials WHERE id = ?', [req.material_id], r => (r.unit_cost as number) ?? 0)) ?? 0;
      const today = new Date().toISOString().split('T')[0];
      db.run(
        `INSERT INTO material_consumptions
           (project_id, material_id, quantity, unit_cost, loss_rate, date, notes, created_by)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
        [req.project_id, req.material_id, req.quantity, unitCost, today,
         req.notes ?? `Eliberare din depozit (mișcare #${id})`, user.id]
      );
    }

    const result = queryOne(db, `${MOVEMENT_SQL} WHERE sm.id = ?`, [id], mapMovement);
    if (!result) throw CommandError.internal('Eroare la înregistrare mișcare');
    return result;
  }

  static getReservations(db: Database, projectId?: number | null): StockReservation[] {
    if (projectId) {
      return queryRows(db, `${RESERVATION_SQL} WHERE sr.project_id = ? ORDER BY sr.created_at DESC`,
        [projectId], mapReservation);
    }
    return queryRows(db, `${RESERVATION_SQL} ORDER BY sr.created_at DESC`, [], mapReservation);
  }

  static createReservation(db: Database, req: CreateReservationRequest): StockReservation {
    db.run(
      'INSERT INTO stock_reservations (project_id, node_id, material_id, quantity_reserved) VALUES (?, ?, ?, ?)',
      [req.project_id, req.node_id, req.material_id, req.quantity_reserved]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    const result = queryOne(db, `${RESERVATION_SQL} WHERE sr.id = ?`, [id], mapReservation);
    if (!result) throw CommandError.internal('Eroare la creare rezervare');
    return result;
  }

  static issueReserved(db: Database, user: UserWithRole, reservationId: number, quantity: number): StockReservation {
    const row = queryOne(db,
      'SELECT material_id, quantity_reserved, quantity_issued, project_id FROM stock_reservations WHERE id = ?',
      [reservationId],
      r => ({ material_id: r.material_id as number, reserved: r.quantity_reserved as number, issued: r.quantity_issued as number, project_id: r.project_id as number })
    );
    if (!row) throw CommandError.notFound('Rezervare negasita');
    if (row.issued + quantity > row.reserved) throw CommandError.badRequest('Cantitatea depaseste rezervarea');

    const newIssued = row.issued + quantity;
    const newStatus = newIssued >= row.reserved ? 'fully_issued' : 'partially_issued';

    db.run('UPDATE stock_reservations SET quantity_issued = ?, status = ? WHERE id = ?',
      [newIssued, newStatus, reservationId]);

    
    this.recordMovement(db, user, {
      material_id: row.material_id, movement_type: 'out', quantity,
      reference_type: 'reservation', reference_id: reservationId, project_id: row.project_id,
    });

    const result = queryOne(db, `${RESERVATION_SQL} WHERE sr.id = ?`, [reservationId], mapReservation);
    if (!result) throw CommandError.internal('Eroare la eliberare rezervare');
    return result;
  }
}
