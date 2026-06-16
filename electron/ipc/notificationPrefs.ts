import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { NotificationPrefsService } from '../services/notificationPrefsService';

export function registerNotificationPrefsHandlers(): void {
  ipcRegister('get_notification_prefs', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      NotificationPrefsService.getForUser(db, user),
    ),
  );

  ipcRegister('update_notification_prefs', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      NotificationPrefsService.updateForUser(db, user, args.prefs || args.request || args),
    ),
  );
}
