import type { Database } from 'sql.js';
import * as crypto from 'crypto';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { logAuditEvent } from '../db/auditLogs';
import { bundleAvailable } from './remoteSupportBundle';

export type RemoteSessionStatus = 'pending' | 'active' | 'ended' | 'failed' | 'cancelled';
export type RemoteSessionType = 'ad_hoc' | 'registered';

export interface RemoteEndpoint {
  id: number;
  name: string;
  rustdesk_id: string;
  platform: string;
  notes: string | null;
  client_id: number | null;
  client_name: string | null;
  station_id: number | null;
  password_hint: string | null;
  enabled: boolean;
  last_seen_at: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface RemoteSession {
  id: number;
  session_type: RemoteSessionType;
  endpoint_id: number | null;
  endpoint_name: string | null;
  started_by: number;
  started_by_name: string | null;
  customer_ref: string | null;
  client_id: number | null;
  client_name: string | null;
  service_ticket_id: number | null;
  rustdesk_id: string | null;
  status: RemoteSessionStatus;
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  quick_code: string | null;
  quick_expires_at: string | null;
}

export interface QuickSupportCreated {
  session: RemoteSession;
  code: string;
  path_hint: string;
  expires_at: string;
  message_template: string;
}

export interface PublicQuickSupportView {
  code: string;
  customer_ref: string | null;
  company_name: string;
  expires_at: string;
  download_url: string;
  instructions: string[];
  bundle_available: boolean;
}

function rowsAll(db: Database, sql: string, params: any[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const out: Record<string, unknown>[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

function rowOne(db: Database, sql: string, params: any[] = []): Record<string, unknown> | null {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const r = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return r;
}

function requireSupportRole(user: UserWithRole): void {
  const role = (user.role_name || '').trim().toLowerCase();
  if (role !== 'admin' && role !== 'manager') {
    throw CommandError.forbidden('Doar administratorii și managerii pot folosi suportul la distanță');
  }
}

const SESSION_SELECT = `
  SELECT s.id, s.session_type, s.endpoint_id, e.name AS endpoint_name,
         s.started_by, u.full_name AS started_by_name,
         s.customer_ref, s.client_id, c.name AS client_name,
         s.service_ticket_id, s.rustdesk_id, s.status, s.notes,
         s.started_at, s.ended_at, s.created_at,
         q.code AS quick_code, q.expires_at AS quick_expires_at
  FROM remote_sessions s
  LEFT JOIN remote_endpoints e ON e.id = s.endpoint_id
  LEFT JOIN users u ON u.id = s.started_by
  LEFT JOIN clients c ON c.id = s.client_id
  LEFT JOIN remote_quick_codes q ON q.session_id = s.id
`;

function mapSession(r: Record<string, unknown>): RemoteSession {
  return {
    id: r.id as number,
    session_type: r.session_type as RemoteSessionType,
    endpoint_id: (r.endpoint_id as number | null) ?? null,
    endpoint_name: (r.endpoint_name as string | null) ?? null,
    started_by: r.started_by as number,
    started_by_name: (r.started_by_name as string | null) ?? null,
    customer_ref: (r.customer_ref as string | null) ?? null,
    client_id: (r.client_id as number | null) ?? null,
    client_name: (r.client_name as string | null) ?? null,
    service_ticket_id: (r.service_ticket_id as number | null) ?? null,
    rustdesk_id: (r.rustdesk_id as string | null) ?? null,
    status: r.status as RemoteSessionStatus,
    notes: (r.notes as string | null) ?? null,
    started_at: (r.started_at as string | null) ?? null,
    ended_at: (r.ended_at as string | null) ?? null,
    created_at: r.created_at as string,
    quick_code: (r.quick_code as string | null) ?? null,
    quick_expires_at: (r.quick_expires_at as string | null) ?? null,
  };
}

function mapEndpoint(r: Record<string, unknown>): RemoteEndpoint {
  return {
    id: r.id as number,
    name: r.name as string,
    rustdesk_id: r.rustdesk_id as string,
    platform: (r.platform as string) || 'windows',
    notes: (r.notes as string | null) ?? null,
    client_id: (r.client_id as number | null) ?? null,
    client_name: (r.client_name as string | null) ?? null,
    station_id: (r.station_id as number | null) ?? null,
    password_hint: (r.password_hint as string | null) ?? null,
    enabled: ((r.enabled as number) || 0) === 1,
    last_seen_at: (r.last_seen_at as string | null) ?? null,
    created_by: r.created_by as number,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function randomCode(): string {
  return crypto.randomBytes(6).toString('hex');
}

function defaultQuickTtlHours(): number {
  const raw = process.env.PROMIX_REMOTE_QUICK_TTL_HOURS;
  const n = raw ? parseInt(raw, 10) : 24;
  return Number.isFinite(n) && n > 0 ? n : 24;
}

function companyName(): string {
  return process.env.PROMIX_COMPANY_NAME || 'Promix Automatix';
}

export class RemoteSupportService {
  static listEndpoints(db: Database, user: UserWithRole): RemoteEndpoint[] {
    requireSupportRole(user);
    return rowsAll(db, `
      SELECT e.*, c.name AS client_name
      FROM remote_endpoints e
      LEFT JOIN clients c ON c.id = e.client_id
      ORDER BY e.name COLLATE NOCASE
    `).map(mapEndpoint);
  }

  static createEndpoint(db: Database, user: UserWithRole, input: {
    name: string;
    rustdesk_id: string;
    platform?: string;
    notes?: string | null;
    client_id?: number | null;
    station_id?: number | null;
    password_hint?: string | null;
  }): RemoteEndpoint {
    requireSupportRole(user);
    const name = String(input.name || '').trim();
    const rustdeskId = String(input.rustdesk_id || '').replace(/\s+/g, '').trim();
    if (!name || !rustdeskId) {
      throw CommandError.badRequest('Numele și ID-ul RustDesk sunt obligatorii');
    }
    db.run(
      `INSERT INTO remote_endpoints
        (name, rustdesk_id, platform, notes, client_id, station_id, password_hint, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        rustdeskId,
        input.platform || 'windows',
        input.notes ?? null,
        input.client_id ?? null,
        input.station_id ?? null,
        input.password_hint ?? null,
        user.id,
      ],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();
    const row = rowOne(db, `
      SELECT e.*, c.name AS client_name FROM remote_endpoints e
      LEFT JOIN clients c ON c.id = e.client_id WHERE e.id = ?
    `, [id]);
    logAuditEvent(db, user.id, 'CREATE', 'remote_endpoint', id, JSON.stringify({ name, rustdesk_id: rustdeskId }));
    return mapEndpoint(row!);
  }

  static updateEndpoint(db: Database, user: UserWithRole, id: number, input: Partial<{
    name: string;
    rustdesk_id: string;
    platform: string;
    notes: string | null;
    client_id: number | null;
    station_id: number | null;
    password_hint: string | null;
    enabled: boolean;
  }>): RemoteEndpoint {
    requireSupportRole(user);
    const existing = rowOne(db, 'SELECT id FROM remote_endpoints WHERE id = ?', [id]);
    if (!existing) throw CommandError.notFound('Endpoint negăsit');
    const fields: string[] = [];
    const vals: any[] = [];
    if (input.name !== undefined) { fields.push('name = ?'); vals.push(String(input.name).trim()); }
    if (input.rustdesk_id !== undefined) {
      fields.push('rustdesk_id = ?');
      vals.push(String(input.rustdesk_id).replace(/\s+/g, '').trim());
    }
    if (input.platform !== undefined) { fields.push('platform = ?'); vals.push(input.platform); }
    if (input.notes !== undefined) { fields.push('notes = ?'); vals.push(input.notes); }
    if (input.client_id !== undefined) { fields.push('client_id = ?'); vals.push(input.client_id); }
    if (input.station_id !== undefined) { fields.push('station_id = ?'); vals.push(input.station_id); }
    if (input.password_hint !== undefined) { fields.push('password_hint = ?'); vals.push(input.password_hint); }
    if (input.enabled !== undefined) { fields.push('enabled = ?'); vals.push(input.enabled ? 1 : 0); }
    if (fields.length === 0) throw CommandError.badRequest('Nimic de actualizat');
    fields.push("updated_at = datetime('now')");
    vals.push(id);
    db.run(`UPDATE remote_endpoints SET ${fields.join(', ')} WHERE id = ?`, vals);
    logAuditEvent(db, user.id, 'UPDATE', 'remote_endpoint', id, JSON.stringify(input));
    const row = rowOne(db, `
      SELECT e.*, c.name AS client_name FROM remote_endpoints e
      LEFT JOIN clients c ON c.id = e.client_id WHERE e.id = ?
    `, [id]);
    return mapEndpoint(row!);
  }

  static deleteEndpoint(db: Database, user: UserWithRole, id: number): void {
    requireSupportRole(user);
    db.run('DELETE FROM remote_endpoints WHERE id = ?', [id]);
    logAuditEvent(db, user.id, 'DELETE', 'remote_endpoint', id, null);
  }

  static listSessions(db: Database, user: UserWithRole, limit = 50): RemoteSession[] {
    requireSupportRole(user);
    return rowsAll(db, `${SESSION_SELECT} ORDER BY s.created_at DESC LIMIT ?`, [limit]).map(mapSession);
  }

  static createQuickSupport(db: Database, user: UserWithRole, input: {
    customer_ref?: string | null;
    client_id?: number | null;
    service_ticket_id?: number | null;
    notes?: string | null;
    ttl_hours?: number;
  }): QuickSupportCreated {
    requireSupportRole(user);
    const ttl = input.ttl_hours && input.ttl_hours > 0 ? input.ttl_hours : defaultQuickTtlHours();
    const expiresAt = new Date(Date.now() + ttl * 60 * 60 * 1000).toISOString();

    db.run(
      `INSERT INTO remote_sessions
        (session_type, started_by, customer_ref, client_id, service_ticket_id, notes, status)
       VALUES ('ad_hoc', ?, ?, ?, ?, ?, 'pending')`,
      [
        user.id,
        input.customer_ref?.trim() || null,
        input.client_id ?? null,
        input.service_ticket_id ?? null,
        input.notes?.trim() || null,
      ],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const sessionId = idStmt.get()[0] as number;
    idStmt.free();

    let code = randomCode();
    for (let i = 0; i < 5; i++) {
      const clash = rowOne(db, 'SELECT id FROM remote_quick_codes WHERE code = ?', [code]);
      if (!clash) break;
      code = randomCode();
    }
    db.run(
      `INSERT INTO remote_quick_codes (code, session_id, expires_at) VALUES (?, ?, ?)`,
      [code, sessionId, expiresAt],
    );

    const session = mapSession(rowOne(db, `${SESSION_SELECT} WHERE s.id = ?`, [sessionId])!);
    logAuditEvent(db, user.id, 'CREATE', 'remote_quick_support', sessionId,
      JSON.stringify({ code, customer_ref: input.customer_ref }));

    const pathHint = `/support/q/${code}`;
    const messageTemplate =
      `Bună ziua,\n\nPentru asistență la distanță, deschideți link-ul de mai jos și urmați pașii:\n` +
      `{LINK}\n\nDescărcați instrumentul de suport, rulați-l și comunicați-ne ID-ul și parola afișate.\n\nCu stimă,\n${companyName()}`;

    return { session, code, path_hint: pathHint, expires_at: expiresAt, message_template: messageTemplate };
  }

  static getPublicQuickView(db: Database, code: string): PublicQuickSupportView {
    const row = rowOne(db, `
      SELECT q.code, q.expires_at, q.session_id, s.customer_ref, s.status
      FROM remote_quick_codes q
      JOIN remote_sessions s ON s.id = q.session_id
      WHERE q.code = ?
    `, [code]);
    if (!row) throw CommandError.notFound('Cod invalid sau expirat');
    if (row.status === 'cancelled' || row.status === 'ended') {
      throw CommandError.forbidden('Sesiunea de suport nu mai este activă');
    }
    if (row.expires_at && new Date(row.expires_at as string) < new Date()) {
      throw CommandError.forbidden('Link-ul de suport a expirat');
    }

    db.run(
      `UPDATE remote_quick_codes
       SET access_count = access_count + 1, last_accessed_at = datetime('now')
       WHERE code = ?`,
      [code],
    );

    return {
      code: code,
      customer_ref: (row.customer_ref as string | null) ?? null,
      company_name: companyName(),
      expires_at: row.expires_at as string,
      download_url: `/api/support/q/${encodeURIComponent(code)}/download`,
      bundle_available: bundleAvailable(),
      instructions: [
        'Descărcați arhiva Promix-QuickSupport.zip (butonul de mai jos).',
        'Extrageți TOATE fișierele din zip în același folder (exe + RustDesk2.toml).',
        'Rulați Promix-QuickSupport.exe din acel folder (dublu-click).',
        'Pe ecran vor apărea un ID și o parolă temporară — comunicați-le tehnicianului.',
        'Păstrați fereastra deschisă pe durata sesiunii.',
      ],
    };
  }

  static reportQuickRustDeskId(db: Database, code: string, rustdeskId: string): void {
    const row = rowOne(db, `
      SELECT q.session_id, q.expires_at, s.status
      FROM remote_quick_codes q
      JOIN remote_sessions s ON s.id = q.session_id
      WHERE q.code = ?
    `, [code]);
    if (!row) throw CommandError.notFound('Cod invalid');
    if (row.expires_at && new Date(row.expires_at as string) < new Date()) {
      throw CommandError.forbidden('Link expirat');
    }
    const id = String(rustdeskId || '').replace(/\s+/g, '').trim();
    if (!id) throw CommandError.badRequest('ID invalid');
    db.run(
      `UPDATE remote_sessions SET rustdesk_id = ? WHERE id = ?`,
      [id, row.session_id as number],
    );
  }

  static startConnection(db: Database, user: UserWithRole, input: {
    session_id?: number | null;
    endpoint_id?: number | null;
    rustdesk_id: string;
    notes?: string | null;
  }): RemoteSession {
    requireSupportRole(user);
    const rustdeskId = String(input.rustdesk_id || '').replace(/\s+/g, '').trim();
    if (!rustdeskId) throw CommandError.badRequest('ID RustDesk obligatoriu');

    let sessionId = input.session_id ?? null;
    if (!sessionId && input.endpoint_id) {
      const ep = rowOne(db, 'SELECT id, rustdesk_id FROM remote_endpoints WHERE id = ? AND enabled = 1', [input.endpoint_id]);
      if (!ep) throw CommandError.notFound('Endpoint negăsit sau dezactivat');
      db.run(
        `INSERT INTO remote_sessions (session_type, endpoint_id, started_by, rustdesk_id, status, notes, started_at)
         VALUES ('registered', ?, ?, ?, 'active', ?, datetime('now'))`,
        [input.endpoint_id, user.id, rustdeskId, input.notes ?? null],
      );
      const idStmt = db.prepare('SELECT last_insert_rowid()');
      idStmt.step();
      sessionId = idStmt.get()[0] as number;
      idStmt.free();
    } else if (sessionId) {
      const sess = rowOne(db, 'SELECT id, status FROM remote_sessions WHERE id = ?', [sessionId]);
      if (!sess) throw CommandError.notFound('Sesiune negăsită');
      db.run(
        `UPDATE remote_sessions
         SET rustdesk_id = ?, status = 'active', started_at = COALESCE(started_at, datetime('now')), notes = COALESCE(?, notes)
         WHERE id = ?`,
        [rustdeskId, input.notes ?? null, sessionId],
      );
    } else {
      db.run(
        `INSERT INTO remote_sessions (session_type, started_by, rustdesk_id, status, notes, started_at)
         VALUES ('ad_hoc', ?, ?, 'active', ?, datetime('now'))`,
        [user.id, rustdeskId, input.notes ?? null],
      );
      const idStmt = db.prepare('SELECT last_insert_rowid()');
      idStmt.step();
      sessionId = idStmt.get()[0] as number;
      idStmt.free();
    }

    logAuditEvent(db, user.id, 'CONNECT', 'remote_session', sessionId!, JSON.stringify({ rustdesk_id: rustdeskId }));
    return mapSession(rowOne(db, `${SESSION_SELECT} WHERE s.id = ?`, [sessionId])!);
  }

  static endSession(db: Database, user: UserWithRole, sessionId: number, notes?: string | null): RemoteSession {
    requireSupportRole(user);
    const sess = rowOne(db, 'SELECT id FROM remote_sessions WHERE id = ?', [sessionId]);
    if (!sess) throw CommandError.notFound('Sesiune negăsită');
    db.run(
      `UPDATE remote_sessions
       SET status = 'ended', ended_at = datetime('now'), notes = COALESCE(?, notes)
       WHERE id = ?`,
      [notes ?? null, sessionId],
    );
    logAuditEvent(db, user.id, 'END', 'remote_session', sessionId, notes ?? null);
    return mapSession(rowOne(db, `${SESSION_SELECT} WHERE s.id = ?`, [sessionId])!);
  }

  static cancelQuickSession(db: Database, user: UserWithRole, sessionId: number): RemoteSession {
    requireSupportRole(user);
    db.run(
      `UPDATE remote_sessions SET status = 'cancelled', ended_at = datetime('now') WHERE id = ?`,
      [sessionId],
    );
    logAuditEvent(db, user.id, 'CANCEL', 'remote_session', sessionId, null);
    return mapSession(rowOne(db, `${SESSION_SELECT} WHERE s.id = ?`, [sessionId])!);
  }

  static getViewerConfig(): {
    id_server: string;
    relay_server: string;
    key: string;
    web_ws_url: string | null;
    connect_host: string;
  } {
    const idServer = process.env.PROMIX_RUSTDESK_ID_SERVER || process.env.PROMIX_RUSTDESK_SERVER || '';
    const relay = process.env.PROMIX_RUSTDESK_RELAY_SERVER || idServer;
    const key = process.env.PROMIX_RUSTDESK_KEY || '';

    const viewerHost = (process.env.PROMIX_RUSTDESK_VIEWER_HOST || process.env.PROMIX_APP_HOST || '').trim()
      || (() => {
        const u = (process.env.PROMIX_PUBLIC_URL || '').trim();
        if (!u) return '';
        try { return new URL(u).hostname; } catch { return ''; }
      })();

    const webWs = process.env.PROMIX_RUSTDESK_WEB_WS_URL
      || (viewerHost ? `wss://${viewerHost}` : null);

    // Embedded viewer uses HTTPS /ws/* on the app host (proxied by server/rustdeskWsProxy.ts).
    const connectHost = (process.env.PROMIX_RUSTDESK_CONNECT_HOST || viewerHost || idServer)
      .replace(/^wss?:\/\//, '')
      .replace(/\/.*$/, '');

    return { id_server: idServer, relay_server: relay, key, web_ws_url: webWs, connect_host: connectHost };
  }
}
