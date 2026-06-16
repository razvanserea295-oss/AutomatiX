import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { TimeTrackingService } from '../services/timeTrackingService';

export function registerTimeTrackingHandlers(): void {
  ipcRegister('time_start', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      // close_previous defaults to true (auto-close any running timer). Pass
      // false to make the server REJECT when a timer is already running on
      // another piece, so the UI can ask "Închid timer-ul precedent?".
      TimeTrackingService.start(db, user, args.piece_id, args.notes, args.close_previous !== false),
    ),
  );

  ipcRegister('time_stop', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      TimeTrackingService.stop(db, user, args?.entry_id),
    ),
  );

  ipcRegister('time_get_active', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      TimeTrackingService.getActive(db, user),
    ),
  );

  ipcRegister('time_list_entries', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      TimeTrackingService.listEntries(db, user, {
        user_id: args?.user_id, piece_id: args?.piece_id, project_id: args?.project_id,
        from: args?.from, to: args?.to,
      }),
    ),
  );

  ipcRegister('time_weekly_rollup', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      TimeTrackingService.weeklyRollup(db, user, args.week_start),
    ),
  );

  ipcRegister('time_piece_breakdown', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      TimeTrackingService.pieceBreakdown(db, user, args.project_id),
    ),
  );

  ipcRegister('time_update_piece_estimate', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      TimeTrackingService.updatePieceEstimate(db, user, args.piece_id, args.estimated_hours);
      return { ok: true };
    }),
  );

  ipcRegister('time_update_user_rate', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      TimeTrackingService.updateUserRate(db, user, args.user_id, args.hourly_rate);
      return { ok: true };
    }),
  );
}
