import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, withAdminUser } from '../middleware/auth';
import { BroadcastService } from '../services/broadcastService';
import { saveDatabase } from '../db/connection';

export function registerBroadcastHandlers(): void {
  // Admin-only management — RBAC enforced at the IPC boundary (withAdminUser)
  // instead of only inside the service, so the gate is explicit and uniform.
  ipcRegister('admin_create_broadcast', async (args: any) =>
    withAdminUser(args?.token, (db, user) => {
      const res = BroadcastService.create(db, user, args?.request || args);
      saveDatabase();
      return res;
    }),
  );

  ipcRegister('admin_list_broadcasts', async (args: any) =>
    withAdminUser(args?.token, (db, user) =>
      BroadcastService.listAll(db, user),
    ),
  );

  ipcRegister('admin_delete_broadcast', async (args: any) =>
    withAdminUser(args?.token, (db, user) => {
      BroadcastService.delete(db, user, Number(args?.id));
      saveDatabase();
      return { ok: true };
    }),
  );

  
  ipcRegister('get_pending_broadcasts', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      BroadcastService.getPending(db, user),
    ),
  );

  ipcRegister('dismiss_broadcast', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      BroadcastService.dismiss(db, user, Number(args?.broadcast_id ?? args?.id));
      saveDatabase();
      return { ok: true };
    }),
  );
}
