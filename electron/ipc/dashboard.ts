import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { DashboardService } from '../services/dashboardService';

export function registerDashboardHandlers(): void {
  ipcRegister('get_dashboard_data', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      const range = (args?.from && args?.to)
        ? { from: args.from as string, to: args.to as string }
        : undefined;
      return DashboardService.getDashboard(db, user, range);
    });
  });
}
