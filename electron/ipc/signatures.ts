import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { SignatureService } from '../services/signatureService';

export function registerSignatureHandlers(): void {
  ipcRegister('list_signatures', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      SignatureService.list(db, user, args.target_type, args.target_id),
    ),
  );

  ipcRegister('add_signature', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      SignatureService.add(db, user, args.request || args),
    ),
  );

  ipcRegister('delete_signature', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      SignatureService.delete(db, user, args.id);
      return { ok: true };
    }),
  );
}
