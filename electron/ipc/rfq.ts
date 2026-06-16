import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { RfqService } from '../services/rfqService';

export function registerRfqHandlers(): void {
  ipcRegister('list_rfqs', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => RfqService.list(db, user, args?.status)),
  );

  ipcRegister('get_rfq', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => RfqService.get(db, user, args.rfq_id)),
  );

  ipcRegister('create_rfq', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      RfqService.create(db, user, args.request || args),
    ),
  );

  ipcRegister('delete_rfq', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      RfqService.delete(db, user, args.rfq_id);
      return { ok: true };
    }),
  );

  ipcRegister('send_rfq_invitations', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      RfqService.sendInvitations(db, user, args.rfq_id),
    ),
  );

  ipcRegister('award_rfq', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      RfqService.award(db, user, args.rfq_id, args.supplier_id),
    ),
  );

  ipcRegister('compare_rfq', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      RfqService.compare(db, user, args.rfq_id),
    ),
  );
}
