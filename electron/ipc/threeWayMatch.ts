import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { ThreeWayMatchService } from '../services/threeWayMatchService';

export function registerThreeWayMatchHandlers(): void {
  ipcRegister('list_supplier_invoices', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ThreeWayMatchService.listSupplierInvoices(db, user, {
        status: args?.status, supplier_id: args?.supplier_id,
        project_id: args?.project_id, po_id: args?.po_id,
      }),
    ),
  );

  ipcRegister('get_supplier_invoice', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ThreeWayMatchService.getSupplierInvoice(db, user, args.invoice_id),
    ),
  );

  ipcRegister('create_supplier_invoice', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ThreeWayMatchService.createSupplierInvoice(db, user, args.request || args),
    ),
  );

  ipcRegister('delete_supplier_invoice', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      ThreeWayMatchService.deleteSupplierInvoice(db, user, args.invoice_id);
      return { ok: true };
    }),
  );

  ipcRegister('compute_three_way_match', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ThreeWayMatchService.computeMatch(db, user, args.invoice_id),
    ),
  );

  ipcRegister('approve_supplier_invoice', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ThreeWayMatchService.approveSupplierInvoice(db, user, args.invoice_id),
    ),
  );

  ipcRegister('reject_supplier_invoice', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ThreeWayMatchService.rejectSupplierInvoice(db, user, args.invoice_id, args.reason),
    ),
  );

  ipcRegister('record_supplier_invoice_payment', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ThreeWayMatchService.recordPayment(db, user, args.invoice_id, args.amount),
    ),
  );

  ipcRegister('get_matching_thresholds', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, _user) => ThreeWayMatchService.getThresholds(db)),
  );

  ipcRegister('update_matching_thresholds', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      ThreeWayMatchService.updateThresholds(db, user, args.request || args),
    ),
  );
}
