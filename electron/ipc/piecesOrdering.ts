import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { PiecesOrderingService } from '../services/piecesOrderingService';

export function registerPiecesOrderingHandlers(): void {
  ipcRegister('get_piece_orders', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      PiecesOrderingService.list(db, user, {
        status: args?.status,
        project_id: args?.project_id,
        supplier_code: args?.supplier_code,
      }),
    ),
  );

  ipcRegister('create_piece_order_request', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      PiecesOrderingService.createRequest(db, user, args?.request || args),
    ),
  );

  ipcRegister('update_piece_order_status', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      PiecesOrderingService.updateStatus(db, user, args?.request || args),
    ),
  );

  ipcRegister('update_piece_order_notes', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      PiecesOrderingService.updateNotes(db, user, { id: args?.id, notes: args?.notes ?? null }),
    ),
  );

  ipcRegister('cancel_piece_order', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      PiecesOrderingService.cancel(db, user, args?.id),
    ),
  );
}
