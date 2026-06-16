import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { WorkspaceService } from '../services/workspaceService';

export function registerWorkspaceHandlers(): void {
  ipcRegister('get_workspace_profile', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => WorkspaceService.getProfile(db, user));
  });

  ipcRegister('update_workspace_profile', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => WorkspaceService.updateProfile(db, user, args.request || args));
  });

  ipcRegister('export_personal_data', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => WorkspaceService.exportPersonalData(db, user));
  });

  ipcRegister('import_personal_data', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => WorkspaceService.importPersonalData(db, user, args.request || args));
  });

  ipcRegister('get_system_monitor', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => WorkspaceService.getSystemMonitor(db, user));
  });

  ipcRegister('get_moderation_dashboard', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => WorkspaceService.getModerationDashboard(db, user));
  });

  ipcRegister('create_moderation_report', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => WorkspaceService.createModerationReport(db, user, args.request || args));
  });

  ipcRegister('resolve_moderation_report', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => WorkspaceService.resolveModerationReport(db, user, args.request || args));
  });
}
