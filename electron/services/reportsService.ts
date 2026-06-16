







import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';

export interface ColumnDef {
  field: string; label: string; type: 'string' | 'number' | 'date' | 'currency';
}

export interface SourceDef {
  name: string;
  label: string;
  base_sql: string;
  columns: ColumnDef[];
  filterable_fields: string[];
}

const SOURCES: Record<string, SourceDef> = {
  projects: {
    name: 'projects',
    label: 'Proiecte',
    base_sql: `
      SELECT p.id, p.name, p.status, ps.name AS stage_name,
             c.name AS client_name, p.estimated_value, p.estimated_cost,
             p.deadline, p.start_date, p.end_date, p.created_at
      FROM projects p
      LEFT JOIN project_stages ps ON ps.id = p.stage_id
      LEFT JOIN clients c ON c.id = p.client_id
    `,
    columns: [
      { field: 'id', label: 'ID', type: 'number' },
      { field: 'name', label: 'Nume', type: 'string' },
      { field: 'status', label: 'Status', type: 'string' },
      { field: 'stage_name', label: 'Etapă', type: 'string' },
      { field: 'client_name', label: 'Client', type: 'string' },
      { field: 'estimated_value', label: 'Valoare', type: 'currency' },
      { field: 'estimated_cost', label: 'Cost estimat', type: 'currency' },
      { field: 'deadline', label: 'Deadline', type: 'date' },
      { field: 'start_date', label: 'Start', type: 'date' },
      { field: 'end_date', label: 'Sfârșit', type: 'date' },
      { field: 'created_at', label: 'Creat', type: 'date' },
    ],
    filterable_fields: ['status', 'client_name', 'stage_name', 'deadline', 'start_date', 'end_date'],
  },
  invoices: {
    name: 'invoices',
    label: 'Facturi',
    base_sql: `
      SELECT i.id, i.invoice_number, i.status, c.name AS client_name,
             p.name AS project_name, i.total, i.paid_amount,
             (i.total - i.paid_amount) AS remaining,
             i.issue_date, i.due_date, i.currency
      FROM finance_invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN projects p ON p.id = i.project_id
    `,
    columns: [
      { field: 'invoice_number', label: 'Nr.', type: 'string' },
      { field: 'status', label: 'Status', type: 'string' },
      { field: 'client_name', label: 'Client', type: 'string' },
      { field: 'project_name', label: 'Proiect', type: 'string' },
      { field: 'total', label: 'Total', type: 'currency' },
      { field: 'paid_amount', label: 'Plătit', type: 'currency' },
      { field: 'remaining', label: 'Restant', type: 'currency' },
      { field: 'issue_date', label: 'Emis', type: 'date' },
      { field: 'due_date', label: 'Scadență', type: 'date' },
      { field: 'currency', label: 'Monedă', type: 'string' },
    ],
    filterable_fields: ['status', 'client_name', 'project_name', 'issue_date', 'due_date'],
  },
  tickets: {
    name: 'tickets',
    label: 'Tichete service',
    base_sql: `
      SELECT t.id, t.ticket_number, t.title, t.severity, t.status,
             s.name AS station_name, c.name AS client_name,
             u.full_name AS assigned_to, t.created_at, t.resolved_at,
             t.cost_total
      FROM service_tickets t
      LEFT JOIN installed_stations s ON s.id = t.station_id
      LEFT JOIN clients c ON c.id = t.client_id
      LEFT JOIN users u ON u.id = t.assigned_user_id
    `,
    columns: [
      { field: 'ticket_number', label: 'Nr.', type: 'string' },
      { field: 'title', label: 'Titlu', type: 'string' },
      { field: 'severity', label: 'Severitate', type: 'string' },
      { field: 'status', label: 'Status', type: 'string' },
      { field: 'station_name', label: 'Stație', type: 'string' },
      { field: 'client_name', label: 'Client', type: 'string' },
      { field: 'assigned_to', label: 'Asignat', type: 'string' },
      { field: 'cost_total', label: 'Cost', type: 'currency' },
      { field: 'created_at', label: 'Deschis', type: 'date' },
      { field: 'resolved_at', label: 'Rezolvat', type: 'date' },
    ],
    filterable_fields: ['severity', 'status', 'client_name', 'station_name', 'assigned_to', 'created_at'],
  },
  quotations: {
    name: 'quotations',
    label: 'Oferte',
    base_sql: `
      SELECT q.id, q.quotation_number, q.title, q.client_name, q.total,
             q.currency, q.status, q.valid_until, q.created_at
      FROM quotations q
    `,
    columns: [
      { field: 'quotation_number', label: 'Nr.', type: 'string' },
      { field: 'title', label: 'Titlu', type: 'string' },
      { field: 'client_name', label: 'Client', type: 'string' },
      { field: 'total', label: 'Total', type: 'currency' },
      { field: 'currency', label: 'Monedă', type: 'string' },
      { field: 'status', label: 'Status', type: 'string' },
      { field: 'valid_until', label: 'Valabilă până', type: 'date' },
      { field: 'created_at', label: 'Creată', type: 'date' },
    ],
    filterable_fields: ['status', 'client_name', 'valid_until', 'created_at'],
  },
};

