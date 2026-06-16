




import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_parts' | 'waiting_client' | 'resolved' | 'closed' | 'cancelled';

const SLA_HOURS: Record<Severity, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
};

export interface ServiceTicket {
  id: number;
  ticket_number: string;
  station_id: number | null;
  station_name: string | null;
  project_id: number | null;
  project_name: string | null;
  client_id: number | null;
  client_name: string | null;
  severity: Severity;
  status: TicketStatus;
  title: string;
  description: string | null;
  reported_via: string;
  reported_by_name: string | null;
  reported_by_contact: string | null;
  assigned_user_id: number | null;
  assigned_user_name: string | null;
  sla_due_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_notes: string | null;
  cost_labor: number;
  cost_parts: number;
  cost_total: number;
  currency: string;
  is_billable: boolean;
  invoice_id: number | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
  comments?: TicketComment[];
  parts?: TicketPart[];
}

export interface TicketComment {
  id: number; ticket_id: number; user_id: number; user_name: string | null;
  comment_type: string; body: string; created_at: string;
}

export interface TicketPart {
  id: number; ticket_id: number; material_id: number | null; description: string;
  quantity: number; unit_cost: number; total_cost: number; created_at: string;
}

export interface CreateTicketRequest {
  station_id?: number | null;
  client_id?: number | null;
  severity?: Severity;
  title: string;
  description?: string | null;
  reported_via?: string;
  reported_by_name?: string | null;
  reported_by_contact?: string | null;
  assigned_user_id?: number | null;
  is_billable?: boolean;
  currency?: string | null;
}

export interface UpdateTicketRequest {
  id: number;
  status?: TicketStatus;
  severity?: Severity;
  title?: string;
  description?: string | null;
  assigned_user_id?: number | null;
  resolution_notes?: string | null;
  cost_labor?: number;
  is_billable?: boolean;
  currency?: string | null;
}

function rowsAll(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}
function rowOne(db: Database, sql: string, params: any[] = []): any | null {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const r = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return r;
}

function generateTicketNumber(db: Database): string {
  const year = new Date().getFullYear();
  const stmt = db.prepare("SELECT COUNT(*) FROM service_tickets WHERE ticket_number LIKE ?");
  stmt.bind([`SRV-${year}-%`]);
  let n = 0;
  if (stmt.step()) n = stmt.get()[0] as number;
  stmt.free();
  return `SRV-${year}-${String(n + 1).padStart(5, '0')}`;
}

function computeSlaDue(severity: Severity, fromIso: string): string {
  const d = new Date(fromIso);
  d.setHours(d.getHours() + SLA_HOURS[severity]);
  return d.toISOString();
}

const TICKET_SQL = `
  SELECT t.id, t.ticket_number, t.station_id, s.name AS station_name,
         t.project_id, pr.name AS project_name,
         t.client_id, c.name AS client_name,
         t.severity, t.status, t.title, t.description, t.reported_via,
         t.reported_by_name, t.reported_by_contact,
         t.assigned_user_id, u.full_name AS assigned_user_name,
         t.sla_due_at, t.first_response_at, t.resolved_at, t.closed_at,
         t.resolution_notes, t.cost_labor, t.cost_parts, t.cost_total, t.currency,
         t.is_billable, t.invoice_id, t.created_by, cu.full_name AS created_by_name,
         t.created_at, t.updated_at
  FROM service_tickets t
  LEFT JOIN installed_stations s ON s.id = t.station_id
  LEFT JOIN projects pr ON pr.id = t.project_id
  LEFT JOIN clients c ON c.id = t.client_id
  LEFT JOIN users u ON u.id = t.assigned_user_id
  LEFT JOIN users cu ON cu.id = t.created_by
`;

