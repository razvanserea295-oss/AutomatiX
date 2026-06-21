







import type { Database } from 'sql.js';
import type { UserWithRole } from './authService';
import { CommandError } from '../middleware/errors';

export type CalendarEventType =
  | 'project_deadline' | 'project_start'
  | 'deplasare' | 'maintenance' | 'compliance_task'
  | 'invoice_due' | 'quotation_valid_until'
  | 'personal';                                   

export interface CalendarEvent {
  id: string;             
  type: CalendarEventType;
  title: string;
  date: string;           
  end_date?: string | null;
  url?: string;           
  source_id: number;
  status?: string | null;
  meta?: Record<string, any>;
}

export interface CalendarRange {
  from: string; 
  to: string;   
  types?: CalendarEventType[]; 
}

function rowsAll(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

function tableExists(db: Database, name: string): boolean {
  const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?");
  stmt.bind([name]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

type PersonalRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'workdays';

function isIsoDate(v: string | null | undefined): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isTime(v: string | null | undefined): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonthsIso(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

function addYearsIso(iso: string, years: number): string {
  const d = new Date(`${iso}T00:00:00`);
  const month = d.getMonth();
  const day = d.getDate();
  d.setFullYear(d.getFullYear() + years, month, 1);
  const last = new Date(d.getFullYear(), month + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

function normalizeRecurrence(v: unknown): PersonalRecurrence {
  return v === 'daily' || v === 'weekly' || v === 'monthly' || v === 'yearly' || v === 'workdays'
    ? v
    : 'none';
}

function expandPersonalDates(start: string, until: string | null, recurrence: PersonalRecurrence, from: string, to: string): string[] {
  if (recurrence === 'none') return [start].filter(d => d >= from && d <= to);
  const hardEnd = until && until >= start ? until : to;
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (cur <= hardEnd && cur <= to && guard < 400) {
    if (cur >= from) out.push(cur);
    if (recurrence === 'daily') cur = addDaysIso(cur, 1);
    else if (recurrence === 'weekly') cur = addDaysIso(cur, 7);
    else if (recurrence === 'monthly') cur = addMonthsIso(cur, 1);
    else if (recurrence === 'yearly') cur = addYearsIso(cur, 1);
    else {
      do { cur = addDaysIso(cur, 1); }
      while ([0, 6].includes(new Date(`${cur}T00:00:00`).getDay()) && cur <= hardEnd && cur <= to);
    }
    guard += 1;
  }
  return out;
}

export class CalendarService {
  static getEvents(db: Database, user: UserWithRole, range: CalendarRange): CalendarEvent[] {
    const { from, to } = range;
    const filter = new Set(range.types || []);
    const wantAll = filter.size === 0;
    const events: CalendarEvent[] = [];

    if (wantAll || filter.has('project_deadline')) {
      const rows = rowsAll(db,
        `SELECT id, name, deadline, status FROM projects
         WHERE deadline IS NOT NULL AND date(deadline) BETWEEN date(?) AND date(?)`,
        [from, to]);
      for (const r of rows) {
        events.push({
          id: `project_deadline:${r.id}`,
          type: 'project_deadline',
          title: `Deadline: ${r.name}`,
          date: r.deadline as string,
          status: r.status as string,
          source_id: r.id as number,
          url: `/projects/${r.id}`,
        });
      }
    }

    if (wantAll || filter.has('project_start')) {
      const rows = rowsAll(db,
        `SELECT id, name, start_date, status FROM projects
         WHERE start_date IS NOT NULL AND date(start_date) BETWEEN date(?) AND date(?)`,
        [from, to]);
      for (const r of rows) {
        events.push({
          id: `project_start:${r.id}`,
          type: 'project_start',
          title: `Start: ${r.name}`,
          date: r.start_date as string,
          status: r.status as string,
          source_id: r.id as number,
          url: `/projects/${r.id}`,
        });
      }
    }

    if ((wantAll || filter.has('deplasare')) && tableExists(db, 'deplasari')) {
      const rows = rowsAll(db,
        `SELECT id, person_name, destination, departure_date, return_date, status, project_id
         FROM deplasari
         WHERE date(departure_date) BETWEEN date(?) AND date(?)
            OR (return_date IS NOT NULL AND date(return_date) BETWEEN date(?) AND date(?))`,
        [from, to, from, to]);
      for (const r of rows) {
        events.push({
          id: `deplasare:${r.id}`,
          type: 'deplasare',
          title: `${r.person_name} → ${r.destination}`,
          date: r.departure_date as string,
          end_date: (r.return_date as string | null) ?? null,
          status: r.status as string,
          source_id: r.id as number,
          url: '/deplasari',
        });
      }
    }

    if ((wantAll || filter.has('maintenance')) && tableExists(db, 'station_maintenance_plans')) {
      const rows = rowsAll(db,
        `SELECT mp.id, mp.station_id, mp.maintenance_type, mp.next_execution_date, mp.status,
                s.name AS station_name
         FROM station_maintenance_plans mp
         LEFT JOIN installed_stations s ON s.id = mp.station_id
         WHERE date(mp.next_execution_date) BETWEEN date(?) AND date(?)`,
        [from, to]);
      for (const r of rows) {
        events.push({
          id: `maintenance:${r.id}`,
          type: 'maintenance',
          title: `${r.maintenance_type} — ${r.station_name || `stația #${r.station_id}`}`,
          date: r.next_execution_date as string,
          status: r.status as string,
          source_id: r.id as number,
          url: `/stations/${r.station_id}`,
        });
      }
    }

    if ((wantAll || filter.has('compliance_task')) && tableExists(db, 'compliance_tasks')) {
      const rows = rowsAll(db,
        `SELECT id, title, due_date, status, priority FROM compliance_tasks
         WHERE date(due_date) BETWEEN date(?) AND date(?)`,
        [from, to]);
      for (const r of rows) {
        events.push({
          id: `compliance_task:${r.id}`,
          type: 'compliance_task',
          title: r.title as string,
          date: r.due_date as string,
          status: r.status as string,
          source_id: r.id as number,
          meta: { priority: r.priority },
          url: '/finance',
        });
      }
    }

    if ((wantAll || filter.has('invoice_due')) && tableExists(db, 'finance_invoices')) {
      const rows = rowsAll(db,
        `SELECT i.id, i.invoice_number, i.due_date, i.status, c.name AS client_name, i.total, i.paid_amount
         FROM finance_invoices i LEFT JOIN clients c ON c.id = i.client_id
         WHERE date(i.due_date) BETWEEN date(?) AND date(?)
           AND i.status IN ('draft','sent')`,
        [from, to]);
      for (const r of rows) {
        events.push({
          id: `invoice_due:${r.id}`,
          type: 'invoice_due',
          title: `Scadență ${r.invoice_number} — ${r.client_name || ''}`,
          date: r.due_date as string,
          status: r.status as string,
          source_id: r.id as number,
          meta: { total: r.total, paid: r.paid_amount },
          url: '/finance',
        });
      }
    }

    if ((wantAll || filter.has('quotation_valid_until')) && tableExists(db, 'quotations')) {
      const rows = rowsAll(db,
        `SELECT id, quotation_number, title, client_name, valid_until, status FROM quotations
         WHERE valid_until IS NOT NULL AND date(valid_until) BETWEEN date(?) AND date(?)
           AND status IN ('draft','sent','viewed')`,
        [from, to]);
      for (const r of rows) {
        events.push({
          id: `quotation_valid_until:${r.id}`,
          type: 'quotation_valid_until',
          title: `Expiră oferta ${r.quotation_number} — ${r.client_name}`,
          date: r.valid_until as string,
          status: r.status as string,
          source_id: r.id as number,
          url: '/quotations',
        });
      }
    }

    
    
    if ((wantAll || filter.has('personal')) && tableExists(db, 'personal_calendar_events')) {
      const rows = rowsAll(db,
        `SELECT id, title, date, end_date, notes, color, start_time, end_time, recurrence
           FROM personal_calendar_events
          WHERE user_id = ?
            AND (
              date(date) BETWEEN date(?) AND date(?)
              OR (end_date IS NOT NULL AND date(end_date) BETWEEN date(?) AND date(?))
              OR recurrence IN ('daily','weekly','monthly','yearly','workdays')
            )`,
        [user.id, from, to, from, to]);
      for (const r of rows) {
        const recurrence = normalizeRecurrence(r.recurrence);
        const baseDate = r.date as string;
        const endDate = (r.end_date as string | null) ?? null;
        const dates = expandPersonalDates(baseDate, endDate, recurrence, from, to);
        for (const occ of dates) {
          events.push({
            id: recurrence === 'none' ? `personal:${r.id}` : `personal:${r.id}:${occ}`,
            type: 'personal',
            title: r.title as string,
            date: occ,
            end_date: recurrence === 'none' ? endDate : null,
            source_id: r.id as number,
            meta: {
              notes: r.notes as string | null,
              color: r.color as string | null,
              start_time: r.start_time as string | null,
              end_time: r.end_time as string | null,
              recurrence,
              base_date: baseDate,
              repeat_until: endDate,
            },
          });
        }
      }
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    return events;
  }

  
  
  

  static createPersonal(
    db: Database,
    user: UserWithRole,
    req: { title: string; date: string; end_date?: string | null; notes?: string | null; color?: string | null; start_time?: string | null; end_time?: string | null; recurrence?: string | null },
  ): { id: number } {
    const title = (req.title || '').trim();
    if (!title)        throw CommandError.badRequest('Titlu obligatoriu');
    if (!req.date)     throw CommandError.badRequest('Data obligatorie');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.date)) throw CommandError.badRequest('Format dată invalid (folosește YYYY-MM-DD)');
    if (req.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(req.end_date)) throw CommandError.badRequest('Format dată final invalid');
    if (req.end_date && req.end_date < req.date) throw CommandError.badRequest('Data de final nu poate fi înainte de cea de început');
    if (req.start_time && !isTime(req.start_time)) throw CommandError.badRequest('Ora de început este invalidă');
    if (req.end_time && !isTime(req.end_time)) throw CommandError.badRequest('Ora de final este invalidă');
    if (req.start_time && req.end_time && req.end_time <= req.start_time) throw CommandError.badRequest('Ora de final trebuie să fie după ora de început');
    const recurrence = normalizeRecurrence(req.recurrence);
    db.run(
      `INSERT INTO personal_calendar_events (user_id, title, date, end_date, notes, color, start_time, end_time, recurrence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, title, req.date, req.end_date ?? null, req.notes ?? null, req.color ?? null, req.start_time ?? null, req.end_time ?? null, recurrence],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const newId = idStmt.get()[0] as number;
    idStmt.free();
    return { id: newId };
  }

  




  static updatePersonal(
    db: Database,
    user: UserWithRole,
    req: { id: number; title?: string; date?: string; end_date?: string | null; notes?: string | null; color?: string | null; start_time?: string | null; end_time?: string | null; recurrence?: string | null },
  ): { ok: true } {
    const ownerStmt = db.prepare('SELECT user_id FROM personal_calendar_events WHERE id = ?');
    ownerStmt.bind([req.id]);
    if (!ownerStmt.step()) { ownerStmt.free(); throw CommandError.badRequest('Eveniment inexistent'); }
    const ownerId = ownerStmt.get()[0] as number;
    ownerStmt.free();
    if (ownerId !== user.id) throw CommandError.badRequest('Nu poți edita evenimente personale ale altui utilizator');

    if (req.date && !/^\d{4}-\d{2}-\d{2}$/.test(req.date)) throw CommandError.badRequest('Format dată invalid');
    if (req.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(req.end_date)) throw CommandError.badRequest('Format dată final invalid');
    if (req.start_time && !isTime(req.start_time)) throw CommandError.badRequest('Ora de început este invalidă');
    if (req.end_time && !isTime(req.end_time)) throw CommandError.badRequest('Ora de final este invalidă');
    if (req.start_time && req.end_time && req.end_time <= req.start_time) throw CommandError.badRequest('Ora de final trebuie să fie după ora de început');
    const recurrence = req.recurrence === undefined ? undefined : normalizeRecurrence(req.recurrence);

    db.run(
      `UPDATE personal_calendar_events SET
         title    = COALESCE(?, title),
         date     = COALESCE(?, date),
         end_date = CASE WHEN ? IS NULL THEN end_date
                         WHEN ? = ''    THEN NULL
                         ELSE ? END,
         notes    = CASE WHEN ? IS NULL THEN notes
                         WHEN ? = ''    THEN NULL
                         ELSE ? END,
         color    = CASE WHEN ? IS NULL THEN color
                         WHEN ? = ''    THEN NULL
                         ELSE ? END,
         start_time = CASE WHEN ? IS NULL THEN start_time
                           WHEN ? = ''    THEN NULL
                           ELSE ? END,
         end_time   = CASE WHEN ? IS NULL THEN end_time
                           WHEN ? = ''    THEN NULL
                           ELSE ? END,
         recurrence = COALESCE(?, recurrence),
         updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [
        req.title ?? null,
        req.date ?? null,
        req.end_date ?? null, req.end_date ?? null, req.end_date ?? null,
        req.notes ?? null,    req.notes ?? null,    req.notes ?? null,
        req.color ?? null,    req.color ?? null,    req.color ?? null,
        req.start_time ?? null, req.start_time ?? null, req.start_time ?? null,
        req.end_time ?? null,   req.end_time ?? null,   req.end_time ?? null,
        recurrence ?? null,
        req.id, user.id,
      ],
    );
    return { ok: true };
  }

  static deletePersonal(db: Database, user: UserWithRole, id: number): { ok: true } {
    
    
    db.run('DELETE FROM personal_calendar_events WHERE id = ? AND user_id = ?', [id, user.id]);
    return { ok: true };
  }

  





  static reschedule(db: Database, user: UserWithRole, eventId: string, newDate: string): { ok: true } {
    const [type, idStr] = eventId.split(':');
    const id = Number(idStr);
    if (!id) throw CommandError.badRequest('Invalid event id');

    switch (type) {
      case 'project_deadline':
        db.run('UPDATE projects SET deadline = ? WHERE id = ?', [newDate, id]);
        break;
      case 'project_start':
        db.run('UPDATE projects SET start_date = ? WHERE id = ?', [newDate, id]);
        break;
      case 'compliance_task':
        db.run("UPDATE compliance_tasks SET due_date = ?, updated_at = datetime('now') WHERE id = ?", [newDate, id]);
        break;
      case 'maintenance':
        db.run("UPDATE station_maintenance_plans SET next_execution_date = ?, updated_at = datetime('now') WHERE id = ?", [newDate, id]);
        break;
      case 'deplasare':
        db.run("UPDATE deplasari SET departure_date = ?, updated_at = datetime('now') WHERE id = ?", [newDate, id]);
        break;
      case 'personal':
        
        
        db.run(
          "UPDATE personal_calendar_events SET date = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
          [newDate, id, user.id],
        );
        break;
      default:
        throw CommandError.badRequest(`Cannot reschedule event of type ${type}`);
    }
    return { ok: true };
  }

  



  static buildICal(db: Database, user: UserWithRole, range: CalendarRange): string {
    const events = this.getEvents(db, user, range);
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Promix//Calendar//RO',
      'CALSCALE:GREGORIAN',
    ];
    for (const ev of events) {
      const dt = ev.date.replace(/-/g, '').slice(0, 8);
      const dtEnd = (ev.end_date || ev.date).replace(/-/g, '').slice(0, 8);
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev.id}@promix`);
      lines.push(`DTSTAMP:${dt}T000000Z`);
      lines.push(`DTSTART;VALUE=DATE:${dt}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${ev.title.replace(/[\r\n,;]/g, ' ')}`);
      if (ev.status) lines.push(`DESCRIPTION:Status: ${ev.status}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}
