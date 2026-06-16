import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import {
  SalesService,
  type CreateLeadRequest,
  type UpdateLeadRequest,
  type AddLeadNoteRequest,
  type ConvertLeadRequest,
} from '../services/salesService';
import { type Authed, type Cmd, payload } from '../commands/cmdArgs';


type AddAttachmentRequest = Parameters<typeof SalesService.addAttachment>[2];

export function registerSalesHandlers(): void {
  ipcRegister<Authed>('get_sales_stats', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return SalesService.getStats(db, user);
    });
  });

  ipcRegister<Authed>('get_sales_leads', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return SalesService.getAll(db, user);
    });
  });

  ipcRegister<Authed & { id: number }>('get_sales_lead', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return SalesService.getLead(db, user, args.id);
    });
  });

  ipcRegister<Cmd<CreateLeadRequest>>('create_sales_lead', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return SalesService.create(db, user, payload(args));
    });
  });

  ipcRegister<Cmd<UpdateLeadRequest>>('update_sales_lead', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return SalesService.update(db, user, payload(args));
    });
  });

  ipcRegister<Authed & { id: number }>('delete_sales_lead', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return SalesService.delete(db, user, args.id);
    });
  });

  ipcRegister<Cmd<AddLeadNoteRequest>>('add_sales_lead_note', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return SalesService.addNote(db, user, payload(args));
    });
  });

  ipcRegister<Authed & { lead_id: number }>('get_lead_notes', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => {
      return SalesService.getNotes(db, args.lead_id);
    });
  });

  ipcRegister<Cmd<ConvertLeadRequest>>('convert_sales_lead', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return SalesService.convertToProject(db, user, payload(args));
    });
  });

  ipcRegister<Authed & { lead_id: number }>('list_lead_attachments', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return SalesService.listAttachments(db, user, args.lead_id);
    });
  });

  ipcRegister<Cmd<AddAttachmentRequest>>('add_lead_attachment', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      return SalesService.addAttachment(db, user, payload(args));
    });
  });

  ipcRegister<Authed & { id: number }>('delete_lead_attachment', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      SalesService.deleteAttachment(db, user, args.id);
      return { ok: true };
    });
  });
}
