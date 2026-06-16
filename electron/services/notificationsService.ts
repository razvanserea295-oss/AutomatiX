
























import type { Database } from 'sql.js';

export type NotificationKind =
  
  | 'handoff' | 'escalation' | 'mention'
  | 'task_assigned' | 'task_completed' | 'task_clarification'
  | 'task_reopened' | 'task_due_soon' | 'task_overdue'
  
  | 'briefing_received'
  | 'briefing_clarification_asked'
  | 'briefing_clarification_answered'
  | 'briefing_accepted'
  | 'briefing_rejected'
  | 'briefing_completed'
  | 'briefing_cancelled'
  | 'piece_order_requested'
  | 'piece_order_ordered'
  | 'piece_order_arrived'
  | 'piece_order_installed'
  | 'piece_order_cancelled';

export interface NotificationInput {
  userId: number;
  kind: NotificationKind;
  title: string;
  message: string;
  
  linkPage?: string | null;
}

export interface UserNotificationRow {
  id: number;
  user_id: number;
  kind: string;
  title: string;
  message: string;
  link_page: string | null;
  read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationListResult {
  
  items: UserNotificationRow[];
  
  unread: number;
}






function clip(s: string | null | undefined, max: number): string {
  if (!s) return '';
  const t = String(s).trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

export class NotificationsService {
  
  static notify(db: Database, input: NotificationInput): void {
    NotificationsService.insertOne(db, input);
  }

  

  static notifyMany(
    db: Database,
    userIds: Array<number | null | undefined>,
    payload: Omit<NotificationInput, 'userId'>,
    selfUserId?: number | null,
  ): void {
    const seen = new Set<number>();
    for (const raw of userIds) {
      const uid = Number(raw);
      if (!uid || uid <= 0) continue;
      if (selfUserId && uid === selfUserId) continue;
      if (seen.has(uid)) continue;
      seen.add(uid);
      NotificationsService.insertOne(db, { ...payload, userId: uid });
    }
  }

  
  static notifyAdmins(
    db: Database,
    payload: Omit<NotificationInput, 'userId'>,
    selfUserId?: number | null,
  ): void {
    const ids = NotificationsService.adminIds(db);
    NotificationsService.notifyMany(db, ids, payload, selfUserId);
  }

  











  static notifyUsersWithPageAccess(
    db: Database,
    pageId: string,
    payload: Omit<NotificationInput, 'userId'>,
    selfUserId?: number | null,
  ): void {
    const stmt = db.prepare(`
      SELECT u.id, LOWER(r.name) AS role_name, u.custom_pages
        FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.active = 1`);
    const recipients: number[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as { id: number; role_name: string; custom_pages: string | null };
      const isAdmin = row.role_name === 'admin';
      if (isAdmin) { recipients.push(row.id); continue; }
      
      const cp = row.custom_pages;
      if (cp) {
        try {
          const parsed = JSON.parse(cp);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            if (parsed[pageId] === 'denied') continue;
          }
        } catch {  }
      }
      recipients.push(row.id);
    }
    stmt.free();
    NotificationsService.notifyMany(db, recipients, payload, selfUserId);
  }

  
  
  

  /**
   * List the latest `limit` notifications for the user. We sort by
   * unread first (so the bell-panel surfaces actionable items at the
   * top) and within each bucket by recency. The unread total is
   * computed across ALL rows, not just the returned page, because the
   * bell badge needs the global count.
   */
  static list(db: Database, userId: number, limit = 30): NotificationListResult {
    const cap = Math.max(1, Math.min(200, Number(limit) || 30));
    const stmt = db.prepare(
      `SELECT id, user_id, kind, title, message, link_page, read, created_at, read_at
         FROM user_notifications
        WHERE user_id = ?
        ORDER BY read ASC, created_at DESC
        LIMIT ?`,
    );
    stmt.bind([userId, cap]);
    const items: UserNotificationRow[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      items.push({
        id: r.id as number,
        user_id: r.user_id as number,
        kind: r.kind as string,
        title: r.title as string,
        message: r.message as string,
        link_page: (r.link_page as string | null) ?? null,
        read: !!(r.read as number),
        created_at: r.created_at as string,
        read_at: (r.read_at as string | null) ?? null,
      });
    }
    stmt.free();

    const cs = db.prepare('SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND read = 0');
    cs.bind([userId]);
    cs.step();
    const unread = cs.get()[0] as number;
    cs.free();

    return { items, unread };
  }

  


  static markRead(db: Database, userId: number, notificationId: number): void {
    db.run(
      `UPDATE user_notifications
          SET read = 1, read_at = datetime('now')
        WHERE id = ? AND user_id = ? AND read = 0`,
      [notificationId, userId],
    );
  }

  

  static markAllRead(db: Database, userId: number): number {
    db.run(
      `UPDATE user_notifications
          SET read = 1, read_at = datetime('now')
        WHERE user_id = ? AND read = 0`,
      [userId],
    );
    
    return 0;
  }

  
  
  

  private static insertOne(db: Database, input: NotificationInput): void {
    try {
      db.run(
        `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [
          input.userId,
          input.kind,
          clip(input.title, 200) || '—',
          clip(input.message, 500),
          input.linkPage ?? null,
        ],
      );
    } catch (e) {
      
      
      
      console.warn('[notifications] insert failed:', e instanceof Error ? e.message : e);
    }
  }

  private static adminIds(db: Database): number[] {
    const stmt = db.prepare(`
      SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.active = 1 AND LOWER(r.name) = 'admin'`);
    const out: number[] = [];
    while (stmt.step()) out.push(stmt.get()[0] as number);
    stmt.free();
    return out;
  }
}
