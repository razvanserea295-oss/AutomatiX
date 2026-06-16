import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { UserSessionsService } from '../services/userSessionsService';

export function registerUserSessionsHandlers(): void {
  ipcRegister('list_active_sessions', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      UserSessionsService.listActive(db, user),
    ),
  );

  ipcRegister('get_user_login_history', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      UserSessionsService.getUserHistory(db, user, Number(args?.user_id), Number(args?.limit) || 100),
    ),
  );

  ipcRegister('force_logout_user', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      UserSessionsService.forceLogout(db, user, Number(args?.user_id)),
    ),
  );

  ipcRegister('get_sessions_summary', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      UserSessionsService.getSummary(db, user),
    ),
  );
}
