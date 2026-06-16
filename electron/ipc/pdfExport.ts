import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { DocumentExportService } from '../services/documentExportService';
import { listExportsFor } from '../services/exportArchive';
import { type Authed } from '../commands/cmdArgs';











export function registerPdfExportHandlers(): void {
  ipcRegister<Authed & { type: string; id: number }>('export_document_pdf', async (args) =>
    withAuthenticatedUser(args.token, (db, user) =>
      DocumentExportService.exportDocument(db, user, args.type, args.id),
    ),
  );

  ipcRegister<Authed & { type: string; id: number }>('list_document_exports', async (args) =>
    withAuthenticatedUser(args.token, (db) => listExportsFor(db, args.type, args.id)),
  );
}
