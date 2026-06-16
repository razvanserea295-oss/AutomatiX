





import type { Database } from 'sql.js';
import * as crypto from 'crypto';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { roleHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';
import { groupAmountsByCurrency } from '../utils/money';

export interface PortalToken {
  id: number;
  token: string;
  project_id: number;
  project_name: string | null;
  label: string | null;
  expires_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  revoked: boolean;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  url_hint: string;
}

export interface PortalView {
  project: {
    id: number; name: string; status: string;
    stage_id: number | null; stage_name: string | null;
    deadline: string | null; start_date: string | null;
    description: string | null;
    estimated_value: number | null;
    client_name: string | null;
  };
  custom_stages: Array<{
    id: number; name: string; order_index: number; status: string;
  }>;
  pieces_summary: { total: number; planificat: number; in_productie: number; fabricat: number; livrat: number; montat: number; testat: number; };
  contracts: Array<{
    id: number; contract_code: string; title: string; status: string;
    sale_price: number; created_at: string; revision: number;
  }>;
  invoices: Array<{
    id: number; invoice_number: string; status: string;
    total: number; paid_amount: number; remaining: number;
    issue_date: string; due_date: string; currency: string;
  }>;
  /**
   * Per-currency invoice totals. EUR and RON invoices must NEVER be summed into
   * one scalar (a client-facing reporting bug) — each currency stays separate.
   * Shape: `{ total: {RON: 1200, EUR: 300}, paid: {...}, remaining: {...} }`.
   */
  invoices_by_currency: {
    total: Record<string, number>;
    paid: Record<string, number>;
    remaining: Record<string, number>;
  };
  service_tickets: Array<{
    id: number; ticket_number: string; title: string;
    severity: string; status: string; created_at: string; resolved_at: string | null;
  }>;
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

const TOKEN_SQL = `
  SELECT t.id, t.token, t.project_id, p.name AS project_name,
         t.label, t.expires_at, t.last_accessed_at, t.access_count, t.revoked,
         t.created_by, u.full_name AS created_by_name, t.created_at
  FROM portal_tokens t
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN users u ON u.id = t.created_by
`;

function rowToToken(r: any): PortalToken {
  return {
    id: r.id as number,
    token: r.token as string,
    project_id: r.project_id as number,
    project_name: (r.project_name as string | null) ?? null,
    label: (r.label as string | null) ?? null,
    expires_at: (r.expires_at as string | null) ?? null,
    last_accessed_at: (r.last_accessed_at as string | null) ?? null,
    access_count: (r.access_count as number) || 0,
    revoked: ((r.revoked as number) || 0) === 1,
    created_by: r.created_by as number,
    created_by_name: (r.created_by_name as string | null) ?? null,
    created_at: r.created_at as string,
    url_hint: `/portal/${r.token}`,
  };
}





function requirePortalManagement(db: Database, user: UserWithRole): void {
  if (!roleHasAny(db, user.role_id, ['all', 'manage_projects', 'view_finances'])) {
    throw CommandError.forbidden('Necesită permisiune de manager proiect/financiar');
  }
}

export class PortalService {
  static listForProject(db: Database, user: UserWithRole, projectId: number): PortalToken[] {
    requirePortalManagement(db, user);
    return rowsAll(db, `${TOKEN_SQL} WHERE t.project_id = ? ORDER BY t.created_at DESC`, [projectId])
      .map(rowToToken);
  }

  static create(db: Database, user: UserWithRole, projectId: number, opts: {
    label?: string | null; expires_at?: string | null;
  } = {}): PortalToken {
    requirePortalManagement(db, user);
    const project = rowOne(db, 'SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!project) throw CommandError.notFound('Proiect negăsit');
    const token = crypto.randomBytes(20).toString('hex');
    db.run(
      `INSERT INTO portal_tokens (token, project_id, label, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [token, projectId, opts.label ?? null, opts.expires_at ?? null, user.id],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();
    const r = rowOne(db, `${TOKEN_SQL} WHERE t.id = ?`, [id]);
    logAuditEvent(db, user.id, 'CREATE', 'portal_token', id,
      JSON.stringify({ project_id: projectId, label: opts.label }));
    return rowToToken(r);
  }

  static revoke(db: Database, user: UserWithRole, tokenId: number): void {
    requirePortalManagement(db, user);
    db.run('UPDATE portal_tokens SET revoked = 1 WHERE id = ?', [tokenId]);
    logAuditEvent(db, user.id, 'REVOKE', 'portal_token', tokenId, null);
  }

  static delete(db: Database, user: UserWithRole, tokenId: number): void {
    requirePortalManagement(db, user);
    db.run('DELETE FROM portal_tokens WHERE id = ?', [tokenId]);
    logAuditEvent(db, user.id, 'DELETE', 'portal_token', tokenId, null);
  }

  



  static viewByToken(db: Database, token: string): PortalView {
    const tk = rowOne(db, 'SELECT id, project_id, expires_at, revoked FROM portal_tokens WHERE token = ?', [token]);
    if (!tk) throw CommandError.notFound('Token invalid');
    if (tk.revoked) throw CommandError.forbidden('Token revocat');
    if (tk.expires_at && new Date(tk.expires_at as string) < new Date()) {
      throw CommandError.forbidden('Token expirat');
    }

    db.run("UPDATE portal_tokens SET last_accessed_at = datetime('now'), access_count = access_count + 1 WHERE id = ?", [tk.id]);

    const projectId = tk.project_id as number;
    const project = rowOne(db, `
      SELECT p.id, p.name, p.status, p.stage_id, ps.name AS stage_name,
             p.deadline, p.start_date, p.description, p.estimated_value,
             c.name AS client_name
      FROM projects p
      LEFT JOIN project_stages ps ON ps.id = p.stage_id
      LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.id = ?
    `, [projectId]);
    if (!project) throw CommandError.notFound('Proiect negăsit');

    const customStages = rowsAll(db,
      `SELECT id, name, order_index, status FROM project_custom_stages
       WHERE project_id = ? ORDER BY order_index`, [projectId]);

    const piecesAgg = rowOne(db, `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'planificat' THEN 1 ELSE 0 END) AS planificat,
        SUM(CASE WHEN status = 'in_productie' THEN 1 ELSE 0 END) AS in_productie,
        SUM(CASE WHEN status = 'fabricat' THEN 1 ELSE 0 END) AS fabricat,
        SUM(CASE WHEN status = 'livrat' THEN 1 ELSE 0 END) AS livrat,
        SUM(CASE WHEN status = 'montat' THEN 1 ELSE 0 END) AS montat,
        SUM(CASE WHEN status = 'testat' THEN 1 ELSE 0 END) AS testat
      FROM project_pieces WHERE project_id = ?
    `, [projectId]) || {};

    const contracts = rowsAll(db, `
      SELECT id, contract_code, title, status, sale_price, created_at, revision
      FROM contracts WHERE project_id = ? ORDER BY created_at DESC
    `, [projectId]);

    const invoices = rowsAll(db, `
      SELECT id, invoice_number, status, total, paid_amount,
             (total - paid_amount) AS remaining,
             issue_date, due_date, currency
      FROM finance_invoices WHERE project_id = ? ORDER BY issue_date DESC
    `, [projectId]);

    const tickets = (() => {
      try {
        return rowsAll(db, `
          SELECT id, ticket_number, title, severity, status, created_at, resolved_at
          FROM service_tickets WHERE project_id = ? ORDER BY created_at DESC LIMIT 20
        `, [projectId]);
      } catch { return []; }
    })();

    return {
      project: {
        id: project.id as number,
        name: project.name as string,
        status: project.status as string,
        stage_id: (project.stage_id as number | null) ?? null,
        stage_name: (project.stage_name as string | null) ?? null,
        deadline: (project.deadline as string | null) ?? null,
        start_date: (project.start_date as string | null) ?? null,
        description: (project.description as string | null) ?? null,
        estimated_value: (project.estimated_value as number | null) ?? null,
        client_name: (project.client_name as string | null) ?? null,
      },
      custom_stages: customStages.map(s => ({
        id: s.id as number,
        name: s.name as string,
        order_index: (s.order_index as number) || 0,
        status: s.status as string,
      })),
      pieces_summary: {
        total: (piecesAgg.total as number) || 0,
        planificat: (piecesAgg.planificat as number) || 0,
        in_productie: (piecesAgg.in_productie as number) || 0,
        fabricat: (piecesAgg.fabricat as number) || 0,
        livrat: (piecesAgg.livrat as number) || 0,
        montat: (piecesAgg.montat as number) || 0,
        testat: (piecesAgg.testat as number) || 0,
      },
      contracts: contracts.map(c => ({
        id: c.id as number,
        contract_code: c.contract_code as string,
        title: c.title as string,
        status: c.status as string,
        sale_price: (c.sale_price as number) || 0,
        created_at: c.created_at as string,
        revision: (c.revision as number) || 0,
      })),
      invoices: invoices.map(i => ({
        id: i.id as number,
        invoice_number: i.invoice_number as string,
        status: i.status as string,
        total: (i.total as number) || 0,
        paid_amount: (i.paid_amount as number) || 0,
        remaining: (i.remaining as number) || 0,
        issue_date: i.issue_date as string,
        due_date: i.due_date as string,
        currency: i.currency as string,
      })),
      // Per-currency totals — keep EUR/RON separate (never one mixed number).
      invoices_by_currency: {
        total:     groupAmountsByCurrency(invoices, (i: any) => i.total,       (i: any) => i.currency),
        paid:      groupAmountsByCurrency(invoices, (i: any) => i.paid_amount,  (i: any) => i.currency),
        remaining: groupAmountsByCurrency(invoices, (i: any) => i.remaining,    (i: any) => i.currency),
      },
      service_tickets: tickets.map((t: any) => ({
        id: t.id as number,
        ticket_number: t.ticket_number as string,
        title: t.title as string,
        severity: t.severity as string,
        status: t.status as string,
        created_at: t.created_at as string,
        resolved_at: (t.resolved_at as string | null) ?? null,
      })),
    };
  }
}
