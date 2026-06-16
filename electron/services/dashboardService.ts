import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { userHasAny } from '../db/permissions';
import type { UserWithRole } from './authService';





export interface DashboardSummary {
  projects_total: number;
  projects_active: number;
  projects_delayed: number;
  projects_blocked: number;
  projects_completed: number;
  workers_active: number;
  materials_critical_stock: number;
  documents_total: number;
  time_entries_last_7_days: number;
  projects_in_production: number;
  active_alerts: number;
  costs_materials_total: number;
  costs_labor_total: number;
  costs_other_total: number;
  revenue_total: number;
  profit_total: number;
}

export interface StageProgressItem {
  stage_name: string;
  projects_count: number;
}

export interface DeadlineRiskItem {
  project_id: number;
  project_name: string;
  deadline: string | null;
  status: string;
  stage_name: string;
  days_left: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  stage_progress: StageProgressItem[];
  deadline_risks: DeadlineRiskItem[];
}





function qNumber(db: Database, sql: string, params: any[] = []): number {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let value = 0;
  if (stmt.step()) {
    value = (stmt.get()[0] as number) || 0;
  }
  stmt.free();
  return value;
}

function hasDashboardAccess(db: Database, user: UserWithRole): boolean {
  return userHasAny(db, user, ['all', 'view_all', 'view_projects', 'view_finances'],
    ['dashboard']);
}





export interface DashboardRange {
  from?: string | null; 
  to?: string | null;
}

export class DashboardService {
  static getDashboard(db: Database, user: UserWithRole, range?: DashboardRange): DashboardData {
    if (!hasDashboardAccess(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    
    
    
    const from = range?.from || null;
    const to   = range?.to   || null;
    const dateClause = from && to
      ? ` AND date(date) >= date(?) AND date(date) <= date(?)`
      : '';
    const dateParams = from && to ? [from, to] : [];
    const serviceDateClause = from && to
      ? ` AND date(service_date) >= date(?) AND date(service_date) <= date(?)`
      : '';

    const projects_total = qNumber(db, "SELECT COUNT(*) FROM projects");
    
    
    
    
    const projects_active = qNumber(
      db,
      "SELECT COUNT(*) FROM projects WHERE status NOT IN ('finalizat', 'anulat')"
    );
    const projects_delayed = qNumber(db, "SELECT COUNT(*) FROM projects WHERE status = 'întârziat'");
    const projects_blocked = qNumber(db, "SELECT COUNT(*) FROM projects WHERE status = 'blocat'");
    const workers_active = 0;
    const materials_critical_stock = qNumber(db, "SELECT COUNT(*) FROM materials WHERE stock <= min_stock");
    const documents_total = qNumber(db, "SELECT COUNT(*) FROM documents");
    const time_entries_last_7_days = 0;
    const projects_in_production = qNumber(
      db,
      `SELECT COUNT(*) FROM projects
       WHERE stage_id IS NOT NULL AND stage_id NOT IN (1, 2, 9)
         AND status NOT IN ('finalizat', 'anulat', 'blocat')`
    );
    const projects_completed = qNumber(
      db,
      "SELECT COUNT(*) FROM projects WHERE status = 'finalizat'"
    );
    const active_alerts = qNumber(db, "SELECT COUNT(*) FROM alerts WHERE acknowledged = 0");

    const costs_materials_consumption = qNumber(
      db,
      `SELECT COALESCE(SUM(quantity * unit_cost * (1 + loss_rate)), 0) FROM material_consumptions WHERE 1=1${dateClause}`,
      dateParams
    );
    const costs_services_parts = qNumber(
      db,
      `SELECT COALESCE(SUM(parts_cost), 0) FROM piece_services WHERE status = 'finalizat'${serviceDateClause}`,
      dateParams
    );
    const costs_services_labor = qNumber(
      db,
      `SELECT COALESCE(SUM(labor_cost), 0) FROM piece_services WHERE status = 'finalizat'${serviceDateClause}`,
      dateParams
    );
    const costs_materials_total = costs_materials_consumption + costs_services_parts;
    const costs_labor_total = costs_services_labor;
    
    
    
    
    
    
    const eurToRon = (() => {
      const s = db.prepare('SELECT eur_to_ron_rate FROM company_settings WHERE id = 1');
      let r = 4.97;
      if (s.step()) { const v = s.get()[0] as number; if (v && v > 0) r = v; }
      s.free();
      return r;
    })();
    const costs_other_total = qNumber(
      db,
      `SELECT COALESCE(SUM(CASE WHEN UPPER(currency) = 'EUR' THEN amount * ${eurToRon} ELSE amount END), 0)
       FROM project_expenses WHERE 1=1${dateClause}`,
      dateParams
    );

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const revenue_total = from && to
      ? qNumber(
          db,
          `SELECT COALESCE(SUM(project_revenues.amount), 0)
           FROM project_revenues
           JOIN projects p ON p.id = project_revenues.project_id
           WHERE p.status NOT IN ('anulat')${dateClause}`,
          dateParams
        )
      : qNumber(
          db,
          `SELECT COALESCE(SUM(MAX(actual_amt, estimated_amt)), 0) FROM (
             SELECT p.id,
                    COALESCE((SELECT SUM(amount) FROM project_revenues WHERE project_id = p.id), 0) AS actual_amt,
                    COALESCE(p.estimated_value, 0) AS estimated_amt
             FROM projects p
             WHERE p.status NOT IN ('anulat')
           )`
        );
    const profit_total = revenue_total - costs_materials_total - costs_labor_total - costs_other_total;

    
    const stageStmt = db.prepare(
      `SELECT ps.name, COUNT(p.id)
       FROM project_stages ps
       LEFT JOIN projects p ON p.stage_id = ps.id
       GROUP BY ps.id, ps.name
       ORDER BY ps.order_index`
    );
    const stage_progress: StageProgressItem[] = [];
    while (stageStmt.step()) {
      const row = stageStmt.get();
      stage_progress.push({
        stage_name: (row[0] as string) || '',
        projects_count: (row[1] as number) || 0,
      });
    }
    stageStmt.free();

    
    const riskStmt = db.prepare(
      `SELECT p.id, p.name, p.deadline, p.status, ps.name,
              CAST(julianday(p.deadline) - julianday(date('now')) AS INTEGER) as days_left
       FROM projects p
       JOIN project_stages ps ON ps.id = p.stage_id
       WHERE p.deadline IS NOT NULL
       ORDER BY days_left ASC
       LIMIT 8`
    );
    const deadline_risks: DeadlineRiskItem[] = [];
    while (riskStmt.step()) {
      const row = riskStmt.get();
      deadline_risks.push({
        project_id: row[0] as number,
        project_name: (row[1] as string) || '',
        deadline: row[2] as string | null,
        status: (row[3] as string) || '',
        stage_name: (row[4] as string) || '',
        days_left: (row[5] as number) || 0,
      });
    }
    riskStmt.free();

    return {
      summary: {
        projects_total,
        projects_active,
        projects_delayed,
        projects_blocked,
        projects_completed,
        workers_active,
        materials_critical_stock,
        documents_total,
        time_entries_last_7_days,
        projects_in_production,
        active_alerts,
        costs_materials_total,
        costs_labor_total,
        costs_other_total,
        revenue_total,
        profit_total,
      },
      stage_progress,
      deadline_risks,
    };
  }
}
