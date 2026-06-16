












import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { NotificationsService } from '../services/notificationsService';

export function registerNotificationsHandlers(): void {
  ipcRegister('get_user_notifications', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      const limit = Number(args?.limit) || 30;
      return NotificationsService.list(db, user.id, limit);
    }),
  );

  ipcRegister('mark_notification_read', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      const id = Number(args?.id);
      requirePositiveId(id, 'id');
      NotificationsService.markRead(db, user.id, id);
      return { ok: true };
    }),
  );

  ipcRegister('mark_all_notifications_read', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      NotificationsService.markAllRead(db, user.id);
      return { ok: true, unread: 0 };
    }),
  );
}
