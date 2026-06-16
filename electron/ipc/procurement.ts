import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { ProcurementService } from '../services/procurementService';

export function registerProcurementHandlers(): void {
  ipcRegister('get_suppliers', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => {
      return ProcurementService.getSuppliers(db);
    });
  });

  ipcRegister('create_supplier', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ProcurementService.createSupplier(db, user, args.request || args);
    });
  });

  ipcRegister('update_supplier', async (args: any) => {
    requirePositiveId(args?.request?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ProcurementService.updateSupplier(db, user, args.request || args);
    });
  });

  ipcRegister('delete_supplier', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ProcurementService.deleteSupplier(db, user, args.id);
    });
  });

  ipcRegister('get_purchase_orders', async (args: any) => {
    if (args?.project_id) requirePositiveId(args.project_id, 'project_id');
    return withAuthenticatedUser(args?.token, (db, _user) => {
      return ProcurementService.listPurchaseOrders(db, args?.project_id);
    });
  });

  ipcRegister('get_purchase_order', async (args: any) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args?.token, (db, _user) => {
      return ProcurementService.getPurchaseOrder(db, args.id);
    });
  });

  ipcRegister('create_purchase_order', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ProcurementService.createPurchaseOrder(db, user, args.request || args);
    });
  });

  ipcRegister('receive_purchase_line', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ProcurementService.receivePurchaseLine(db, user, args.request || args);
    });
  });
}
