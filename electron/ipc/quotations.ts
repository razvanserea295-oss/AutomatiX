import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import {
  QuotationService,
  type CreateQuotationRequest,
  type UpdateQuotationRequest,
  type SendQuotationRequest,
  type DecideQuotationRequest,
} from '../services/quotationService';
import { generateQuotationPdf } from '../services/quotationPdf';
import { type Authed, type Cmd, payload } from '../commands/cmdArgs';

export function registerQuotationHandlers(): void {
  ipcRegister<Authed & { lead_id?: number | null }>('list_quotations', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      QuotationService.list(db, user, args?.lead_id ?? null),
    ),
  );

  ipcRegister<Authed & { quotation_id: number }>('get_quotation', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      QuotationService.get(db, user, args.quotation_id),
    ),
  );

  ipcRegister<Cmd<CreateQuotationRequest>>('create_quotation', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      QuotationService.create(db, user, payload(args)),
    ),
  );

  ipcRegister<Cmd<UpdateQuotationRequest>>('update_quotation', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      QuotationService.update(db, user, payload(args)),
    ),
  );

  ipcRegister<Authed & { quotation_id: number }>('delete_quotation', async (args) =>
    withAuthenticatedUser(args.token, (db, user) => {
      QuotationService.delete(db, user, args.quotation_id);
      return { ok: true };
    }),
  );

  ipcRegister<Cmd<SendQuotationRequest>>('send_quotation', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      QuotationService.send(db, user, payload(args)),
    ),
  );

  ipcRegister<Cmd<DecideQuotationRequest>>('decide_quotation', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      QuotationService.decide(db, user, payload(args)),
    ),
  );

  ipcRegister<Authed & { quotation_id: number; project_id: number }>('convert_quotation_to_contract', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      QuotationService.convertToContract(db, user, args.quotation_id, args.project_id),
    ),
  );

  ipcRegister<Authed>('get_quotation_stats', async (args) =>
    withAuthenticatedUser(args.token, (db, _user) => QuotationService.getStats(db)),
  );

  ipcRegister<Authed & { quotation_id: number }>('mark_quotation_viewed', async (args) =>
    withAuthenticatedUser(args.token, (db, _user) => {
      QuotationService.markViewed(db, args.quotation_id);
      return { ok: true };
    }),
  );

  ipcRegister<Authed & { quotation_id: number }>('generate_pdf_quotation', async (args) =>
    withAuthenticatedUser(args.token, async (db, user) => {
      const q = QuotationService.get(db, user, args.quotation_id);
      return generateQuotationPdf(db, q, user.full_name || user.username);
    }),
  );

  
  ipcRegister<Authed & { quotation_id: number }>('list_quotation_attachments', async (args) =>
    withAuthenticatedUser(args.token, (db, _user) => QuotationService.listAttachments(db, args.quotation_id)),
  );

  ipcRegister<Cmd<{ quotation_id: number; filename?: string | null; mime?: string | null; data: string }>>('add_quotation_attachment', async (args) =>
    withAuthenticatedUser(args.token, (db, user) => QuotationService.addAttachment(db, user, payload(args))),
  );

  ipcRegister<Authed & { id: number }>('get_quotation_attachment', async (args) =>
    withAuthenticatedUser(args.token, (db, _user) => QuotationService.getAttachment(db, args.id)),
  );

  ipcRegister<Authed & { id: number }>('delete_quotation_attachment', async (args) =>
    withAuthenticatedUser(args.token, (db, _user) => {
      QuotationService.deleteAttachment(db, args.id);
      return { ok: true };
    }),
  );
}
