import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { ReportsService } from '../services/reportsService';

export function registerReportsHandlers(): void {
  ipcRegister('get_report_sources', async (args: any) =>
    withAuthenticatedUser(args?.token, (_db, _user) => ReportsService.getSources()),
  );

  ipcRegister('run_report', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ReportsService.run(db, user, args.config || args.request || args),
    ),
  );

  ipcRegister('list_report_presets', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => ReportsService.listPresets(db, user)),
  );

  ipcRegister('save_report_preset', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      ReportsService.savePreset(db, user, args.request || args);
      return { ok: true };
    }),
  );

  ipcRegister('delete_report_preset', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      ReportsService.deletePreset(db, user, args.id);
      return { ok: true };
    }),
  );
}
