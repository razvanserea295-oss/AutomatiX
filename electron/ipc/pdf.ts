import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { PdfService } from '../services/pdfService';

export function registerPdfHandlers(): void {
  ipcRegister('generate_pdf_invoice', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) =>
      PdfService.generateInvoicePdf(db, user, args.invoice_id),
    );
  });

  ipcRegister('generate_pdf_contract', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) =>
      PdfService.generateContractPdf(db, user, args.contract_id),
    );
  });

  ipcRegister('generate_pdf_offer', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) =>
      PdfService.generateOfferPdf(db, user, args.lead_id),
    );
  });
}
