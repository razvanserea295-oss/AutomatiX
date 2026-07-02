import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { roundMoney } from '../utils/money';
import { userHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';
import type { UserWithRole } from './authService';





export interface ProjectFinanceRow {
  project_id: number;
  project_name: string;
  status: string;
  priority: string;
  deadline: string | null;
  estimated_revenue: number;
  actual_revenue: number;
  estimated_material_cost: number;
  actual_material_cost: number;
  estimated_labor_cost: number;
  actual_labor_cost: number;
  extra_cost: number;
  total_cost: number;
  estimated_profit: number;
  actual_profit: number;
  margin_percent: number;
  risk_level: string;
  


  is_finalized: boolean;
}

export interface FinanceOverview {
  projects_count: number;
  total_estimated_revenue: number;
  total_actual_revenue: number;
  total_estimated_cost: number;
  total_actual_cost: number;
  total_estimated_profit: number;
  total_actual_profit: number;
  avg_margin_percent: number;
  projects_at_risk: number;
}

export interface FinanceCashFlowPoint {
  month: string;
  inflow: number;
}

export interface FinanceReceivableBucket {
  label: string;
  amount: number;
  projects_count: number;
}

export interface FinanceProjectAlert {
  project_id: number;
  project_name: string;
  estimated_revenue: number;
  actual_revenue: number;
  outstanding_amount: number;
  margin_percent: number;
  risk_level: string;
  deadline: string | null;
}

export interface ProjectRevenueEntry {
  id: number;
  project_id: number;
  project_name: string;
  amount: number;
  source: string;
  date: string;
  notes: string | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
}

export interface FinanceDocumentSnapshot {
  category: string;
  total_documents: number;
  recent_documents: number;
}

export interface ComplianceTask {
  id: number;
  title: string;
  area: string;
  project_id: number | null;
  project_name: string | null;
  owner_user_id: number | null;
  owner_name: string | null;
  status: string;
  priority: string;
  due_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface FinanceComplianceOverview {
  open_tasks: number;
  overdue_tasks: number;
  legal_tasks: number;
  accounting_tasks: number;
  document_snapshots: FinanceDocumentSnapshot[];
  upcoming_tasks: ComplianceTask[];
}

export interface FinanceInsights {
  collected_revenue: number;
  outstanding_revenue: number;
  overdue_outstanding: number;
  monthly_cash_flow: FinanceCashFlowPoint[];
  receivables_aging: FinanceReceivableBucket[];
  flagged_projects: FinanceProjectAlert[];
  latest_revenues: ProjectRevenueEntry[];
  compliance_overview: FinanceComplianceOverview;
}

export interface CreateProjectRevenueRequest {
  project_id: number;
  amount: number;
  source: string;
  date: string;
  notes?: string | null;
}

export interface CreateComplianceTaskRequest {
  title: string;
  area: string;
  project_id?: number | null;
  priority: string;
  due_date: string;
  notes?: string | null;
  status?: string | null;
}

export interface UpdateComplianceTaskRequest {
  id: number;
  status?: string;
  priority?: string;
  due_date?: string;
  notes?: string | null;
}

export interface UpsertFinanceOverrideRequest {
  project_id: number;
  manual_labor_cost: number;
  manual_material_cost: number;
  extra_cost?: number;
  discount_value?: number;
  notes?: string | null;
}





export interface InvoiceLine {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  project_id: number;
  project_name: string;
  client_id: number;
  client_name: string;
  type: string;
  status: string;
  currency: string;
  subtotal: number;
  tva_rate: number;
  tva_amount: number;
  total: number;
  paid_amount: number;
  remaining: number;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  lines: InvoiceLine[];
}

export interface CreateInvoiceLineInput {
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
}

export interface CreateFinanceInvoiceRequest {
  project_id: number;
  client_id: number;
  invoice_type?: string;
  currency?: string;
  issue_date: string;
  due_date: string;
  notes?: string | null;
  lines: CreateInvoiceLineInput[];
}

export interface UpdateInvoiceStatusRequest {
  invoice_id: number;
  status: string;
}

export interface RecordInvoicePaymentRequest {
  invoice_id: number;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference?: string | null;
  notes?: string | null;
}

export interface ProjectExpense {
  id: number;
  project_id: number;
  project_name: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  invoice_ref: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface CreateProjectExpenseRequest {
  project_id: number;
  category: string;
  description: string;
  amount: number;
  currency?: string;
  date: string;
  invoice_ref?: string | null;
  notes?: string | null;
}

export interface ExpenseCategoryTotal {
  category: string;
  label: string;
  amount: number;
  percent_of_total: number;
}

export interface ProfitLossReport {
  period: string;
  total_revenue: number;
  total_invoiced: number;
  total_expenses: number;
  expense_breakdown: ExpenseCategoryTotal[];
  gross_profit: number;
  margin_percent: number;
}









function hasFinanceAccess(db: Database, user: UserWithRole): boolean {
  return userHasAny(db, user, ['all', 'view_all', 'view_finances', 'manage_costs'],
    ['finance', 'deplasari', 'documents']);
}

function canManageFinance(db: Database, user: UserWithRole): boolean {
  return userHasAny(db, user, ['all', 'manage_costs'],
    ['finance', 'deplasari']);
}

function auditLog(db: Database, userId: number, action: string, entityType: string, entityId: number | null): void {
  try { logAuditEvent(db, userId, action, entityType, entityId); } catch {  }
}

function outstandingAmount(row: ProjectFinanceRow): number {
  return Math.max(row.estimated_revenue - row.actual_revenue, 0);
}

function deadlinePassed(row: ProjectFinanceRow): boolean {
  if (!row.deadline) return false;
  const d = new Date(row.deadline);
  return d < new Date();
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime());
}






function readEurToRonRate(db: Database): number {
  const stmt = db.prepare('SELECT eur_to_ron_rate FROM company_settings WHERE id = 1');
  let rate = 4.97;
  if (stmt.step()) { const v = stmt.get()[0] as number; if (v && v > 0) rate = v; }
  stmt.free();
  return rate;
}





export class FinanceService {
  static getProjectFinance(db: Database, user: UserWithRole): ProjectFinanceRow[] {
    if (!hasFinanceAccess(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    
    
    
    const eurRate = readEurToRonRate(db);

    
    
    
    
    const stmt = db.prepare(
      `SELECT p.id, p.name, p.status, p.priority, p.deadline,
              p.estimated_value,
              COALESCE((SELECT SUM(pr.amount) FROM project_revenues pr WHERE pr.project_id = p.id), 0) as actual_revenue,
              p.estimated_cost as estimated_material_cost,
              COALESCE((
                  SELECT SUM(mc.quantity * mc.unit_cost * (1 + mc.loss_rate))
                  FROM material_consumptions mc WHERE mc.project_id = p.id
              ), 0)
              + COALESCE((
                  SELECT SUM(ps.parts_cost) FROM piece_services ps
                  WHERE ps.project_id = p.id AND ps.status = 'finalizat'
              ), 0) as actual_material_cost,
              COALESCE((
                  SELECT SUM(ps.labor_cost) FROM piece_services ps
                  WHERE ps.project_id = p.id AND ps.status = 'finalizat'
              ), 0) as actual_labor_cost,
              -- Project expenses (manual entries by finance team) — these
              -- previously surfaced only in the Reports tab. Now they're
              -- visible in the Overview P&L as a dedicated bucket.
              COALESCE((
                  SELECT SUM(CASE WHEN UPPER(pe.currency) = 'EUR' THEN pe.amount * ${eurRate} ELSE pe.amount END)
                  FROM project_expenses pe
                  WHERE pe.project_id = p.id
              ), 0) as actual_other_expenses,
              COALESCE(pfo.manual_labor_cost, 0) as manual_labor_cost,
              COALESCE(pfo.manual_material_cost, 0) as manual_material_cost,
              COALESCE(pfo.extra_cost, 0) as extra_cost,
              COALESCE(pfo.discount_value, 0) as discount_value,
              (SELECT order_index FROM project_stages WHERE id = p.stage_id) as stage_order,
              (SELECT MAX(order_index) FROM project_stages) as max_stage_order
       FROM projects p
       LEFT JOIN project_finance_overrides pfo ON pfo.project_id = p.id
       ORDER BY
          CASE
              WHEN p.priority = 'critical' THEN 0
              WHEN p.priority = 'high' THEN 1
              WHEN p.priority = 'medium' THEN 2
              ELSE 3
          END,
          p.created_at DESC`
    );

    const results: ProjectFinanceRow[] = [];
    while (stmt.step()) {
      const r = stmt.get();
      const project_id = r[0] as number;
      const project_name = r[1] as string;
      const status = r[2] as string;
      const priority = r[3] as string;
      const deadline = r[4] as string | null;
      const estimated_revenue = r[5] as number;
      let actual_revenue = r[6] as number;
      const estimated_material_cost = r[7] as number;
      const actual_material_cost_calc = r[8] as number;
      const actual_labor_cost_calc = r[9] as number;
      const actual_other_expenses = r[10] as number;
      const manual_labor_cost = r[11] as number;
      const manual_material_cost = r[12] as number;
      const extra_cost = r[13] as number;
      const discount_value = r[14] as number;
      const stage_order = r[15] as number | null;
      const max_stage_order = r[16] as number | null;
      const is_finalized = stage_order != null && max_stage_order != null && stage_order >= max_stage_order;

      
      
      
      if (actual_revenue < estimated_revenue) {
        actual_revenue = estimated_revenue;
      }
      
      

      const actual_material_cost = manual_material_cost > 0 ? manual_material_cost : actual_material_cost_calc;
      const actual_labor_cost = manual_labor_cost > 0 ? manual_labor_cost : actual_labor_cost_calc;
      const estimated_labor_cost = estimated_material_cost * 0.35;
      
      
      const total_cost = actual_material_cost + actual_labor_cost + extra_cost + actual_other_expenses;

      const estimated_profit = estimated_revenue - (estimated_material_cost + estimated_labor_cost);
      const actual_profit = actual_revenue - total_cost - discount_value;
      const margin_percent = actual_revenue > 0 ? (actual_profit / actual_revenue) * 100 : 0;

      const risk_level = actual_profit < 0 || margin_percent < 5
        ? 'high'
        : margin_percent < 12 ? 'medium' : 'low';

      results.push({
        project_id, project_name, status, priority, deadline,
        estimated_revenue, actual_revenue, estimated_material_cost,
        actual_material_cost, estimated_labor_cost, actual_labor_cost,
        extra_cost, total_cost, estimated_profit, actual_profit,
        margin_percent, risk_level, is_finalized,
      });
    }
    stmt.free();
    return results;
  }

  static getOverview(db: Database, user: UserWithRole): FinanceOverview {
    const rows = this.getProjectFinance(db, user);
    const projects_count = rows.length;
    let total_estimated_revenue = 0;
    let total_actual_revenue = 0;
    let total_estimated_cost = 0;
    let total_actual_cost = 0;
    let total_estimated_profit = 0;
    let total_actual_profit = 0;
    let projects_at_risk = 0;

    for (const row of rows) {
      total_estimated_revenue += row.estimated_revenue;
      total_actual_revenue += row.actual_revenue;
      total_estimated_cost += row.estimated_material_cost + row.estimated_labor_cost;
      total_actual_cost += row.total_cost;
      total_estimated_profit += row.estimated_profit;
      total_actual_profit += row.actual_profit;
      if (row.risk_level !== 'low') {
        projects_at_risk++;
      }
    }

    return {
      projects_count,
      total_estimated_revenue,
      total_actual_revenue,
      total_estimated_cost,
      total_actual_cost,
      total_estimated_profit,
      total_actual_profit,
      // Marjă ponderată pe venit (profit total / venit total), nu media aritmetică
      // a marjelor pe proiect — altfel un proiect mic cu marjă mare denatura KPI-ul.
      avg_margin_percent: total_actual_revenue > 0 ? (total_actual_profit / total_actual_revenue) * 100 : 0,
      projects_at_risk,
    };
  }

  static getInsights(db: Database, user: UserWithRole): FinanceInsights {
    const rows = this.getProjectFinance(db, user);
    const collected_revenue = rows.reduce((sum, r) => sum + r.actual_revenue, 0);
    const outstanding_revenue = rows.reduce((sum, r) => sum + outstandingAmount(r), 0);
    const overdue_outstanding = rows
      .filter(r => deadlinePassed(r))
      .reduce((sum, r) => sum + outstandingAmount(r), 0);

    const flagged_projects: FinanceProjectAlert[] = rows
      .filter(r => r.risk_level !== 'low' || outstandingAmount(r) > 0)
      .slice(0, 8)
      .map(r => ({
        project_id: r.project_id,
        project_name: r.project_name,
        estimated_revenue: r.estimated_revenue,
        actual_revenue: r.actual_revenue,
        outstanding_amount: outstandingAmount(r),
        margin_percent: r.margin_percent,
        risk_level: r.risk_level,
        deadline: r.deadline,
      }));

    const monthly_cash_flow = this.getMonthlyCashFlow(db);
    const receivables_aging = this.buildReceivableBuckets(rows);
    const latest_revenues = this.getRevenueEntries(db, user).slice(0, 8);
    const compliance_overview = this.getComplianceOverview(db, user);

    return {
      collected_revenue,
      outstanding_revenue,
      overdue_outstanding,
      monthly_cash_flow,
      receivables_aging,
      flagged_projects,
      latest_revenues,
      compliance_overview,
    };
  }

  static getComplianceOverview(db: Database, user: UserWithRole): FinanceComplianceOverview {
    if (!hasFinanceAccess(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const tasks = this.getComplianceTasks(db, user);
    const today = new Date().toISOString().slice(0, 10);
    const open_tasks = tasks.filter(t => t.status !== 'done').length;
    const overdue_tasks = tasks.filter(t => t.status !== 'done' && t.due_date < today).length;
    const legal_tasks = tasks.filter(t => t.area === 'legal').length;
    const accounting_tasks = tasks.filter(t => t.area === 'accounting').length;

    const docStmt = db.prepare(
      `SELECT dc.name,
              COUNT(d.id) as total_documents,
              COALESCE(SUM(CASE WHEN datetime(d.uploaded_at) >= datetime('now', '-30 day') THEN 1 ELSE 0 END), 0) as recent_documents
       FROM document_categories dc
       LEFT JOIN documents d ON d.category_id = dc.id
       WHERE dc.name IN ('Contract', 'Factură', 'Aviz', 'Proces Verbal')
       GROUP BY dc.id, dc.name
       ORDER BY total_documents DESC, dc.name ASC`
    );
    const document_snapshots: FinanceDocumentSnapshot[] = [];
    while (docStmt.step()) {
      const row = docStmt.getAsObject();
      document_snapshots.push({
        category: row.name as string,
        total_documents: row.total_documents as number,
        recent_documents: row.recent_documents as number,
      });
    }
    docStmt.free();

    return {
      open_tasks,
      overdue_tasks,
      legal_tasks,
      accounting_tasks,
      document_snapshots,
      upcoming_tasks: tasks.slice(0, 8),
    };
  }

  static getComplianceTasks(db: Database, user: UserWithRole): ComplianceTask[] {
    if (!hasFinanceAccess(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const stmt = db.prepare(
      `SELECT ct.id, ct.title, ct.area, ct.project_id, p.name, ct.owner_user_id, u.full_name,
              ct.status, ct.priority, ct.due_date, ct.notes, ct.created_at, ct.updated_at, ct.completed_at
       FROM compliance_tasks ct
       LEFT JOIN projects p ON p.id = ct.project_id
       LEFT JOIN users u ON u.id = ct.owner_user_id
       ORDER BY
         CASE ct.status WHEN 'blocked' THEN 0 WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
         CASE ct.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         date(ct.due_date) ASC`
    );
    const results: ComplianceTask[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as number,
        title: row.title as string,
        area: row.area as string,
        project_id: row.project_id as number | null,
        project_name: row['p.name'] != null ? row['p.name'] as string : (row.name as string | null),
        owner_user_id: row.owner_user_id as number | null,
        owner_name: row.full_name as string | null,
        status: row.status as string,
        priority: row.priority as string,
        due_date: row.due_date as string,
        notes: row.notes as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        completed_at: row.completed_at as string | null,
      });
    }
    stmt.free();
    return results;
  }

  static createComplianceTask(db: Database, user: UserWithRole, req: CreateComplianceTaskRequest): ComplianceTask {
    if (!canManageFinance(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }
    if (!req.title || req.title.trim().length < 4) {
      throw CommandError.badRequest('Titlul task-ului este prea scurt');
    }
    if (!['accounting', 'legal', 'compliance'].includes(req.area)) {
      throw CommandError.badRequest('Zona task-ului este invalidă');
    }
    if (!['low', 'medium', 'high', 'critical'].includes(req.priority)) {
      throw CommandError.badRequest('Prioritatea este invalidă');
    }
    if (!isValidDate(req.due_date)) {
      throw CommandError.badRequest('Data trebuie să fie în format YYYY-MM-DD');
    }
    const status = req.status || 'open';
    if (!['open', 'in_progress', 'done', 'blocked'].includes(status)) {
      throw CommandError.badRequest('Status invalid');
    }

    db.run(
      `INSERT INTO compliance_tasks (title, area, project_id, owner_user_id, status, priority, due_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.title.trim(), req.area, req.project_id ?? null, user.id, status, req.priority, req.due_date, req.notes ?? null]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const taskId = idStmt.get()[0] as number;
    idStmt.free();

    auditLog(db, user.id, 'CREATE', 'compliance_task', taskId);
    return this.getSingleComplianceTask(db, taskId);
  }

  static updateComplianceTask(db: Database, user: UserWithRole, req: UpdateComplianceTaskRequest): ComplianceTask {
    if (!canManageFinance(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const existing = this.getSingleComplianceTask(db, req.id);
    const status = req.status ?? existing.status;
    const priority = req.priority ?? existing.priority;
    const due_date = req.due_date ?? existing.due_date;
    const notes = req.notes !== undefined ? req.notes : existing.notes;

    if (!['open', 'in_progress', 'done', 'blocked'].includes(status)) {
      throw CommandError.badRequest('Status invalid');
    }
    if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
      throw CommandError.badRequest('Prioritatea este invalidă');
    }
    if (!isValidDate(due_date)) {
      throw CommandError.badRequest('Data trebuie să fie în format YYYY-MM-DD');
    }

    db.run(
      `UPDATE compliance_tasks
       SET status = ?, priority = ?, due_date = ?, notes = ?, updated_at = datetime('now'),
           completed_at = CASE WHEN ? = 'done' THEN datetime('now') ELSE NULL END
       WHERE id = ?`,
      [status, priority, due_date, notes, status, req.id]
    );

    auditLog(db, user.id, 'UPDATE', 'compliance_task', req.id);
    return this.getSingleComplianceTask(db, req.id);
  }

  static getRevenueEntries(db: Database, user: UserWithRole): ProjectRevenueEntry[] {
    if (!hasFinanceAccess(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const stmt = db.prepare(
      `SELECT pr.id, pr.project_id, p.name, pr.amount, pr.source, pr.date, pr.notes, pr.created_by, u.full_name, pr.created_at
       FROM project_revenues pr
       JOIN projects p ON p.id = pr.project_id
       LEFT JOIN users u ON u.id = pr.created_by
       ORDER BY date(pr.date) DESC, pr.id DESC`
    );
    const results: ProjectRevenueEntry[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      results.push({
        id: row[0] as number,
        project_id: row[1] as number,
        project_name: row[2] as string,
        amount: row[3] as number,
        source: row[4] as string,
        date: row[5] as string,
        notes: row[6] as string | null,
        created_by: row[7] as number,
        created_by_name: row[8] as string | null,
        created_at: row[9] as string,
      });
    }
    stmt.free();
    return results;
  }

  static createRevenueEntry(db: Database, user: UserWithRole, req: CreateProjectRevenueRequest): ProjectRevenueEntry {
    if (!canManageFinance(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }
    if (req.amount <= 0) {
      throw CommandError.badRequest('Suma trebuie să fie mai mare ca zero');
    }
    if (!req.source?.trim()) {
      throw CommandError.badRequest('Sursa este obligatorie');
    }
    if (!isValidDate(req.date)) {
      throw CommandError.badRequest('Data trebuie să fie în format YYYY-MM-DD');
    }

    
    const pStmt = db.prepare('SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?)');
    pStmt.bind([req.project_id]);
    pStmt.step();
    const exists = pStmt.get()[0] as number;
    pStmt.free();
    if (!exists) {
      throw CommandError.notFound('Resursă negăsită');
    }

    db.run(
      `INSERT INTO project_revenues (project_id, amount, source, date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.project_id, req.amount, req.source.trim(), req.date, req.notes ?? null, user.id]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const revenueId = idStmt.get()[0] as number;
    idStmt.free();

    auditLog(db, user.id, 'CREATE', 'project_revenue', revenueId);
    return this.getRevenueEntry(db, revenueId);
  }

  static upsertOverride(db: Database, user: UserWithRole, req: UpsertFinanceOverrideRequest): void {
    if (!canManageFinance(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }

    const checkStmt = db.prepare('SELECT EXISTS(SELECT 1 FROM project_finance_overrides WHERE project_id = ?)');
    checkStmt.bind([req.project_id]);
    checkStmt.step();
    const exists = checkStmt.get()[0] as number;
    checkStmt.free();

    if (exists) {
      db.run(
        `UPDATE project_finance_overrides
         SET manual_labor_cost = ?, manual_material_cost = ?, extra_cost = ?,
             discount_value = ?, notes = ?, updated_by = ?, updated_at = datetime('now')
         WHERE project_id = ?`,
        [req.manual_labor_cost, req.manual_material_cost, req.extra_cost ?? 0,
         req.discount_value ?? 0, req.notes ?? null, user.id, req.project_id]
      );
    } else {
      db.run(
        `INSERT INTO project_finance_overrides
         (project_id, manual_labor_cost, manual_material_cost, extra_cost, discount_value, notes, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.project_id, req.manual_labor_cost, req.manual_material_cost,
         req.extra_cost ?? 0, req.discount_value ?? 0, req.notes ?? null, user.id]
      );
    }

    auditLog(db, user.id, 'UPSERT', 'project_finance_override', req.project_id);
  }

  
  static isProjectFinalized(db: Database, projectId: number): boolean {
    const stmt = db.prepare(
      `SELECT (SELECT order_index FROM project_stages WHERE id = p.stage_id) AS so,
              (SELECT MAX(order_index) FROM project_stages) AS mx
       FROM projects p WHERE p.id = ?`,
    );
    stmt.bind([projectId]);
    if (!stmt.step()) { stmt.free(); return false; }
    const row = stmt.getAsObject();
    stmt.free();
    const so = row.so as number | null;
    const mx = row.mx as number | null;
    return so != null && mx != null && so >= mx;
  }

  





  static setFinalCost(db: Database, user: UserWithRole, req: { project_id: number; final_cost: number }): void {
    if (!canManageFinance(db, user)) {
      throw CommandError.forbidden('Acces refuzat');
    }
    const cost = Number(req.final_cost);
    if (!Number.isFinite(cost) || cost < 0) {
      throw CommandError.badRequest('Cost final invalid');
    }
    if (!this.isProjectFinalized(db, req.project_id)) {
      throw CommandError.badRequest('Costul final se poate completa doar după finalizarea proiectului (ultimul stadiu kanban)');
    }
    const checkStmt = db.prepare('SELECT EXISTS(SELECT 1 FROM project_finance_overrides WHERE project_id = ?)');
    checkStmt.bind([req.project_id]);
    checkStmt.step();
    const exists = checkStmt.get()[0] as number;
    checkStmt.free();
    if (exists) {
      db.run(
        `UPDATE project_finance_overrides
         SET manual_material_cost = ?, updated_by = ?, updated_at = datetime('now')
         WHERE project_id = ?`,
        [cost, user.id, req.project_id],
      );
    } else {
      db.run(
        `INSERT INTO project_finance_overrides (project_id, manual_material_cost, updated_by)
         VALUES (?, ?, ?)`,
        [req.project_id, cost, user.id],
      );
    }
    auditLog(db, user.id, 'PROJECT_FINAL_COST_SET', 'project', req.project_id);
  }

  

  private static getMonthlyCashFlow(db: Database): FinanceCashFlowPoint[] {
    
    
    
    
    
    
    
    
    
    
    const stmt = db.prepare(
      `SELECT date(pr.date, '-' || CAST((strftime('%w', pr.date) + 6) % 7 AS INTEGER) || ' days') as week_start,
              COALESCE(SUM(pr.amount), 0)
       FROM project_revenues pr
       JOIN projects p ON p.id = pr.project_id
       WHERE p.status NOT IN ('anulat')
       GROUP BY week_start
       ORDER BY week_start DESC
       LIMIT 26`
    );
    const results: FinanceCashFlowPoint[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      results.push({
        month: row[0] as string,
        inflow: row[1] as number,
      });
    }
    stmt.free();
    results.reverse();
    return results;
  }

  private static buildReceivableBuckets(rows: ProjectFinanceRow[]): FinanceReceivableBucket[] {
    const today = new Date();
    const buckets: FinanceReceivableBucket[] = [
      { label: 'Neajuns la termen', amount: 0, projects_count: 0 },
      { label: '0-30 zile', amount: 0, projects_count: 0 },
      { label: '31-60 zile', amount: 0, projects_count: 0 },
      { label: '60+ zile', amount: 0, projects_count: 0 },
    ];

    for (const row of rows) {
      const outstanding = outstandingAmount(row);
      if (outstanding <= 0) continue;

      let index = 0;
      if (row.deadline) {
        const deadline = new Date(row.deadline);
        const diffDays = Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) index = 0;
        else if (diffDays <= 30) index = 1;
        else if (diffDays <= 60) index = 2;
        else index = 3;
      }

      buckets[index].amount += outstanding;
      buckets[index].projects_count += 1;
    }

    return buckets;
  }

  private static getRevenueEntry(db: Database, revenueId: number): ProjectRevenueEntry {
    const stmt = db.prepare(
      `SELECT pr.id, pr.project_id, p.name, pr.amount, pr.source, pr.date, pr.notes, pr.created_by, u.full_name, pr.created_at
       FROM project_revenues pr
       JOIN projects p ON p.id = pr.project_id
       LEFT JOIN users u ON u.id = pr.created_by
       WHERE pr.id = ?`
    );
    stmt.bind([revenueId]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Resursă negăsită');
    }
    const row = stmt.get();
    stmt.free();
    return {
      id: row[0] as number,
      project_id: row[1] as number,
      project_name: row[2] as string,
      amount: row[3] as number,
      source: row[4] as string,
      date: row[5] as string,
      notes: row[6] as string | null,
      created_by: row[7] as number,
      created_by_name: row[8] as string | null,
      created_at: row[9] as string,
    };
  }

  private static getSingleComplianceTask(db: Database, taskId: number): ComplianceTask {
    const stmt = db.prepare(
      `SELECT ct.id, ct.title, ct.area, ct.project_id, p.name, ct.owner_user_id, u.full_name,
              ct.status, ct.priority, ct.due_date, ct.notes, ct.created_at, ct.updated_at, ct.completed_at
       FROM compliance_tasks ct
       LEFT JOIN projects p ON p.id = ct.project_id
       LEFT JOIN users u ON u.id = ct.owner_user_id
       WHERE ct.id = ?`
    );
    stmt.bind([taskId]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Resursă negăsită');
    }
    const row = stmt.get();
    stmt.free();
    return {
      id: row[0] as number,
      title: row[1] as string,
      area: row[2] as string,
      project_id: row[3] as number | null,
      project_name: row[4] as string | null,
      owner_user_id: row[5] as number | null,
      owner_name: row[6] as string | null,
      status: row[7] as string,
      priority: row[8] as string,
      due_date: row[9] as string,
      notes: row[10] as string | null,
      created_at: row[11] as string,
      updated_at: row[12] as string,
      completed_at: row[13] as string | null,
    };
  }

  
  
  

  static getCompanySettings(db: Database): any {
    const stmt = db.prepare(
      'SELECT company_name, cui, reg_com, address, city, county, bank_name, iban, tva_rate, default_currency, eur_to_ron_rate, eur_to_ron_rate_updated_at, eur_to_ron_rate_source FROM company_settings WHERE id = 1'
    );
    if (!stmt.step()) { stmt.free(); return {}; }
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }

  static updateCompanySettings(db: Database, user: UserWithRole, req: any): any {
    db.run(
      `UPDATE company_settings SET company_name=?, cui=?, reg_com=?, address=?, city=?, county=?,
       bank_name=?, iban=?, tva_rate=?, default_currency=?, eur_to_ron_rate=?, updated_by=? WHERE id = 1`,
      [req.company_name, req.cui, req.reg_com, req.address, req.city, req.county,
       req.bank_name, req.iban, req.tva_rate, req.default_currency, req.eur_to_ron_rate, user.id]
    );
    return FinanceService.getCompanySettings(db);
  }

  
  
  

  static getInvoices(db: Database, user: UserWithRole, projectId?: number | null): Invoice[] {
    if (!hasFinanceAccess(db, user)) throw CommandError.forbidden('Acces refuzat');

    const sql = projectId != null
      ? `SELECT i.id, i.invoice_number, i.project_id, p.name, i.client_id, c.name,
                i.type, i.status, i.currency, i.subtotal, i.tva_rate, i.tva_amount,
                i.total, i.paid_amount, i.issue_date, i.due_date, i.paid_date, i.notes,
                u.full_name, i.created_at
         FROM finance_invoices i
         JOIN projects p ON p.id = i.project_id
         JOIN clients c ON c.id = i.client_id
         LEFT JOIN users u ON u.id = i.created_by
         WHERE i.project_id = ?
         ORDER BY i.created_at DESC`
      : `SELECT i.id, i.invoice_number, i.project_id, p.name, i.client_id, c.name,
                i.type, i.status, i.currency, i.subtotal, i.tva_rate, i.tva_amount,
                i.total, i.paid_amount, i.issue_date, i.due_date, i.paid_date, i.notes,
                u.full_name, i.created_at
         FROM finance_invoices i
         JOIN projects p ON p.id = i.project_id
         JOIN clients c ON c.id = i.client_id
         LEFT JOIN users u ON u.id = i.created_by
         ORDER BY i.created_at DESC`;

    const stmt = db.prepare(sql);
    if (projectId != null) stmt.bind([projectId]);
    const out: Invoice[] = [];
    while (stmt.step()) {
      const r = stmt.get();
      const total = r[12] as number;
      const paid = r[13] as number;
      out.push({
        id: r[0] as number,
        invoice_number: r[1] as string,
        project_id: r[2] as number,
        project_name: r[3] as string,
        client_id: r[4] as number,
        client_name: r[5] as string,
        type: r[6] as string,
        status: r[7] as string,
        currency: r[8] as string,
        subtotal: r[9] as number,
        tva_rate: r[10] as number,
        tva_amount: r[11] as number,
        total,
        paid_amount: paid,
        remaining: total - paid,
        issue_date: r[14] as string,
        due_date: r[15] as string,
        paid_date: r[16] as string | null,
        notes: r[17] as string | null,
        created_by_name: r[18] as string | null,
        created_at: r[19] as string,
        lines: [],
      });
    }
    stmt.free();
    return out;
  }

  static getInvoice(db: Database, user: UserWithRole, invoiceId: number): Invoice {
    if (!hasFinanceAccess(db, user)) throw CommandError.forbidden('Acces refuzat');

    const stmt = db.prepare(
      `SELECT i.id, i.invoice_number, i.project_id, p.name, i.client_id, c.name,
              i.type, i.status, i.currency, i.subtotal, i.tva_rate, i.tva_amount,
              i.total, i.paid_amount, i.issue_date, i.due_date, i.paid_date, i.notes,
              u.full_name, i.created_at
       FROM finance_invoices i
       JOIN projects p ON p.id = i.project_id
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.id = ?`
    );
    stmt.bind([invoiceId]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Factura negasita'); }
    const r = stmt.get();
    const total = r[12] as number;
    const paid = r[13] as number;
    const invoice: Invoice = {
      id: r[0] as number,
      invoice_number: r[1] as string,
      project_id: r[2] as number,
      project_name: r[3] as string,
      client_id: r[4] as number,
      client_name: r[5] as string,
      type: r[6] as string,
      status: r[7] as string,
      currency: r[8] as string,
      subtotal: r[9] as number,
      tva_rate: r[10] as number,
      tva_amount: r[11] as number,
      total,
      paid_amount: paid,
      remaining: total - paid,
      issue_date: r[14] as string,
      due_date: r[15] as string,
      paid_date: r[16] as string | null,
      notes: r[17] as string | null,
      created_by_name: r[18] as string | null,
      created_at: r[19] as string,
      lines: [],
    };
    stmt.free();

    const linesStmt = db.prepare(
      `SELECT id, description, quantity, unit, unit_price, total
       FROM finance_invoice_lines WHERE invoice_id = ? ORDER BY id`
    );
    linesStmt.bind([invoiceId]);
    while (linesStmt.step()) {
      const l = linesStmt.get();
      invoice.lines.push({
        id: l[0] as number,
        description: l[1] as string,
        quantity: l[2] as number,
        unit: l[3] as string,
        unit_price: l[4] as number,
        total: l[5] as number,
      });
    }
    linesStmt.free();
    return invoice;
  }

  static createFinanceInvoice(db: Database, user: UserWithRole, req: CreateFinanceInvoiceRequest): Invoice {
    if (!canManageFinance(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (!req.lines?.length) throw CommandError.badRequest('Factura trebuie sa aiba cel putin o linie');

    const settings = FinanceService.getCompanySettings(db);
    const currency = req.currency ?? settings.default_currency ?? 'RON';
    const tvaRaw = typeof settings.tva_rate === 'number' ? settings.tva_rate : 0.21;
    const tva_rate = tvaRaw > 1 ? tvaRaw / 100 : tvaRaw; // acceptă 0.19 sau 19
    const inv_type = req.invoice_type ?? 'emisa';

    const numStmt = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 FROM finance_invoices');
    numStmt.step();
    const nextNum = numStmt.get()[0] as number;
    numStmt.free();
    const year = (req.issue_date || '').slice(0, 4);
    const invoice_number = `AUTOMATIX-${year}-${String(nextNum).padStart(4, '0')}`;

    // Rotunjire la nivel de linie + total, ca să nu se acumuleze drift de subcent.
    const subtotal = roundMoney(req.lines.reduce((s, l) => s + roundMoney(l.quantity * l.unit_price), 0));
    const tva_amount = roundMoney(subtotal * tva_rate);
    const total = roundMoney(subtotal + tva_amount);

    db.run(
      `INSERT INTO finance_invoices
       (invoice_number, project_id, client_id, type, status, currency, subtotal, tva_rate, tva_amount, total, paid_amount, issue_date, due_date, notes, created_by)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [invoice_number, req.project_id, req.client_id, inv_type, currency, subtotal,
       tva_rate, tva_amount, total, req.issue_date, req.due_date, req.notes ?? null, user.id]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const invoiceId = idStmt.get()[0] as number;
    idStmt.free();

    for (const line of req.lines) {
      const unit = line.unit ?? 'buc';
      const line_total = line.quantity * line.unit_price;
      db.run(
        `INSERT INTO finance_invoice_lines (invoice_id, description, quantity, unit, unit_price, total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [invoiceId, line.description, line.quantity, unit, line.unit_price, line_total]
      );
    }

    auditLog(db, user.id, 'CREATE', 'invoice', invoiceId);
    return FinanceService.getInvoice(db, user, invoiceId);
  }

  static updateInvoiceStatus(db: Database, user: UserWithRole, req: UpdateInvoiceStatusRequest): Invoice {
    if (!canManageFinance(db, user)) throw CommandError.forbidden('Acces refuzat');
    const valid = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];
    if (!valid.includes(req.status)) throw CommandError.badRequest(`Status invalid: ${req.status}`);

    const paidDate = req.status === 'paid' ? new Date().toISOString().slice(0, 10) : null;
    db.run(
      `UPDATE finance_invoices
       SET status = ?, paid_date = COALESCE(?, paid_date), updated_at = datetime('now')
       WHERE id = ?`,
      [req.status, paidDate, req.invoice_id]
    );
    auditLog(db, user.id, 'UPDATE_STATUS', 'invoice', req.invoice_id);
    return FinanceService.getInvoice(db, user, req.invoice_id);
  }

  static recordInvoicePayment(db: Database, user: UserWithRole, req: RecordInvoicePaymentRequest): Invoice {
    if (!canManageFinance(db, user)) throw CommandError.forbidden('Acces refuzat');
    if (!(req.amount > 0)) throw CommandError.badRequest('Suma platii trebuie sa fie pozitiva');
    const method = req.payment_method ?? 'transfer';
    // Store the payment rounded to 2 decimals (no sub-cent float artifacts).
    const payAmount = roundMoney(Number(req.amount));

    db.run(
      `INSERT INTO finance_invoice_payments
       (invoice_id, amount, payment_date, payment_method, reference, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.invoice_id, payAmount, req.payment_date, method, req.reference ?? null, req.notes ?? null, user.id]
    );


    const sumStmt = db.prepare('SELECT COALESCE(SUM(amount), 0) FROM finance_invoice_payments WHERE invoice_id = ?');
    sumStmt.bind([req.invoice_id]);
    sumStmt.step();
    const totalPaid = roundMoney(sumStmt.get()[0] as number);
    sumStmt.free();

    const totalStmt = db.prepare('SELECT total FROM finance_invoices WHERE id = ?');
    totalStmt.bind([req.invoice_id]);
    totalStmt.step();
    const invoiceTotal = roundMoney((totalStmt.get()[0] as number) || 0);
    totalStmt.free();

    // Compare rounded money — no +0.01 tolerance, no float drift flipping status.
    const newStatus = totalPaid >= invoiceTotal ? 'paid' : 'partial';
    const paidDate = newStatus === 'paid' ? req.payment_date : null;

    db.run(
      `UPDATE finance_invoices
       SET paid_amount = ?, status = ?, paid_date = COALESCE(?, paid_date), updated_at = datetime('now')
       WHERE id = ?`,
      [totalPaid, newStatus, paidDate, req.invoice_id]
    );

    
    
    
    const projStmt = db.prepare('SELECT project_id FROM finance_invoices WHERE id = ?');
    projStmt.bind([req.invoice_id]);
    const projectId = projStmt.step() ? (projStmt.get()[0] as number) : null;
    projStmt.free();
    if (projectId != null) {
      db.run(
        `INSERT INTO project_revenues (project_id, amount, source, date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [projectId, req.amount, `invoice_payment:${req.invoice_id}`, req.payment_date,
         req.notes ?? `Plata factura #${req.invoice_id}`, user.id]
      );
    }

    auditLog(db, user.id, 'PAYMENT', 'invoice', req.invoice_id);
    return FinanceService.getInvoice(db, user, req.invoice_id);
  }

  
  
  

  static getProjectExpenses(db: Database, user: UserWithRole, projectId?: number | null): ProjectExpense[] {
    if (!hasFinanceAccess(db, user)) throw CommandError.forbidden('Acces refuzat');

    const sql = projectId != null
      ? `SELECT e.id, e.project_id, p.name, e.category, e.description, e.amount, e.currency,
                e.date, e.invoice_ref, e.notes, u.full_name, e.created_at
         FROM project_expenses e
         JOIN projects p ON p.id = e.project_id
         LEFT JOIN users u ON u.id = e.created_by
         WHERE e.project_id = ?
         ORDER BY e.date DESC`
      : `SELECT e.id, e.project_id, p.name, e.category, e.description, e.amount, e.currency,
                e.date, e.invoice_ref, e.notes, u.full_name, e.created_at
         FROM project_expenses e
         JOIN projects p ON p.id = e.project_id
         LEFT JOIN users u ON u.id = e.created_by
         ORDER BY e.date DESC`;

    const stmt = db.prepare(sql);
    if (projectId != null) stmt.bind([projectId]);
    const out: ProjectExpense[] = [];
    while (stmt.step()) {
      const r = stmt.get();
      out.push({
        id: r[0] as number,
        project_id: r[1] as number,
        project_name: r[2] as string,
        category: r[3] as string,
        description: r[4] as string,
        amount: r[5] as number,
        currency: r[6] as string,
        date: r[7] as string,
        invoice_ref: r[8] as string | null,
        notes: r[9] as string | null,
        created_by_name: r[10] as string | null,
        created_at: r[11] as string,
      });
    }
    stmt.free();
    return out;
  }

  static createProjectExpense(db: Database, user: UserWithRole, req: CreateProjectExpenseRequest): ProjectExpense {
    if (!canManageFinance(db, user)) throw CommandError.forbidden('Acces refuzat');
    const currency = req.currency ?? 'RON';
    db.run(
      `INSERT INTO project_expenses
       (project_id, category, description, amount, currency, date, invoice_ref, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.project_id, req.category, req.description, req.amount, currency,
       req.date, req.invoice_ref ?? null, req.notes ?? null, user.id]
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();
    auditLog(db, user.id, 'CREATE', 'project_expense', id);

    const fetchStmt = db.prepare(
      `SELECT e.id, e.project_id, p.name, e.category, e.description, e.amount, e.currency,
              e.date, e.invoice_ref, e.notes, u.full_name, e.created_at
       FROM project_expenses e
       JOIN projects p ON p.id = e.project_id
       LEFT JOIN users u ON u.id = e.created_by
       WHERE e.id = ?`
    );
    fetchStmt.bind([id]);
    fetchStmt.step();
    const r = fetchStmt.get();
    fetchStmt.free();
    return {
      id: r[0] as number,
      project_id: r[1] as number,
      project_name: r[2] as string,
      category: r[3] as string,
      description: r[4] as string,
      amount: r[5] as number,
      currency: r[6] as string,
      date: r[7] as string,
      invoice_ref: r[8] as string | null,
      notes: r[9] as string | null,
      created_by_name: r[10] as string | null,
      created_at: r[11] as string,
    };
  }

  
  
  

  static getProfitLossReport(db: Database, user: UserWithRole, reportType: string, year?: number | null): ProfitLossReport[] {
    if (!hasFinanceAccess(db, user)) throw CommandError.forbidden('Acces refuzat');
    const eurRate = readEurToRonRate(db); 

    if (reportType === 'monthly') {
      const y = year ?? new Date().getFullYear();
      const reports: ProfitLossReport[] = [];
      for (let month = 1; month <= 12; month++) {
        const period = `${y}-${String(month).padStart(2, '0')}`;
        const like = `${period}%`;
        reports.push(...FinanceService.buildPeriodReport(db, period, [like]));
      }
      return reports.filter(r => r.total_revenue > 0 || r.total_expenses > 0);
    }

    if (reportType === 'project') {
      const projStmt = db.prepare('SELECT id, name FROM projects ORDER BY name');
      const projects: { id: number; name: string }[] = [];
      while (projStmt.step()) {
        const r = projStmt.get();
        projects.push({ id: r[0] as number, name: r[1] as string });
      }
      projStmt.free();

      const reports: ProfitLossReport[] = [];
      for (const p of projects) {
        const revenue = FinanceService.scalar(db,
          'SELECT COALESCE(SUM(amount), 0) FROM project_revenues WHERE project_id = ?', [p.id]);
        const invoiced = FinanceService.scalar(db,
          "SELECT COALESCE(SUM(total), 0) FROM finance_invoices WHERE project_id = ? AND status != 'cancelled'", [p.id]);
        
        
        const expenses = FinanceService.scalar(db,
          `SELECT COALESCE(SUM(CASE WHEN UPPER(currency) = 'EUR' THEN amount * ${eurRate} ELSE amount END), 0)
           FROM project_expenses WHERE project_id = ?`, [p.id]);
        const materialCost = FinanceService.scalar(db,
          'SELECT COALESCE(SUM(mc.quantity * mc.unit_cost * (1 + mc.loss_rate)), 0) FROM material_consumptions mc WHERE mc.project_id = ?', [p.id]);
        
        
        
        const serviceCost = FinanceService.scalar(db,
          "SELECT COALESCE(SUM(labor_cost + parts_cost), 0) FROM piece_services WHERE project_id = ? AND status = 'finalizat'", [p.id]);

        const total_expenses = expenses + materialCost + serviceCost;
        const gross_profit = revenue - total_expenses;
        const margin = revenue > 0 ? (gross_profit / revenue) * 100 : 0;

        reports.push({
          period: p.name,
          total_revenue: revenue,
          total_invoiced: invoiced,
          total_expenses,
          expense_breakdown: [],
          gross_profit,
          margin_percent: margin,
        });
      }
      return reports;
    }

    return [];
  }

  

  private static scalar(db: Database, sql: string, params: (number | string)[]): number {
    const s = db.prepare(sql);
    s.bind(params);
    s.step();
    const val = (s.get()[0] as number) || 0;
    s.free();
    return val;
  }

  private static buildPeriodReport(db: Database, period: string, likeParams: string[]): ProfitLossReport[] {
    const [like] = likeParams;
    const eurRate = readEurToRonRate(db);
    const revenue = FinanceService.scalar(db,
      'SELECT COALESCE(SUM(amount), 0) FROM project_revenues WHERE date LIKE ?', [like]);
    const invoiced = FinanceService.scalar(db,
      "SELECT COALESCE(SUM(total), 0) FROM finance_invoices WHERE issue_date LIKE ? AND status != 'cancelled'", [like]);
    
    const expenses = FinanceService.scalar(db,
      `SELECT COALESCE(SUM(CASE WHEN UPPER(currency) = 'EUR' THEN amount * ${eurRate} ELSE amount END), 0)
       FROM project_expenses WHERE date LIKE ?`, [like]);
    const materialCost = FinanceService.scalar(db,
      'SELECT COALESCE(SUM(mc.quantity * mc.unit_cost * (1 + mc.loss_rate)), 0) FROM material_consumptions mc WHERE mc.created_at LIKE ?', [like]);
    const serviceLabor = FinanceService.scalar(db,
      "SELECT COALESCE(SUM(labor_cost), 0) FROM piece_services WHERE service_date LIKE ? AND status = 'finalizat'", [like]);
    const serviceParts = FinanceService.scalar(db,
      "SELECT COALESCE(SUM(parts_cost), 0) FROM piece_services WHERE service_date LIKE ? AND status = 'finalizat'", [like]);

    const total_expenses = expenses + materialCost + serviceLabor + serviceParts;
    const gross_profit = revenue - total_expenses;
    const margin = revenue > 0 ? (gross_profit / revenue) * 100 : 0;

    const breakdown: ExpenseCategoryTotal[] = [];
    if (materialCost > 0) {
      breakdown.push({
        category: 'materiale',
        label: 'Materiale',
        amount: materialCost,
        percent_of_total: total_expenses > 0 ? (materialCost / total_expenses) * 100 : 0,
      });
    }
    if (serviceLabor > 0) {
      breakdown.push({
        category: 'service_labor',
        label: 'Manopera service',
        amount: serviceLabor,
        percent_of_total: total_expenses > 0 ? (serviceLabor / total_expenses) * 100 : 0,
      });
    }
    if (serviceParts > 0) {
      breakdown.push({
        category: 'service_parts',
        label: 'Piese service',
        amount: serviceParts,
        percent_of_total: total_expenses > 0 ? (serviceParts / total_expenses) * 100 : 0,
      });
    }

    const catStmt = db.prepare(
      'SELECT category, SUM(amount) FROM project_expenses WHERE date LIKE ? GROUP BY category ORDER BY SUM(amount) DESC'
    );
    catStmt.bind([like]);
    while (catStmt.step()) {
      const r = catStmt.get();
      const cat = r[0] as string;
      const amt = r[1] as number;
      breakdown.push({
        category: cat,
        label: categoryLabel(cat),
        amount: amt,
        percent_of_total: total_expenses > 0 ? (amt / total_expenses) * 100 : 0,
      });
    }
    catStmt.free();

    if (revenue === 0 && total_expenses === 0) return [];

    return [{
      period,
      total_revenue: revenue,
      total_invoiced: invoiced,
      total_expenses,
      expense_breakdown: breakdown,
      gross_profit,
      margin_percent: margin,
    }];
  }
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    manopera: 'Manopera',
    transport: 'Transport',
    subcontractori: 'Subcontractori',
    utilitati: 'Utilitati',
    inchirieri_utilaje: 'Inchirieri utilaje',
    deplasari: 'Deplasari',
    materiale_directe: 'Materiale directe',
    consumabile: 'Consumabile',
  };
  return map[cat] ?? cat;
}
