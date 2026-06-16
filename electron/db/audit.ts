import { getDb, saveDatabase } from './connection';

export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditActor {
  userId?: number;
  username?: string;
}

export interface AuditRow {
  id: number;
  user_id: number | null;
  username: string | null;
  action: AuditAction;
  entity: string;
  entity_id: number | null;
  diff_json: string | null;
  created_at: string;
}










export function logAudit(
  actor: AuditActor,
  action: AuditAction,
  entity: string,
  entityId: number | null | undefined,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): void {
  try {
    const db = getDb();
    const diff = computeDiff(before, after);
    db.run(
      `INSERT INTO audit_log (user_id, username, action, entity, entity_id, diff_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        actor.userId ?? null,
        actor.username ?? null,
        action,
        entity,
        entityId ?? null,
        diff ? JSON.stringify(diff) : null,
        new Date().toISOString(),
      ],
    );
    saveDatabase();
  } catch (err) {
    console.warn('[audit] log failed (non-fatal):', err);
  }
}

function computeDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Record<string, [unknown, unknown]> | null {
  if (!before && !after) return null;
  const out: Record<string, [unknown, unknown]> = {};
  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  for (const k of keys) {
    const b = before?.[k];
    const a = after?.[k];
    if (b === a) continue;
    
    if (k === 'updated_at' || k === 'created_at') continue;
    out[k] = [b ?? null, a ?? null];
  }
  return Object.keys(out).length > 0 ? out : null;
}

export interface AuditListFilters {
  userId?: number;
  entity?: string;
  entityId?: number;
  action?: AuditAction;
  since?: string;   
  until?: string;   
  limit?: number;
  offset?: number;
}

export function listAudit(filters: AuditListFilters = {}): AuditRow[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.userId != null)   { clauses.push('user_id = ?');    params.push(filters.userId); }
  if (filters.entity)            { clauses.push('entity = ?');     params.push(filters.entity); }
  if (filters.entityId != null)  { clauses.push('entity_id = ?');  params.push(filters.entityId); }
  if (filters.action)            { clauses.push('action = ?');     params.push(filters.action); }
  if (filters.since)             { clauses.push('created_at >= ?'); params.push(filters.since); }
  if (filters.until)             { clauses.push('created_at <= ?'); params.push(filters.until); }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 2000);
  const offset = Math.max(filters.offset ?? 0, 0);

  const sql = `
    SELECT id, user_id, username, action, entity, entity_id, diff_json, created_at
    FROM audit_log
    ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: AuditRow[] = [];
  while (stmt.step()) {
    const r = stmt.getAsObject() as unknown as AuditRow;
    rows.push(r);
  }
  stmt.free();
  return rows;
}

export function countAudit(filters: AuditListFilters = {}): number {
  const db = getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters.userId != null)   { clauses.push('user_id = ?');    params.push(filters.userId); }
  if (filters.entity)            { clauses.push('entity = ?');     params.push(filters.entity); }
  if (filters.entityId != null)  { clauses.push('entity_id = ?');  params.push(filters.entityId); }
  if (filters.action)            { clauses.push('action = ?');     params.push(filters.action); }
  if (filters.since)             { clauses.push('created_at >= ?'); params.push(filters.since); }
  if (filters.until)             { clauses.push('created_at <= ?'); params.push(filters.until); }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = db.prepare(`SELECT COUNT(*) FROM audit_log ${where}`);
  stmt.bind(params);
  stmt.step();
  const n = stmt.get()[0] as number;
  stmt.free();
  return n;
}

export function exportAuditCsv(filters: AuditListFilters = {}): string {
  const rows = listAudit({ ...filters, limit: 10_000 });
  const header = ['id', 'created_at', 'user_id', 'username', 'action', 'entity', 'entity_id', 'diff_json'];
  const esc = (v: unknown) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([r.id, r.created_at, r.user_id, r.username, r.action, r.entity, r.entity_id, r.diff_json].map(esc).join(','));
  }
  return lines.join('\n');
}











export interface AuditUnifiedRow {
  source: 'audit_logs' | 'audit_log';
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity: string | null;
  entity_id: number | null;
  details: string | null;
  diff_json: string | null;
  ip_address: string | null;
  created_at: string;
}

function unifiedWhere(filters: AuditListFilters): { where: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters.userId != null)  { clauses.push('v.user_id = ?');     params.push(filters.userId); }
  if (filters.entity)           { clauses.push('v.entity = ?');      params.push(filters.entity); }
  if (filters.entityId != null) { clauses.push('v.entity_id = ?');   params.push(filters.entityId); }
  if (filters.action)           { clauses.push('v.action = ?');      params.push(filters.action); }
  if (filters.since)            { clauses.push('v.created_at >= ?'); params.push(filters.since); }
  if (filters.until)            { clauses.push('v.created_at <= ?'); params.push(filters.until); }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export function listAuditUnified(filters: AuditListFilters = {}): AuditUnifiedRow[] {
  const db = getDb();
  const { where, params } = unifiedWhere(filters);
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 2000);
  const offset = Math.max(filters.offset ?? 0, 0);
  const sql = `
    SELECT v.source, v.id, v.user_id,
           COALESCE(v.username, u.full_name, u.username) AS username,
           v.action, v.entity, v.entity_id, v.details, v.diff_json, v.ip_address, v.created_at
    FROM audit_unified v
    LEFT JOIN users u ON u.id = v.user_id
    ${where}
    ORDER BY v.created_at DESC, v.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: AuditUnifiedRow[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as unknown as AuditUnifiedRow);
  stmt.free();
  return rows;
}

export function countAuditUnified(filters: AuditListFilters = {}): number {
  const db = getDb();
  const { where, params } = unifiedWhere(filters);
  const stmt = db.prepare(`SELECT COUNT(*) FROM audit_unified v ${where}`);
  stmt.bind(params);
  stmt.step();
  const n = stmt.get()[0] as number;
  stmt.free();
  return n;
}

export function exportAuditUnifiedCsv(filters: AuditListFilters = {}): string {
  const rows = listAuditUnified({ ...filters, limit: 10_000 });
  const header = ['source', 'id', 'created_at', 'user_id', 'username', 'action', 'entity', 'entity_id', 'ip_address', 'details', 'diff_json'];
  const esc = (v: unknown) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([r.source, r.id, r.created_at, r.user_id, r.username, r.action, r.entity, r.entity_id, r.ip_address, r.details, r.diff_json].map(esc).join(','));
  }
  return lines.join('\n');
}
