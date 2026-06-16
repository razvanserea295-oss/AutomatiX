




import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { logAuditEvent } from '../db/auditLogs';
import type { UserWithRole } from './authService';

export interface TimeEntry {
  id: number;
  user_id: number;
  user_name: string | null;
  piece_id: number | null;
  piece_name: string | null;
  project_id: number | null;
  project_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  hourly_rate: number | null;
  cost: number;
}

export interface ActiveTimer {
  entry_id: number;
  user_id: number;
  piece_id: number | null;
  project_id: number | null;
  piece_name: string | null;
  project_name: string | null;
  started_at: string;
  elapsed_seconds: number;
}

export interface WeeklyAggregateRow {
  user_id: number;
  user_name: string;
  project_id: number;
  project_name: string;
  total_seconds: number;
  total_hours: number;
  total_cost: number;
  hourly_rate: number | null;
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

const ENTRY_SQL = `
  SELECT te.id, te.user_id, u.full_name AS user_name,
         te.piece_id, pp.name AS piece_name,
         te.project_id, pr.name AS project_name,
         te.started_at, te.ended_at, te.duration_seconds, te.notes,
         u.hourly_rate
  FROM time_entries te
  LEFT JOIN users u ON u.id = te.user_id
  LEFT JOIN project_pieces pp ON pp.id = te.piece_id
  LEFT JOIN projects pr ON pr.id = te.project_id
`;

function rowToEntry(r: any): TimeEntry {
  const dur = (r.duration_seconds as number | null) ?? 0;
  const rate = (r.hourly_rate as number | null) ?? null;
  return {
    id: r.id as number,
    user_id: r.user_id as number,
    user_name: (r.user_name as string | null) ?? null,
    piece_id: (r.piece_id as number | null) ?? null,
    piece_name: (r.piece_name as string | null) ?? null,
    project_id: (r.project_id as number | null) ?? null,
    project_name: (r.project_name as string | null) ?? null,
    started_at: r.started_at as string,
    ended_at: (r.ended_at as string | null) ?? null,
    duration_seconds: r.duration_seconds as number | null,
    notes: (r.notes as string | null) ?? null,
    hourly_rate: rate,
    cost: rate != null && dur > 0 ? (dur / 3600) * rate : 0,
  };
}

export class TimeTrackingService {
  
  static start(db: Database, user: UserWithRole, pieceId: number, notes?: string, closePrevious: boolean = true): TimeEntry {
    const piece = rowOne(db, 'SELECT id, project_id FROM project_pieces WHERE id = ?', [pieceId]);
    if (!piece) throw CommandError.notFound('Piesă negăsită');

    // The whole check-close-insert sequence runs in one transaction so a user
    // can never end up with two open timers: the open-timer probe, the
    // auto-close, the post-close assertion and the INSERT are atomic. (Item #2,
    // race condition, audit 2026-06-11.)
    db.run('BEGIN');
    let id: number;
    try {
      const active = rowOne(db, 'SELECT id, piece_id, started_at FROM time_entries WHERE user_id = ? AND ended_at IS NULL', [user.id]);
      if (active) {
        // A timer is already running. Default = auto-close it (switch task).
        // When the caller opted out (closePrevious=false) and the open timer is
        // on a DIFFERENT piece, reject so the UI can confirm the switch.
        if (!closePrevious && (active.piece_id as number | null) !== pieceId) {
          throw CommandError.conflict('Ai deja un timer activ pe altă piesă. Închide-l sau confirmă comutarea.');
        }
        const startedAt = new Date(active.started_at as string);
        const dur = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
        db.run("UPDATE time_entries SET ended_at = datetime('now'), duration_seconds = ? WHERE id = ?", [dur, active.id]);
        logAuditEvent(db, user.id, 'TIME_AUTOCLOSE', 'time_entry', active.id as number,
          `Timer auto-închis (${dur}s) la pornirea unuia nou pe piesa #${pieceId}`);
      }

      // Atomic guard against a concurrent start: if any open timer survived the
      // close above, abort rather than open a second one.
      const stillOpen = rowOne(db, 'SELECT id FROM time_entries WHERE user_id = ? AND ended_at IS NULL', [user.id]);
      if (stillOpen) {
        throw CommandError.conflict('Există deja un timer activ. Reîncărcați pagina.');
      }

      db.run(
        `INSERT INTO time_entries (user_id, piece_id, project_id, started_at, notes)
         VALUES (?, ?, ?, datetime('now'), ?)`,
        [user.id, pieceId, piece.project_id, notes ?? null],
      );
      const idStmt = db.prepare('SELECT last_insert_rowid()');
      idStmt.step();
      id = idStmt.get()[0] as number;
      idStmt.free();

      db.run('COMMIT');
    } catch (err) {
      try { db.run('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }

    try { logAuditEvent(db, user.id, 'TIME_START', 'time_entry', id, `Pontaj pornit pe piesa #${pieceId}`); } catch { /* audit must never break start */ }

    const r = rowOne(db, `${ENTRY_SQL} WHERE te.id = ?`, [id]);
    return rowToEntry(r);
  }

  static stop(db: Database, user: UserWithRole, entryId?: number): TimeEntry | null {
    let activeId = entryId;
    if (!activeId) {
      const active = rowOne(db, 'SELECT id FROM time_entries WHERE user_id = ? AND ended_at IS NULL', [user.id]);
      if (!active) return null;
      activeId = active.id as number;
    }
    const entry = rowOne(db, 'SELECT id, started_at FROM time_entries WHERE id = ? AND user_id = ? AND ended_at IS NULL', [activeId, user.id]);
    if (!entry) return null;
    const startedAt = new Date(entry.started_at as string);
    const dur = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
    db.run("UPDATE time_entries SET ended_at = datetime('now'), duration_seconds = ? WHERE id = ?", [dur, entry.id]);
    const r = rowOne(db, `${ENTRY_SQL} WHERE te.id = ?`, [entry.id]);
    return rowToEntry(r);
  }

  static getActive(db: Database, user: UserWithRole): ActiveTimer | null {
    const r = rowOne(db,
      `SELECT te.id AS entry_id, te.user_id, te.piece_id, te.project_id,
              pp.name AS piece_name, pr.name AS project_name, te.started_at
       FROM time_entries te
       LEFT JOIN project_pieces pp ON pp.id = te.piece_id
       LEFT JOIN projects pr ON pr.id = te.project_id
       WHERE te.user_id = ? AND te.ended_at IS NULL`,
      [user.id]);
    if (!r) return null;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(r.started_at as string).getTime()) / 1000));
    return {
      entry_id: r.entry_id as number,
      user_id: r.user_id as number,
      piece_id: (r.piece_id as number | null) ?? null,
      project_id: (r.project_id as number | null) ?? null,
      piece_name: (r.piece_name as string | null) ?? null,
      project_name: (r.project_name as string | null) ?? null,
      started_at: r.started_at as string,
      elapsed_seconds: elapsed,
    };
  }

