import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { ProductionDocsService } from '../services/productionDocsService';

export function registerProductionDocsHandlers(): void {
  ipcRegister('list_bon_consums_by_project', async (args: any) => {
    requirePositiveId(args?.project_id, 'project_id');
    return withAuthenticatedUser(args?.token, (db, _user) => ProductionDocsService.listBonConsumsByProject(db, args.project_id));
  });

  ipcRegister('get_bon_consum', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, _user) => ProductionDocsService.getBonConsum(db, args.id));
  });

  ipcRegister('create_bon_consum', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => ProductionDocsService.createBonConsum(db, user, args.request || args));
  });

  ipcRegister('list_avize_by_project', async (args: any) => {
    requirePositiveId(args?.project_id, 'project_id');
    return withAuthenticatedUser(args?.token, (db, _user) => ProductionDocsService.listAvizeByProject(db, args.project_id));
  });

  ipcRegister('get_aviz', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, _user) => ProductionDocsService.getAviz(db, args.id));
  });

  ipcRegister('create_aviz', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => ProductionDocsService.createAviz(db, user, args.request || args));
  });

  ipcRegister('list_invoices_by_project', async (args: any) => {
    requirePositiveId(args?.project_id, 'project_id');
    return withAuthenticatedUser(args?.token, (db, _user) => ProductionDocsService.listInvoicesByProject(db, args.project_id));
  });

  ipcRegister('create_invoice', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => ProductionDocsService.createInvoice(db, user, args.request || args));
  });
}
