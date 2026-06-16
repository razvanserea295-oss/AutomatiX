









import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { PdfService, type PdfResult } from './pdfService';
import { generateQuotationPdf } from './quotationPdf';
import { QuotationService } from './quotationService';
import { queryOne } from '../db/sqlHelpers';
import { archiveExport } from './exportArchive';
import type { UserWithRole } from './authService';

export type ExportableType = 'invoice' | 'offer' | 'quotation' | 'contract';

const VALID_TYPES: ExportableType[] = ['invoice', 'offer', 'quotation', 'contract'];

interface DocMeta { number: string | null; status: string | null }


function docMeta(db: Database, type: ExportableType, id: number): DocMeta {
  const fallback: DocMeta = { number: null, status: null };
  try {
    switch (type) {
      case 'invoice':
        return queryOne(db, 'SELECT invoice_number AS number, status FROM finance_invoices WHERE id = ?', [id],
          r => ({ number: (r.number as string) ?? null, status: (r.status as string) ?? null })) ?? fallback;
      case 'quotation':
        return queryOne(db, 'SELECT quotation_number AS number, status FROM quotations WHERE id = ?', [id],
          r => ({ number: (r.number as string) ?? null, status: (r.status as string) ?? null })) ?? fallback;
      case 'contract':
        return queryOne(db, 'SELECT contract_code AS number, status FROM contracts WHERE id = ?', [id],
          r => ({ number: (r.number as string) ?? null, status: (r.status as string) ?? null })) ?? fallback;
      case 'offer':
        return queryOne(db, 'SELECT status FROM sales_leads WHERE id = ?', [id],
          r => ({ number: `OFR-${String(id).padStart(5, '0')}`, status: (r.status as string) ?? null }))
          ?? { number: `OFR-${String(id).padStart(5, '0')}`, status: null };
    }
  } catch {
    
  }
  return fallback;
}

export const DocumentExportService = {
  


  async exportDocument(
    db: Database,
    user: UserWithRole,
    type: string,
    id: number,
  ): Promise<PdfResult> {
    const t = String(type || '').toLowerCase() as ExportableType;
    if (!VALID_TYPES.includes(t)) {
      throw CommandError.badRequest(`Tip document necunoscut: "${type}"`);
    }
    if (!Number.isInteger(id) || id <= 0) {
      throw CommandError.badRequest('id document invalid');
    }

    let result: PdfResult;
    switch (t) {
      case 'invoice':
        result = await PdfService.generateInvoicePdf(db, user, id);
        break;
      case 'contract':
        result = await PdfService.generateContractPdf(db, user, id);
        break;
      case 'offer':
        result = await PdfService.generateOfferPdf(db, user, id);
        break;
      case 'quotation': {
        const q = QuotationService.get(db, user, id);
        result = await generateQuotationPdf(db, q, user.full_name || user.username);
        break;
      }
    }

    const meta = docMeta(db, t, id);
    archiveExport(db, {
      docType: t,
      docId: id,
      docNumber: meta.number,
      status: meta.status,
      buffer: Buffer.from(result.base64, 'base64'),
      userId: user.id,
    });

    return result;
  },
};
