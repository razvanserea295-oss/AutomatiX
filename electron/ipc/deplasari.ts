import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { DeplasariService } from '../services/deplasariService';

export function registerDeplasariHandlers(): void {
  ipcRegister('get_deplasari', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => DeplasariService.getAll(db));
  });

  ipcRegister('create_deplasare', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DeplasariService.create(db, user, args.request || args));
  });

  ipcRegister('update_deplasare', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DeplasariService.update(db, user, args.request || args));
  });

  ipcRegister('delete_deplasare', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DeplasariService.delete(db, user, args.id));
  });

  
  ipcRegister('list_deplasare_payments', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => DeplasariService.listPayments(db, Number(args?.deplasare_id)));
  });

  ipcRegister('record_deplasare_payment', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DeplasariService.recordPayment(db, user, args.request || args));
  });

  ipcRegister('delete_deplasare_payment', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => DeplasariService.deletePayment(db, user, Number(args?.id)));
  });
}
