import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { AlertService } from '../services/alertService';

export function registerAlertHandlers(): void {
  ipcRegister('get_alerts', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => {
      return AlertService.getAlerts(db);
    });
  });

  ipcRegister('create_alert', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return AlertService.createAlert(db, user, args.request || args);
    });
  });

  ipcRegister('update_alert', async (args: any) => {
    const req = args?.request ?? args;
    requirePositiveId(req?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, user) => {
      return AlertService.updateAlert(db, user, req);
    });
  });

  ipcRegister('acknowledge_alert', async (args: any) => {
    requirePositiveId(args?.alert_id, 'alert_id');
    return withAuthenticatedUser(args?.token, (db, user) => {
      return AlertService.acknowledgeAlert(db, user, args.alert_id);
    });
  });

  ipcRegister('generate_system_alerts', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => {
      return AlertService.generateSystemAlerts(db);
    });
  });
}