function rowToTicket(r: any): ServiceTicket {
  const sla = r.sla_due_at as string | null;
  const isOverdue = !!sla && !r.resolved_at && !r.closed_at && new Date(sla) < new Date();
  return {
    id: r.id as number,
    ticket_number: r.ticket_number as string,
    station_id: (r.station_id as number | null) ?? null,
    station_name: (r.station_name as string | null) ?? null,
    project_id: (r.project_id as number | null) ?? null,
    project_name: (r.project_name as string | null) ?? null,
    client_id: (r.client_id as number | null) ?? null,
    client_name: (r.client_name as string | null) ?? null,
    severity: r.severity as Severity,
    status: r.status as TicketStatus,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    reported_via: r.reported_via as string,
    reported_by_name: (r.reported_by_name as string | null) ?? null,
    reported_by_contact: (r.reported_by_contact as string | null) ?? null,
    assigned_user_id: (r.assigned_user_id as number | null) ?? null,
    assigned_user_name: (r.assigned_user_name as string | null) ?? null,
    sla_due_at: sla,
    first_response_at: (r.first_response_at as string | null) ?? null,
    resolved_at: (r.resolved_at as string | null) ?? null,
    closed_at: (r.closed_at as string | null) ?? null,
    resolution_notes: (r.resolution_notes as string | null) ?? null,
    cost_labor: (r.cost_labor as number) || 0,
    cost_parts: (r.cost_parts as number) || 0,
    cost_total: (r.cost_total as number) || 0,
    currency: (r.currency as string) || 'RON',
    is_billable: ((r.is_billable as number) || 0) === 1,
    invoice_id: (r.invoice_id as number | null) ?? null,
    created_by: r.created_by as number,
    created_by_name: (r.created_by_name as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    is_overdue: isOverdue,
  };
}

function recalcCostTotal(db: Database, ticketId: number): void {
  const partsSum = rowOne(db, 'SELECT COALESCE(SUM(total_cost), 0) AS s FROM service_ticket_parts WHERE ticket_id = ?', [ticketId]);
  const labor = rowOne(db, 'SELECT cost_labor FROM service_tickets WHERE id = ?', [ticketId]);
  const total = ((partsSum?.s as number) || 0) + ((labor?.cost_labor as number) || 0);
  db.run('UPDATE service_tickets SET cost_parts = ?, cost_total = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [(partsSum?.s as number) || 0, total, ticketId]);
}

export class ServiceTicketService {
  static list(db: Database, _user: UserWithRole, opts: {
    station_id?: number; client_id?: number; status?: TicketStatus | TicketStatus[];
    assigned_user_id?: number; only_open?: boolean;
  } = {}): ServiceTicket[] {
    const conds: string[] = [];
    const params: any[] = [];
    if (opts.station_id != null) { conds.push('t.station_id = ?'); params.push(opts.station_id); }
    if (opts.client_id != null) { conds.push('t.client_id = ?'); params.push(opts.client_id); }
    if (opts.assigned_user_id != null) { conds.push('t.assigned_user_id = ?'); params.push(opts.assigned_user_id); }
    if (opts.only_open) { conds.push("t.status NOT IN ('resolved','closed','cancelled')"); }
    if (opts.status) {
      const arr = Array.isArray(opts.status) ? opts.status : [opts.status];
      conds.push(`t.status IN (${arr.map(() => '?').join(',')})`);
      params.push(...arr);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return rowsAll(db, `${TICKET_SQL} ${where} ORDER BY t.created_at DESC LIMIT 500`, params).map(rowToTicket);
  }

  static get(db: Database, _user: UserWithRole, id: number): ServiceTicket {
    const r = rowOne(db, `${TICKET_SQL} WHERE t.id = ?`, [id]);
    if (!r) throw CommandError.notFound('Ticket negăsit');
    const ticket = rowToTicket(r);
    ticket.comments = rowsAll(db,
      `SELECT c.id, c.ticket_id, c.user_id, u.full_name AS user_name, c.comment_type, c.body, c.created_at
       FROM service_ticket_comments c LEFT JOIN users u ON u.id = c.user_id
       WHERE c.ticket_id = ? ORDER BY c.created_at`, [id]);
    ticket.parts = rowsAll(db,
      `SELECT id, ticket_id, material_id, description, quantity, unit_cost, total_cost, created_at
       FROM service_ticket_parts WHERE ticket_id = ? ORDER BY id`, [id]);
    return ticket;
  }

  static create(db: Database, user: UserWithRole, req: CreateTicketRequest): ServiceTicket {
    if (!req.title?.trim()) throw CommandError.badRequest('Titlul tichetului este obligatoriu');
    const severity = (req.severity || 'medium') as Severity;
    const number = generateTicketNumber(db);
    const now = new Date().toISOString();
    const sla = computeSlaDue(severity, now);

    let clientId = req.client_id ?? null;
    let projectId: number | null = null;
    if (req.station_id != null) {
      const st = rowOne(db, 'SELECT project_id, client_id FROM installed_stations WHERE id = ?', [req.station_id]);
      if (st) {
        projectId = (st.project_id as number | null) ?? null;
        if (clientId == null) clientId = (st.client_id as number | null) ?? null;
      }
    }

    db.run(
      `INSERT INTO service_tickets (
        ticket_number, station_id, project_id, client_id, severity, status,
        title, description, reported_via, reported_by_name, reported_by_contact,
        assigned_user_id, sla_due_at, is_billable, created_by, currency
      ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        number, req.station_id ?? null, projectId, clientId, severity,
        req.title.trim(), req.description ?? null, req.reported_via || 'phone',
        req.reported_by_name ?? null, req.reported_by_contact ?? null,
        req.assigned_user_id ?? null, sla,
        req.is_billable === false ? 0 : 1, user.id, (req.currency || 'RON'),
      ],
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();
    return this.get(db, user, id);
  }

  static update(db: Database, user: UserWithRole, req: UpdateTicketRequest): ServiceTicket {
    const existing = this.get(db, user, req.id);
    const newStatus = req.status ?? existing.status;
    const newSeverity = req.severity ?? existing.severity;

    let firstResponseAt = existing.first_response_at;
    if (!firstResponseAt && (newStatus !== 'open')) {
      firstResponseAt = new Date().toISOString();
    }

    let resolvedAt = existing.resolved_at;
    if (!resolvedAt && (newStatus === 'resolved' || newStatus === 'closed')) {
      resolvedAt = new Date().toISOString();
    }

    let closedAt = existing.closed_at;
    if (!closedAt && newStatus === 'closed') {
      closedAt = new Date().toISOString();
    }

    let slaDue = existing.sla_due_at;
    if (req.severity && req.severity !== existing.severity && newStatus === 'open') {
      slaDue = computeSlaDue(newSeverity, existing.created_at);
    }

    db.run(
      `UPDATE service_tickets SET
        status = ?, severity = ?,
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        assigned_user_id = ?,
        resolution_notes = COALESCE(?, resolution_notes),
        cost_labor = COALESCE(?, cost_labor),
        currency = COALESCE(?, currency),
        is_billable = ?,
        sla_due_at = ?,
        first_response_at = ?,
        resolved_at = ?,
        closed_at = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        newStatus, newSeverity,
        req.title ?? null, req.description ?? null,
        req.assigned_user_id ?? existing.assigned_user_id,
        req.resolution_notes ?? null,
        req.cost_labor ?? null,
        req.currency ?? null,
        (req.is_billable === undefined ? (existing.is_billable ? 1 : 0) : (req.is_billable ? 1 : 0)),
        slaDue, firstResponseAt, resolvedAt, closedAt,
        req.id,
      ],
    );
    recalcCostTotal(db, req.id);
    return this.get(db, user, req.id);
  }

  static delete(db: Database, _user: UserWithRole, id: number): void {
    db.run('DELETE FROM service_tickets WHERE id = ?', [id]);
  }

  static addComment(db: Database, user: UserWithRole, ticketId: number, body: string, type = 'internal'): ServiceTicket {
    if (!body?.trim()) throw CommandError.badRequest('Conținutul comentariului este obligatoriu');
    db.run(
      'INSERT INTO service_ticket_comments (ticket_id, user_id, comment_type, body) VALUES (?, ?, ?, ?)',
      [ticketId, user.id, type, body.trim()],
    );
    
    const t = rowOne(db, 'SELECT first_response_at FROM service_tickets WHERE id = ?', [ticketId]);
    if (t && !t.first_response_at) {
      db.run("UPDATE service_tickets SET first_response_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [ticketId]);
    }
    return this.get(db, user, ticketId);
  }

  static addPart(db: Database, user: UserWithRole, ticketId: number, part: {
    material_id?: number | null; description: string; quantity: number; unit_cost: number;
  }): ServiceTicket {
    const total = (part.quantity || 0) * (part.unit_cost || 0);
    db.run(
      `INSERT INTO service_ticket_parts (ticket_id, material_id, description, quantity, unit_cost, total_cost)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketId, part.material_id ?? null, part.description, part.quantity, part.unit_cost, total],
    );
    recalcCostTotal(db, ticketId);
    return this.get(db, user, ticketId);
  }

  static removePart(db: Database, user: UserWithRole, partId: number): ServiceTicket {
    const r = rowOne(db, 'SELECT ticket_id FROM service_ticket_parts WHERE id = ?', [partId]);
    if (!r) throw CommandError.notFound('Piesă negăsită');
    const ticketId = r.ticket_id as number;
    db.run('DELETE FROM service_ticket_parts WHERE id = ?', [partId]);
    recalcCostTotal(db, ticketId);
    return this.get(db, user, ticketId);
  }

  



  static stationHistory(db: Database, _user: UserWithRole, stationId: number): {
    tickets: ServiceTicket[];
    total_count: number;
    total_cost: number;
    avg_resolution_hours: number | null;
  } {
    const tickets = rowsAll(db, `${TICKET_SQL} WHERE t.station_id = ? ORDER BY t.created_at DESC`, [stationId]).map(rowToTicket);
    const total_cost = tickets.reduce((s, t) => s + t.cost_total, 0);
    const resolved = tickets.filter(t => t.resolved_at && t.created_at);
    const avgMs = resolved.length
      ? resolved.reduce((s, t) => s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) / resolved.length
      : 0;
    return {
      tickets,
      total_count: tickets.length,
      total_cost: Math.round(total_cost * 100) / 100,
      avg_resolution_hours: resolved.length ? Math.round(avgMs / 3600000 * 10) / 10 : null,
    };
  }

  static getStats(db: Database, _user: UserWithRole): {
    open: number; in_progress: number; overdue: number; resolved_this_week: number;
    avg_resolution_hours: number | null; total_billable_revenue: number;
  } {
    const cnt = (sql: string, params: any[] = []) => {
      const s = db.prepare(sql);
      if (params.length) s.bind(params);
      let n = 0; if (s.step()) n = s.get()[0] as number;
      s.free(); return n;
    };
    const open = cnt("SELECT COUNT(*) FROM service_tickets WHERE status = 'open'");
    const in_progress = cnt("SELECT COUNT(*) FROM service_tickets WHERE status IN ('in_progress','waiting_parts','waiting_client')");
    const overdue = cnt("SELECT COUNT(*) FROM service_tickets WHERE sla_due_at IS NOT NULL AND datetime(sla_due_at) < datetime('now') AND status NOT IN ('resolved','closed','cancelled')");
    const resolved_this_week = cnt("SELECT COUNT(*) FROM service_tickets WHERE resolved_at IS NOT NULL AND date(resolved_at) >= date('now', '-7 days')");

    const avgRow = rowOne(db, `
      SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24) AS h
      FROM service_tickets WHERE resolved_at IS NOT NULL
    `);
    const avg_resolution_hours = avgRow && avgRow.h != null ? Math.round((avgRow.h as number) * 10) / 10 : null;

    const revRow = rowOne(db, "SELECT COALESCE(SUM(cost_total), 0) AS r FROM service_tickets WHERE is_billable = 1 AND status IN ('resolved','closed')");
    return {
      open, in_progress, overdue, resolved_this_week,
      avg_resolution_hours,
      total_billable_revenue: Math.round(((revRow?.r as number) || 0) * 100) / 100,
    };
  }
}
