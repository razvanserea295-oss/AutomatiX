import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';





export interface InstalledStationWithDetails {
  id: number; project_id: number | null; project_name: string | null;
  client_id: number; client_name: string; code: string; name: string;
  location: string | null; station_type: string | null;
  delivery_date: string | null; commissioning_date: string | null;
  warranty_end_date: string | null; status: string;
  internal_manager_id: number | null; internal_manager_name: string | null;
  notes: string | null; created_at: string; updated_at: string;
}

export interface CreateStationRequest {
  project_id?: number | null; client_id: number; code: string; name: string;
  location?: string | null; station_type?: string | null;
  delivery_date?: string | null; commissioning_date?: string | null;
  warranty_end_date?: string | null; status?: string | null;
  internal_manager_id?: number | null; notes?: string | null;
}

export interface StationServiceIntervention {
  id: number; station_id: number; intervention_type: string; reason: string | null;
  problem_description: string | null; open_date: string; is_urgent: boolean;
  technician_id: number | null; status: string; close_date: string | null;
  final_notes: string | null; labor_cost: number | null;
  created_at: string; updated_at: string;
}

export interface CreateInterventionRequest {
  station_id: number; intervention_type?: string | null; reason?: string | null;
  problem_description?: string | null; is_urgent?: boolean;
  technician_id?: number | null; status?: string | null;
}

export interface StationMaintenancePlan {
  id: number; station_id: number; maintenance_type: string;
  periodicity_days: number; last_execution_date: string | null;
  next_execution_date: string | null; assignee_id: number | null;
  status: string; notes: string | null; created_at: string; updated_at: string;
}

export interface StationPartsRequest {
  id: number; station_id: number; intervention_id: number | null;
  material_id: number | null; part_name: string; part_code: string | null;
  quantity: number; reason: string | null; status: string;
  supplier: string | null; estimated_cost: number | null;
  order_date: string | null; received_date: string | null;
  notes: string | null; created_at: string; updated_at: string;
}

export interface StationActivityLog {
  id: number; station_id: number; user_id: number | null;
  action_type: string; description: string | null;
  old_value: string | null; new_value: string | null; created_at: string;
}

export interface StationChangeRequest {
  id: number; station_id: number; requested_by_name: string;
  request_date: string; description: string; priority: string;
  status: string; estimated_cost: number | null;
  estimated_deadline: string | null; assignee_id: number | null;
  notes: string | null; created_at: string; updated_at: string;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
const STATION_SQL = `SELECT s.id, s.project_id, p.name as project_name, s.client_id, c.name as client_name,
       s.code, s.name, s.location, s.station_type, s.delivery_date, s.commissioning_date,
       s.warranty_end_date, s.status, s.internal_manager_id, u.full_name as internal_manager_name,
       s.notes, s.created_at, s.updated_at
FROM installed_stations s LEFT JOIN projects p ON s.project_id = p.id
JOIN clients c ON s.client_id = c.id LEFT JOIN users u ON s.internal_manager_id = u.id`;

function mapStation(row: any): InstalledStationWithDetails {
  return {
    id: row.id as number, project_id: row.project_id as number | null,
    project_name: row.project_name as string | null, client_id: row.client_id as number,
    client_name: row.client_name as string, code: row.code as string, name: row.name as string,
    location: row.location as string | null, station_type: row.station_type as string | null,
    delivery_date: row.delivery_date as string | null, commissioning_date: row.commissioning_date as string | null,
    warranty_end_date: row.warranty_end_date as string | null, status: row.status as string,
    internal_manager_id: row.internal_manager_id as number | null,
    internal_manager_name: row.internal_manager_name as string | null,
    notes: row.notes as string | null, created_at: row.created_at as string, updated_at: row.updated_at as string,
  };
}





export class StationService {
  static getAllStations(db: Database): InstalledStationWithDetails[] {
    return queryRows(db, `${STATION_SQL} ORDER BY s.created_at DESC`, [], mapStation);
  }

  static getStationById(db: Database, id: number): InstalledStationWithDetails {
    const result = queryOne(db, `${STATION_SQL} WHERE s.id = ?`, [id], mapStation);
    if (!result) throw CommandError.notFound('Resursă negăsită');
    return result;
  }

