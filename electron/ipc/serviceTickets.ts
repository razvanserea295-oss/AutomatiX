import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { ServiceTicketService } from '../services/serviceTicketService';
import { type Authed, type Cmd, payload } from '../commands/cmdArgs';


type ListTicketsOpts = Parameters<typeof ServiceTicketService.list>[2];
type CreateTicketRequest = Parameters<typeof ServiceTicketService.create>[2];
type UpdateTicketRequest = Parameters<typeof ServiceTicketService.update>[2];
type AddPartRequest = Parameters<typeof ServiceTicketService.addPart>[3];

export function registerServiceTicketHandlers(): void {
  ipcRegister<Authed & ListTicketsOpts>('list_service_tickets', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      ServiceTicketService.list(db, user, {
        station_id: args?.station_id, client_id: args?.client_id,
        assigned_user_id: args?.assigned_user_id, only_open: args?.only_open,
        status: args?.status,
      }),
    ),
  );

  ipcRegister<Authed & { ticket_id: number }>('get_service_ticket', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      ServiceTicketService.get(db, user, args.ticket_id),
    ),
  );

  ipcRegister<Cmd<CreateTicketRequest>>('create_service_ticket', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      ServiceTicketService.create(db, user, payload(args)),
    ),
  );

  ipcRegister<Cmd<UpdateTicketRequest>>('update_service_ticket', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      ServiceTicketService.update(db, user, payload(args)),
    ),
  );

  ipcRegister<Authed & { ticket_id: number }>('delete_service_ticket', async (args) =>
    withAuthenticatedUser(args.token, (db, user) => {
      ServiceTicketService.delete(db, user, args.ticket_id);
      return { ok: true };
    }),
  );

  ipcRegister<Authed & { ticket_id: number; body: string; comment_type?: string }>('add_service_ticket_comment', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      ServiceTicketService.addComment(db, user, args.ticket_id, args.body, args.comment_type),
    ),
  );

  ipcRegister<Authed & { ticket_id: number; part?: AddPartRequest; request?: AddPartRequest } & Partial<AddPartRequest>>('add_service_ticket_part', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      ServiceTicketService.addPart(db, user, args.ticket_id, (args.part || args.request || args) as AddPartRequest),
    ),
  );

  ipcRegister<Authed & { part_id: number }>('remove_service_ticket_part', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      ServiceTicketService.removePart(db, user, args.part_id),
    ),
  );

  ipcRegister<Authed & { station_id: number }>('get_station_ticket_history', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      ServiceTicketService.stationHistory(db, user, args.station_id),
    ),
  );

  ipcRegister<Authed>('get_service_ticket_stats', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      ServiceTicketService.getStats(db, user),
    ),
  );
}
