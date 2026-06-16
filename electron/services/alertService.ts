import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';
import { userHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';





export interface Alert {
  id: number;
  project_id: number | null;
  project_name: string | null;
  type: string;
  severity: string;
  title: string;
  message: string;
  acknowledged: boolean;
  acknowledged_by: number | null;
  acknowledged_by_name: string | null;
  created_at: string;
  acknowledged_at: string | null;
}

export interface CreateAlertRequest {
  project_id?: number | null;
  type: string;
  severity: string;
  title: string;
  message: string;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
function canManageAlerts(db: Database, user: UserWithRole): boolean {
  return userHasAny(db, user, ['all', 'manage_alerts', 'manage_projects', 'manage_production'],
    ['alerts']);
}

function audit(db: Database, userId: number, action: string, entityType: string, entityId: number | null): void {
  logAuditEvent(db, userId, action, entityType, entityId);
}

function mapAlertRow(row: any): Alert {
  return {
    id: row.id as number, project_id: row.project_id as number | null,
    project_name: row.project_name as string | null, type: row.type as string,
    severity: row.severity as string, title: row.title as string, message: row.message as string,
    acknowledged: (row.acknowledged as number) === 1,
    acknowledged_by: row.acknowledged_by as number | null,
    acknowledged_by_name: row.acknowledged_by_name as string | null,
    created_at: row.created_at as string, acknowledged_at: row.acknowledged_at as string | null,
  };
}





export class AlertService {
  static getAlerts(db: Database): Alert[] {
    return queryRows(db,
      `SELECT a.id, a.project_id, p.name as project_name, a.type, a.severity, a.title, a.message,
              a.acknowledged, a.acknowledged_by, u.full_name as acknowledged_by_name,
              a.created_at, a.acknowledged_at
       FROM alerts a
       LEFT JOIN projects p ON p.id = a.project_id
       LEFT JOIN users u ON u.id = a.acknowledged_by
       ORDER BY a.acknowledged ASC, a.created_at DESC`,
      [], mapAlertRow
    );
  }

  static createAlert(db: Database, user: UserWithRole, req: CreateAlertRequest): Alert {
    if (!canManageAlerts(db, user)) throw CommandError.forbidden('Acces refuzat');
    db.run(
      'INSERT INTO alerts (project_id, type, severity, title, message) VALUES (?, ?, ?, ?, ?)',
      [req.project_id ?? null, req.type, req.severity, req.title, req.message]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    audit(db, user.id, 'CREATE', 'alert', id);
    return this.getAlert(db, id);
  }

  static acknowledgeAlert(db: Database, user: UserWithRole, alertId: number): void {
    if (!canManageAlerts(db, user)) throw CommandError.forbidden('Acces refuzat');
    db.run(
      "UPDATE alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime('now') WHERE id = ?",
      [user.id, alertId]
    );
    audit(db, user.id, 'ACKNOWLEDGE', 'alert', alertId);
  }

  static updateAlert(db: Database, user: UserWithRole, req: {
    id: number; project_id?: number | null;
    type?: string | null; alert_type?: string | null;
    severity?: string | null; title?: string | null; message?: string | null;
    acknowledged?: boolean | null;
  }): Alert {
    if (!canManageAlerts(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (!req.id) throw CommandError.badRequest('ID alerta invalid');

    const type = req.type ?? req.alert_type ?? null;

    db.run(
      `UPDATE alerts SET
         project_id   = COALESCE(?, project_id),
         type         = COALESCE(?, type),
         severity     = COALESCE(?, severity),
         title        = COALESCE(?, title),
         message      = COALESCE(?, message),
         acknowledged = COALESCE(?, acknowledged)
       WHERE id = ?`,
      [req.project_id ?? null, type, req.severity ?? null, req.title ?? null,
       req.message ?? null, req.acknowledged == null ? null : (req.acknowledged ? 1 : 0), req.id]
    );
    audit(db, user.id, 'UPDATE', 'alert', req.id);
    return this.getAlert(db, req.id);
  }

  static getAlert(db: Database, alertId: number): Alert {
    const result = queryOne(db,
      `SELECT a.id, a.project_id, p.name as project_name, a.type, a.severity, a.title, a.message,
              a.acknowledged, a.acknowledged_by, u.full_name as acknowledged_by_name,
              a.created_at, a.acknowledged_at
       FROM alerts a LEFT JOIN projects p ON p.id = a.project_id
       LEFT JOIN users u ON u.id = a.acknowledged_by WHERE a.id = ?`,
      [alertId], mapAlertRow
    );
    if (!result) throw CommandError.notFound('Alertă negăsită');
    return result;
  }

  


















  static generateSystemAlerts(db: Database): number {
    let generated = 0;

    
    
    
    
    
    
    
    
    
    const COOLDOWN = "(a.acknowledged = 0 OR julianday('now') - julianday(a.created_at) < 7)";

    const alertQueries = [
      
      `INSERT INTO alerts (project_id, type, severity, title, message)
       SELECT id, 'deadline', 'high', 'Deadline apropiat', 'Proiectul ' || name || ' are deadline în mai puțin de 7 zile'
       FROM projects WHERE deadline IS NOT NULL AND status != 'finalizat'
       AND (julianday(deadline) - julianday(date('now'))) < 7
       AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.project_id = projects.id AND a.type = 'deadline' AND ${COOLDOWN})`,

      
      `INSERT INTO alerts (project_id, type, severity, title, message)
       SELECT id, 'blocked', 'critical', 'Proiect blocat', 'Proiectul ' || name || ' necesită atenție imediată'
       FROM projects WHERE status IN ('blocked', 'blocat')
       AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.project_id = projects.id AND a.type = 'blocked' AND ${COOLDOWN})`,

      
      `INSERT INTO alerts (project_id, type, severity, title, message)
       SELECT id, 'cost_warning', 'high', 'Depășire buget', 'Costurile calculate pentru proiectul ' || name || ' depășesc bugetul estimat'
       FROM projects p WHERE p.estimated_cost > 0
       AND COALESCE((SELECT SUM(quantity * unit_cost) FROM material_consumptions WHERE project_id = p.id), 0) > p.estimated_cost
       AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.project_id = p.id AND a.type = 'cost_warning' AND ${COOLDOWN})`,

      
      `INSERT INTO alerts (project_id, type, severity, title, message)
       SELECT NULL, 'stock_warning', 'high', 'Stoc critic: ' || name, 'Stocul a scăzut sub limita minimă: ' || stock || ' ' || unit
       FROM materials WHERE stock <= min_stock
       AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.type = 'stock_warning' AND a.title = ('Stoc critic: ' || materials.name) AND ${COOLDOWN})`,

      
      `INSERT INTO alerts (project_id, type, severity, title, message)
       SELECT id, 'stage_delayed', 'medium', 'Proiect întârziat', 'Proiectul ' || name || ' are status întârziat'
       FROM projects WHERE status IN ('delayed', 'întârziat')
       AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.project_id = projects.id AND a.type = 'stage_delayed' AND ${COOLDOWN})`,
    ];

    for (const sql of alertQueries) {
      db.run(sql);
      generated += db.getRowsModified();
    }

    return generated;
  }
}
