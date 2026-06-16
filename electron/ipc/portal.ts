import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { PortalService } from '../services/portalService';

export function registerPortalHandlers(): void {
  ipcRegister('list_portal_tokens', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      PortalService.listForProject(db, user, args.project_id),
    ),
  );

  ipcRegister('create_portal_token', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      PortalService.create(db, user, args.project_id, {
        label: args?.label, expires_at: args?.expires_at,
      }),
    ),
  );

  ipcRegister('revoke_portal_token', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      PortalService.revoke(db, user, args.token_id);
      return { ok: true };
    }),
  );

  ipcRegister('delete_portal_token', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      PortalService.delete(db, user, args.token_id);
      return { ok: true };
    }),
  );
}
