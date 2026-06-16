import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { ActivityLogService } from '../services/activityLogService';





export function registerActivityLogHandlers(): void {
  
  
  ipcRegister('get_user_activity_log', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ActivityLogService.getUserActivity(db, user, args?.request ?? args ?? {})),
  );

  
  ipcRegister('get_activity_actors', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ActivityLogService.getActivityActors(db, user)),
  );
}