  static createStation(db: Database, req: CreateStationRequest, user: UserWithRole): number {
    db.run(
      `INSERT INTO installed_stations (project_id, client_id, code, name, location, station_type, delivery_date, commissioning_date, warranty_end_date, status, internal_manager_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.project_id ?? null, req.client_id, req.code, req.name, req.location ?? null,
       req.station_type ?? null, req.delivery_date ?? null, req.commissioning_date ?? null,
       req.warranty_end_date ?? null, req.status || 'ACTIVE', req.internal_manager_id ?? null, req.notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    db.run(
      "INSERT INTO station_activity_log (station_id, user_id, action_type, description) VALUES (?, ?, 'CREATED', 'Stația a fost creată în sistem.')",
      [id, user.id]
    );
    return id;
  }

  static updateStation(db: Database, req: CreateStationRequest & { id: number }, user: UserWithRole): InstalledStationWithDetails {
    if (!req.id) throw CommandError.badRequest('ID statie invalid');

    
    db.run(
      `UPDATE installed_stations SET
         project_id           = COALESCE(?, project_id),
         client_id            = COALESCE(?, client_id),
         code                 = COALESCE(?, code),
         name                 = COALESCE(?, name),
         location             = COALESCE(?, location),
         station_type         = COALESCE(?, station_type),
         delivery_date        = COALESCE(?, delivery_date),
         commissioning_date   = COALESCE(?, commissioning_date),
         warranty_end_date    = COALESCE(?, warranty_end_date),
         status               = COALESCE(?, status),
         internal_manager_id  = COALESCE(?, internal_manager_id),
         notes                = COALESCE(?, notes),
         updated_at           = datetime('now')
       WHERE id = ?`,
      [req.project_id ?? null, req.client_id ?? null, req.code ?? null, req.name ?? null,
       req.location ?? null, req.station_type ?? null, req.delivery_date ?? null,
       req.commissioning_date ?? null, req.warranty_end_date ?? null, req.status ?? null,
       req.internal_manager_id ?? null, req.notes ?? null, req.id]
    );
    db.run(
      "INSERT INTO station_activity_log (station_id, user_id, action_type, description) VALUES (?, ?, 'UPDATED', 'Detaliile stației au fost actualizate.')",
      [req.id, user.id]
    );
    const station = StationService.getStationById(db, req.id);
    if (!station) throw CommandError.notFound('Statie negasita');
    return station;
  }

  static deleteStation(db: Database, stationId: number, user: UserWithRole): void {
    if (!stationId) throw CommandError.badRequest('ID statie invalid');
    
    try {
      db.run(
        "INSERT INTO station_activity_log (station_id, user_id, action_type, description) VALUES (?, ?, 'DELETED', 'Stația a fost ștearsă din sistem.')",
        [stationId, user.id]
      );
    } catch {  }
    db.run('DELETE FROM installed_stations WHERE id = ?', [stationId]);
  }

  static getStationInterventions(db: Database, stationId: number): StationServiceIntervention[] {
    return queryRows(db,
      `SELECT id, station_id, intervention_type, reason, problem_description, open_date, is_urgent, technician_id, status, close_date, final_notes, labor_cost, created_at, updated_at
       FROM station_service_interventions WHERE station_id = ? ORDER BY open_date DESC`,
      [stationId],
      (row) => ({ ...row, is_urgent: !!(row.is_urgent as number) } as StationServiceIntervention)
    );
  }

  static getAllInterventions(db: Database): StationServiceIntervention[] {
    return queryRows(db,
      `SELECT id, station_id, intervention_type, reason, problem_description, open_date, is_urgent, technician_id, status, close_date, final_notes, labor_cost, created_at, updated_at
       FROM station_service_interventions ORDER BY open_date DESC`,
      [],
      (row) => ({ ...row, is_urgent: !!(row.is_urgent as number) } as StationServiceIntervention)
    );
  }

  static createIntervention(db: Database, req: CreateInterventionRequest, user: UserWithRole): number {
    db.run(
      `INSERT INTO station_service_interventions (station_id, intervention_type, reason, problem_description, is_urgent, technician_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.station_id, req.intervention_type || 'SERVICE', req.reason ?? null,
       req.problem_description ?? null, (req.is_urgent ?? false) ? 1 : 0,
       req.technician_id ?? null, req.status || 'OPEN']
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    db.run(
      "INSERT INTO station_activity_log (station_id, user_id, action_type, description) VALUES (?, ?, 'SERVICE_OPENED', 'S-a deschis un tichet de intervenție nou.')",
      [req.station_id, user.id]
    );
    return id;
  }

  











  private static derivePlanStatus(stored: string, nextDate: string | null): string {
    if (stored === 'COMPLETED' || stored === 'IN_PROGRESS') return stored;
    if (!nextDate) return stored;
    const now = Date.now();
    const next = new Date(nextDate).getTime();
    if (Number.isNaN(next)) return stored;
    const dayMs = 86400000;
    if (next < now) return 'OVERDUE';
    if (next - now <= 14 * dayMs) return 'DUE_SOON';
    return 'PLANNED';
  }

  static getStationMaintenancePlans(db: Database, stationId: number): StationMaintenancePlan[] {
    const rows = queryRows<StationMaintenancePlan>(db,
      `SELECT id, station_id, maintenance_type, periodicity_days, last_execution_date, next_execution_date, assignee_id, status, notes, created_at, updated_at
       FROM station_maintenance_plans WHERE station_id = ? ORDER BY next_execution_date ASC`,
      [stationId], (row) => row as StationMaintenancePlan
    );
    return rows.map(r => ({ ...r, status: StationService.derivePlanStatus(r.status, r.next_execution_date) }));
  }

  static getAllMaintenancePlans(db: Database): StationMaintenancePlan[] {
    const rows = queryRows<StationMaintenancePlan>(db,
      `SELECT id, station_id, maintenance_type, periodicity_days, last_execution_date, next_execution_date, assignee_id, status, notes, created_at, updated_at
       FROM station_maintenance_plans ORDER BY next_execution_date ASC`,
      [], (row) => row as StationMaintenancePlan
    );
    return rows.map(r => ({ ...r, status: StationService.derivePlanStatus(r.status, r.next_execution_date) }));
  }

  static getStationParts(db: Database, stationId: number): StationPartsRequest[] {
    return queryRows(db,
      `SELECT id, station_id, intervention_id, material_id, part_name, part_code, quantity, reason, status, supplier, estimated_cost, order_date, received_date, notes, created_at, updated_at
       FROM station_parts_requests WHERE station_id = ? ORDER BY created_at DESC`,
      [stationId], (row) => row as StationPartsRequest
    );
  }

  static getAllParts(db: Database): StationPartsRequest[] {
    return queryRows(db,
      `SELECT id, station_id, intervention_id, material_id, part_name, part_code, quantity, reason, status, supplier, estimated_cost, order_date, received_date, notes, created_at, updated_at
       FROM station_parts_requests ORDER BY created_at DESC`,
      [], (row) => row as StationPartsRequest
    );
  }

  static getStationActivity(db: Database, stationId: number): StationActivityLog[] {
    return queryRows(db,
      `SELECT id, station_id, user_id, action_type, description, old_value, new_value, created_at
       FROM station_activity_log WHERE station_id = ? ORDER BY created_at DESC`,
      [stationId], (row) => row as StationActivityLog
    );
  }

  static getStationChangeRequests(db: Database, stationId: number): StationChangeRequest[] {
    return queryRows(db,
      `SELECT id, station_id, requested_by_name, request_date, description, priority, status, estimated_cost, estimated_deadline, assignee_id, notes, created_at, updated_at
       FROM station_change_requests WHERE station_id = ? ORDER BY created_at DESC`,
      [stationId], (row) => row as StationChangeRequest
    );
  }

  
  
  
  

  static createMaintenancePlan(db: Database, req: {
    station_id: number; maintenance_type: string; periodicity_days: number;
    next_execution_date: string; assignee_id?: number | null; notes?: string | null;
    last_execution_date?: string | null;
  }): StationMaintenancePlan {
    db.run(
      `INSERT INTO station_maintenance_plans
        (station_id, maintenance_type, periodicity_days, last_execution_date, next_execution_date, assignee_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.station_id, req.maintenance_type, req.periodicity_days,
       req.last_execution_date ?? null, req.next_execution_date,
       req.assignee_id ?? null, req.notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    const result = queryOne(db,
      `SELECT id, station_id, maintenance_type, periodicity_days, last_execution_date, next_execution_date, assignee_id, status, notes, created_at, updated_at
       FROM station_maintenance_plans WHERE id = ?`, [id], r => r as StationMaintenancePlan);
    if (!result) throw CommandError.internal('Eroare creare plan mentenanta');
    return result;
  }

  static deleteMaintenancePlan(db: Database, id: number): void {
    db.run('DELETE FROM station_maintenance_plans WHERE id = ?', [id]);
  }

  static createPartsRequest(db: Database, req: {
    station_id: number; intervention_id?: number | null; material_id?: number | null;
    part_name?: string | null; part_code?: string | null; quantity: number;
    reason?: string | null; supplier?: string | null; estimated_cost?: number | null;
    notes?: string | null;
  }): StationPartsRequest {
    db.run(
      `INSERT INTO station_parts_requests
        (station_id, intervention_id, material_id, part_name, part_code, quantity, reason, supplier, estimated_cost, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.station_id, req.intervention_id ?? null, req.material_id ?? null,
       req.part_name ?? null, req.part_code ?? null, req.quantity,
       req.reason ?? null, req.supplier ?? null, req.estimated_cost ?? 0,
       req.notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    const result = queryOne(db,
      `SELECT id, station_id, intervention_id, material_id, part_name, part_code, quantity, reason, status, supplier, estimated_cost, order_date, received_date, notes, created_at, updated_at
       FROM station_parts_requests WHERE id = ?`, [id], r => r as StationPartsRequest);
    if (!result) throw CommandError.internal('Eroare creare cerere piese');
    return result;
  }

  static deletePartsRequest(db: Database, id: number): void {
    db.run('DELETE FROM station_parts_requests WHERE id = ?', [id]);
  }

  





  static updatePartsRequestStatus(db: Database, id: number, newStatus: string): StationPartsRequest {
    const valid = ['IDENTIFIED', 'TO_ORDER', 'ORDERED', 'IN_TRANSIT', 'RECEIVED', 'INSTALLED', 'UNAVAILABLE'];
    if (!valid.includes(newStatus)) {
      throw CommandError.badRequest(`Status invalid: ${newStatus}`);
    }
    const orderDate = newStatus === 'ORDERED' ? new Date().toISOString().slice(0, 10) : null;
    const receivedDate = newStatus === 'RECEIVED' ? new Date().toISOString().slice(0, 10) : null;
    db.run(
      `UPDATE station_parts_requests
       SET status = ?,
           order_date = COALESCE(?, order_date),
           received_date = COALESCE(?, received_date),
           updated_at = datetime('now')
       WHERE id = ?`,
      [newStatus, orderDate, receivedDate, id]
    );

    
    const interventionRow = queryOne(db,
      'SELECT intervention_id FROM station_parts_requests WHERE id = ?',
      [id], r => r.intervention_id as number | null
    );
    if (interventionRow != null) {
      const pendingCount = queryOne(db,
        `SELECT COUNT(*) as cnt FROM station_parts_requests
         WHERE intervention_id = ? AND status NOT IN ('RECEIVED', 'INSTALLED', 'UNAVAILABLE')`,
        [interventionRow], r => r.cnt as number
      );
      if (pendingCount === 0) {
        db.run(
          `UPDATE station_service_interventions
           SET status = 'IN_PROGRESS', updated_at = datetime('now')
           WHERE id = ? AND status = 'WAITING_FOR_PARTS'`,
          [interventionRow]
        );
      }
    }

    const result = queryOne(db,
      `SELECT id, station_id, intervention_id, material_id, part_name, part_code, quantity, reason, status, supplier, estimated_cost, order_date, received_date, notes, created_at, updated_at
       FROM station_parts_requests WHERE id = ?`, [id], r => r as StationPartsRequest);
    if (!result) throw CommandError.notFound('Cerere piese negăsită');
    return result;
  }

  static createChangeRequest(db: Database, req: {
    station_id: number; requested_by_name?: string | null; description: string;
    priority?: string | null; estimated_cost?: number | null;
    estimated_deadline?: string | null; assignee_id?: number | null; notes?: string | null;
  }): StationChangeRequest {
    db.run(
      `INSERT INTO station_change_requests
        (station_id, requested_by_name, description, priority, estimated_cost, estimated_deadline, assignee_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.station_id, req.requested_by_name ?? null, req.description,
       req.priority ?? 'MEDIUM', req.estimated_cost ?? 0,
       req.estimated_deadline ?? null, req.assignee_id ?? null,
       req.notes ?? null]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    const result = queryOne(db,
      `SELECT id, station_id, requested_by_name, request_date, description, priority, status, estimated_cost, estimated_deadline, assignee_id, notes, created_at, updated_at
       FROM station_change_requests WHERE id = ?`, [id], r => r as StationChangeRequest);
    if (!result) throw CommandError.internal('Eroare creare cerere modificare');
    return result;
  }

  static deleteChangeRequest(db: Database, id: number): void {
    db.run('DELETE FROM station_change_requests WHERE id = ?', [id]);
  }
}