  static listEntries(db: Database, _user: UserWithRole, opts: {
    user_id?: number; piece_id?: number; project_id?: number; from?: string; to?: string;
  } = {}): TimeEntry[] {
    const conds: string[] = [];
    const params: any[] = [];
    if (opts.user_id != null) { conds.push('te.user_id = ?'); params.push(opts.user_id); }
    if (opts.piece_id != null) { conds.push('te.piece_id = ?'); params.push(opts.piece_id); }
    if (opts.project_id != null) { conds.push('te.project_id = ?'); params.push(opts.project_id); }
    if (opts.from) { conds.push('date(te.started_at) >= date(?)'); params.push(opts.from); }
    if (opts.to) { conds.push('date(te.started_at) <= date(?)'); params.push(opts.to); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return rowsAll(db, `${ENTRY_SQL} ${where} ORDER BY te.started_at DESC LIMIT 500`, params).map(rowToEntry);
  }

  



  static weeklyRollup(db: Database, _user: UserWithRole, weekStart: string): WeeklyAggregateRow[] {
    const weekEnd = (() => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0, 10);
    })();
    const rows = rowsAll(db, `
      SELECT te.user_id, u.full_name AS user_name,
             te.project_id, pr.name AS project_name,
             SUM(COALESCE(te.duration_seconds, 0)) AS total_seconds,
             u.hourly_rate
      FROM time_entries te
      LEFT JOIN users u ON u.id = te.user_id
      LEFT JOIN projects pr ON pr.id = te.project_id
      WHERE te.ended_at IS NOT NULL
        AND date(te.started_at) >= date(?)
        AND date(te.started_at) < date(?)
        AND te.project_id IS NOT NULL
      GROUP BY te.user_id, te.project_id
      ORDER BY user_name, project_name
    `, [weekStart, weekEnd]);

    return rows.map(r => {
      const sec = (r.total_seconds as number) || 0;
      const rate = (r.hourly_rate as number | null) ?? null;
      const hours = sec / 3600;
      return {
        user_id: r.user_id as number,
        user_name: (r.user_name as string) || '—',
        project_id: r.project_id as number,
        project_name: (r.project_name as string) || '—',
        total_seconds: sec,
        total_hours: Math.round(hours * 100) / 100,
        total_cost: rate ? Math.round(hours * rate * 100) / 100 : 0,
        hourly_rate: rate,
      };
    });
  }

  



  static pieceBreakdown(db: Database, _user: UserWithRole, projectId: number): Array<{
    piece_id: number; piece_name: string; estimated_hours: number | null;
    actual_seconds: number; actual_hours: number; total_cost: number; status: string;
  }> {
    const rows = rowsAll(db, `
      SELECT pp.id AS piece_id, pp.name AS piece_name, pp.estimated_hours, pp.status,
             SUM(COALESCE(te.duration_seconds, 0)) AS actual_seconds,
             SUM(COALESCE((te.duration_seconds / 3600.0) * COALESCE(u.hourly_rate, 0), 0)) AS total_cost
      FROM project_pieces pp
      LEFT JOIN time_entries te ON te.piece_id = pp.id AND te.ended_at IS NOT NULL
      LEFT JOIN users u ON u.id = te.user_id
      WHERE pp.project_id = ?
      GROUP BY pp.id
      ORDER BY pp.id
    `, [projectId]);
    return rows.map(r => {
      const sec = (r.actual_seconds as number) || 0;
      return {
        piece_id: r.piece_id as number,
        piece_name: r.piece_name as string,
        estimated_hours: (r.estimated_hours as number | null) ?? null,
        actual_seconds: sec,
        actual_hours: Math.round((sec / 3600) * 100) / 100,
        total_cost: Math.round(((r.total_cost as number) || 0) * 100) / 100,
        status: r.status as string,
      };
    });
  }

  static updatePieceEstimate(db: Database, _user: UserWithRole, pieceId: number, estimatedHours: number | null): void {
    db.run('UPDATE project_pieces SET estimated_hours = ? WHERE id = ?', [estimatedHours, pieceId]);
  }

  static updateUserRate(db: Database, _user: UserWithRole, userId: number, hourlyRate: number | null): void {
    db.run('UPDATE users SET hourly_rate = ? WHERE id = ?', [hourlyRate, userId]);
  }
}
