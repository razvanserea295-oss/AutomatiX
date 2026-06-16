import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { SupplierCodesService } from '../services/supplierCodesService';

export function registerSupplierCodeHandlers(): void {
  
  
  ipcRegister('get_supplier_codes', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      SupplierCodesService.list(db, user, !!args?.include_inactive),
    ),
  );

  ipcRegister('create_supplier_code', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      SupplierCodesService.create(db, user, args?.request || args),
    ),
  );

  ipcRegister('update_supplier_code', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      SupplierCodesService.update(db, user, args?.request || args),
    ),
  );

  ipcRegister('delete_supplier_code', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      SupplierCodesService.delete(db, user, args?.id),
    ),
  );
}
