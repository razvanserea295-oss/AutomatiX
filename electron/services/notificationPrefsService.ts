





import type { Database } from 'sql.js';
import type { UserWithRole } from './authService';

export const EVENT_TYPES = [
  'handoff_assigned',
  'handoff_overdue',
  'sla_breach',
  'mention',
  'project_changed',
  'comment_reply',
  'invoice_due_soon',
  'daily_briefing',
] as const;

export type NotificationEventType = typeof EVENT_TYPES[number];

export const EVENT_LABELS: Record<NotificationEventType, string> = {
  handoff_assigned:  'Handoff nou primit',
  handoff_overdue:   'Handoff overdue / în așteptare',
  sla_breach:        'Depășire SLA',
  mention:           'Mențiune (@user) în comentariu',
  project_changed:   'Modificare proiect',
  comment_reply:     'Răspuns la comentariu',
  invoice_due_soon:  'Factură aproape de scadență',
  daily_briefing:    'Briefing zilnic (digest)',
};

export interface NotificationPreference {
  event_type: NotificationEventType;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

function rowsAll(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

export class NotificationPrefsService {
  static getForUser(db: Database, user: UserWithRole): NotificationPreference[] {
    const existing = rowsAll(db,
      'SELECT event_type, email_enabled, in_app_enabled FROM notification_preferences WHERE user_id = ?',
      [user.id]);
    const map = new Map<string, NotificationPreference>();
    for (const r of existing) {
      map.set(r.event_type as string, {
        event_type: r.event_type as NotificationEventType,
        email_enabled: ((r.email_enabled as number) || 0) === 1,
        in_app_enabled: ((r.in_app_enabled as number) || 0) === 1,
      });
    }
    
    return EVENT_TYPES.map(et => map.get(et) || {
      event_type: et,
      email_enabled: ['handoff_assigned', 'sla_breach', 'mention', 'invoice_due_soon'].includes(et),
      in_app_enabled: true,
    });
  }

  static updateForUser(db: Database, user: UserWithRole, prefs: NotificationPreference[]): NotificationPreference[] {
    for (const p of prefs) {
      if (!EVENT_TYPES.includes(p.event_type as NotificationEventType)) continue;
      db.run(
        `INSERT INTO notification_preferences (user_id, event_type, email_enabled, in_app_enabled, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, event_type) DO UPDATE SET
           email_enabled = excluded.email_enabled,
           in_app_enabled = excluded.in_app_enabled,
           updated_at = datetime('now')`,
        [user.id, p.event_type, p.email_enabled ? 1 : 0, p.in_app_enabled ? 1 : 0],
      );
    }
    return this.getForUser(db, user);
  }

  



  static shouldNotify(db: Database, userId: number, eventType: NotificationEventType, channel: 'email' | 'in_app'): boolean {
    const stmt = db.prepare(
      `SELECT email_enabled, in_app_enabled FROM notification_preferences WHERE user_id = ? AND event_type = ?`);
    stmt.bind([userId, eventType]);
    let result = true;
    if (stmt.step()) {
      const r = stmt.getAsObject();
      result = ((r[channel === 'email' ? 'email_enabled' : 'in_app_enabled'] as number) || 0) === 1;
    }
    stmt.free();
    return result;
  }
}
