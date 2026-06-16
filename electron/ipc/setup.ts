import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, withAdminUser } from '../middleware/auth';
import { SetupService } from '../services/setupService';
import { type Authed, type Cmd, payload } from '../commands/cmdArgs';






export function registerSetupHandlers(): void {
  ipcRegister<Authed>('get_setup_state', async (args) =>
    withAuthenticatedUser(args.token, (db) => SetupService.getState(db)),
  );

  ipcRegister<Cmd<Parameters<typeof SetupService.saveCompanyProfile>[2]>>(
    'save_company_profile',
    async (args) => withAdminUser(args.token, (db, user) =>
      SetupService.saveCompanyProfile(db, user, payload(args)),
    ),
  );

  ipcRegister<Cmd<Parameters<typeof SetupService.saveBranding>[2]>>(
    'save_company_branding',
    async (args) => withAdminUser(args.token, (db, user) =>
      SetupService.saveBranding(db, user, payload(args)),
    ),
  );

  ipcRegister<Cmd<Parameters<typeof SetupService.saveFiscalSettings>[2]>>(
    'save_fiscal_settings',
    async (args) => withAdminUser(args.token, (db, user) =>
      SetupService.saveFiscalSettings(db, user, payload(args)),
    ),
  );

  ipcRegister<Authed>('complete_initial_setup', async (args) =>
    withAdminUser(args.token, (db, user) => SetupService.completeInitialSetup(db, user)),
  );

  ipcRegister<Authed>('reopen_initial_setup', async (args) =>
    withAdminUser(args.token, (db, user) => SetupService.reopenInitialSetup(db, user)),
  );
}