export interface ReportFilter {
  field: string;
  op: 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'between';
  value: any;
  value2?: any;
}

export interface ReportConfig {
  source: string;
  columns?: string[];
  filters?: ReportFilter[];
  sort?: { field: string; dir: 'asc' | 'desc' };
  limit?: number;
}

export interface ReportResult {
  source: string;
  columns: ColumnDef[];
  rows: any[];
  total_rows: number;
  totals?: Record<string, number>;
}

function rowsAll(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

function buildWhere(filters: ReportFilter[], allowedFields: string[]): { sql: string; params: any[] } {
  const clauses: string[] = [];
  const params: any[] = [];
  for (const f of filters) {
    if (!allowedFields.includes(f.field)) continue;
    switch (f.op) {
      case 'eq': clauses.push(`${f.field} = ?`); params.push(f.value); break;
      case 'neq': clauses.push(`${f.field} != ?`); params.push(f.value); break;
      case 'contains': clauses.push(`${f.field} LIKE ?`); params.push(`%${f.value}%`); break;
      case 'gt': clauses.push(`${f.field} > ?`); params.push(f.value); break;
      case 'gte': clauses.push(`${f.field} >= ?`); params.push(f.value); break;
      case 'lt': clauses.push(`${f.field} < ?`); params.push(f.value); break;
      case 'lte': clauses.push(`${f.field} <= ?`); params.push(f.value); break;
      case 'between':
        clauses.push(`${f.field} BETWEEN ? AND ?`);
        params.push(f.value, f.value2);
        break;
    }
  }
  return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', params };
}

export class ReportsService {
  static getSources(): SourceDef[] {
    return Object.values(SOURCES);
  }

  static run(db: Database, _user: UserWithRole, config: ReportConfig): ReportResult {
    const source = SOURCES[config.source];
    if (!source) throw CommandError.badRequest(`Sursă invalidă: ${config.source}`);

    const where = buildWhere(config.filters || [], source.filterable_fields);
    let sql = `SELECT * FROM (${source.base_sql})${where.sql}`;
    const sortField = config.sort?.field;
    if (sortField && source.columns.some(c => c.field === sortField)) {
      sql += ` ORDER BY ${sortField} ${config.sort?.dir === 'desc' ? 'DESC' : 'ASC'}`;
    }
    const limit = Math.min(config.limit || 1000, 5000);
    sql += ` LIMIT ${limit}`;

    const rows = rowsAll(db, sql, where.params);

    const includeColumns = (config.columns?.length ? config.columns : source.columns.map(c => c.field));
    const visibleCols = source.columns.filter(c => includeColumns.includes(c.field));

    
    const projectedRows = rows.map(r => {
      const out: Record<string, any> = {};
      for (const c of visibleCols) out[c.field] = r[c.field];
      return out;
    });

    
    const totals: Record<string, number> = {};
    for (const c of visibleCols) {
      if (c.type === 'currency' || c.type === 'number') {
        totals[c.field] = projectedRows.reduce((s, r) => s + (Number(r[c.field]) || 0), 0);
      }
    }

    return {
      source: source.name,
      columns: visibleCols,
      rows: projectedRows,
      total_rows: projectedRows.length,
      totals,
    };
  }

  static listPresets(db: Database, user: UserWithRole): Array<{ id: number; name: string; source: string; config: ReportConfig; is_shared: boolean; created_at: string; }> {
    return rowsAll(db,
      `SELECT id, name, source, config, is_shared, created_at FROM report_presets
       WHERE user_id = ? OR is_shared = 1 ORDER BY name`, [user.id])
      .map(r => {
        const source = r.source as string;
        // Guard the per-row parse: a single corrupt `config` (manual DB edit,
        // partial write, old schema) must not 500 the whole presets list.
        // Fall back to a minimal valid config so the preset stays visible and
        // the user can re-save or delete it.
        let config: ReportConfig;
        try {
          const parsed = JSON.parse(r.config as string);
          config = (parsed && typeof parsed === 'object') ? parsed : { source };
        } catch {
          config = { source };
        }
        return {
          id: r.id as number, name: r.name as string, source,
          config,
          is_shared: ((r.is_shared as number) || 0) === 1,
          created_at: r.created_at as string,
        };
      });
  }

  static savePreset(db: Database, user: UserWithRole, req: { name: string; source: string; config: ReportConfig; is_shared?: boolean; }): void {
    db.run(
      `INSERT INTO report_presets (user_id, name, source, config, is_shared) VALUES (?, ?, ?, ?, ?)`,
      [user.id, req.name, req.source, JSON.stringify(req.config), req.is_shared ? 1 : 0],
    );
  }

  static deletePreset(db: Database, user: UserWithRole, id: number): void {
    db.run('DELETE FROM report_presets WHERE id = ? AND user_id = ?', [id, user.id]);
  }
}
