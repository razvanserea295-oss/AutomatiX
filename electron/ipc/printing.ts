import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, withAdminUser } from '../middleware/auth';
import { PrintService } from '../services/printService';

export function registerPrintingHandlers(): void {
  // Printers the current user may print to (installed ∩ admin-approved).
  ipcRegister('list_printers', async (args: any) =>
    withAuthenticatedUser(args?.token, (db) => PrintService.listPrintablePrinters(db)));

  // Recent print jobs (own jobs; all jobs for admin).
  ipcRegister('list_print_jobs', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => PrintService.listJobs(db, user, args?.limit)));

  // Upload + print a file (viewer is rejected inside the service).
  ipcRegister('print_file', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => PrintService.printFile(db, user, args)));

  // Admin: read all installed printers + approval flags + global toggle.
  ipcRegister('admin_print_config_get', async (args: any) =>
    withAdminUser(args?.token, (db) => PrintService.adminGetConfig(db)));

  // Admin: set the approved-printer allowlist + the enable toggle.
  ipcRegister('admin_print_config_set', async (args: any) =>
    withAdminUser(args?.token, (db, user) => PrintService.adminSetConfig(db, user, args)));
}
