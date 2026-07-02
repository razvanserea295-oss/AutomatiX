import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { getServerUrl } from '@/config/server';
import { STORAGE_KEYS, getStorage } from '@/config/localStorage';
import { saveBlobAfterUserGesture } from '@/lib/browserDownload';
import { isBrowserWebRuntime } from '@/lib/runtime';

export interface PdfPayload {
  base64: string;
  filename: string;
  mime: string;
}

function payloadToBlob(pdf: PdfPayload): Blob {
  const binary = atob(pdf.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: pdf.mime || 'application/pdf' });
}

function triggerDownload(pdf: PdfPayload): void {
  const url = URL.createObjectURL(payloadToBlob(pdf));
  const a = document.createElement('a');
  a.href = url;
  a.download = pdf.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}







export async function downloadDocumentPdf(
  type: 'invoice' | 'offer' | 'quotation' | 'contract',
  id: number,
): Promise<void> {
  try {
    if (isBrowserWebRuntime()) {
      await saveBlobAfterUserGesture(`${type}-${id}.pdf`, async () => {
        const pdf = await apiCommand<PdfPayload>('export_document_pdf', { type, id });
        return payloadToBlob(pdf);
      });
    } else {
      const pdf = await apiCommand<PdfPayload>('export_document_pdf', { type, id });
      triggerDownload(pdf);
    }
    toast.success('PDF descărcat');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Eroare la generarea PDF-ului');
  }
}

export async function downloadInvoicePdf(invoiceId: number): Promise<void> {
  return downloadDocumentPdf('invoice', invoiceId);
}

export async function downloadContractPdf(contractId: number): Promise<void> {
  return downloadDocumentPdf('contract', contractId);
}

interface ContractAttachmentMeta { id: number; filename: string | null; mime: string | null; }
interface ContractAttachmentFull { id: number; filename: string | null; mime: string | null; base64: string; }


export async function downloadOneContractAttachment(id: number): Promise<void> {
  try {
    const filename = `contract-file-${id}`;
    if (isBrowserWebRuntime()) {
      await saveBlobAfterUserGesture(filename, async () => {
        const f = await apiCommand<ContractAttachmentFull>('get_contract_attachment', { id });
        return payloadToBlob({
          base64: f.base64,
          filename: f.filename || filename,
          mime: f.mime || 'application/octet-stream',
        });
      });
    } else {
      const f = await apiCommand<ContractAttachmentFull>('get_contract_attachment', { id });
      triggerDownload({ base64: f.base64, filename: f.filename || filename, mime: f.mime || 'application/octet-stream' });
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Eroare la descărcarea fișierului');
  }
}










export function downloadOneBriefingAttachment(id: number): void {
  try {
    const base = getServerUrl();
    const token = getStorage(STORAGE_KEYS.TOKEN) || '';
    const url = `${base}/api/briefing-attachment/${id}/download?token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Eroare la descărcarea fișierului');
  }
}


export async function downloadOneQuotationAttachment(id: number): Promise<void> {
  try {
    const filename = `oferta-fisier-${id}`;
    if (isBrowserWebRuntime()) {
      await saveBlobAfterUserGesture(filename, async () => {
        const f = await apiCommand<ContractAttachmentFull>('get_quotation_attachment', { id });
        return payloadToBlob({
          base64: f.base64,
          filename: f.filename || filename,
          mime: f.mime || 'application/octet-stream',
        });
      });
    } else {
      const f = await apiCommand<ContractAttachmentFull>('get_quotation_attachment', { id });
      triggerDownload({ base64: f.base64, filename: f.filename || filename, mime: f.mime || 'application/octet-stream' });
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Eroare la descărcarea fișierului');
  }
}





export async function downloadContractAttachments(contractId: number): Promise<void> {
  try {
    const files = await apiCommand<ContractAttachmentMeta[]>('list_contract_attachments', { contract_id: contractId });
    if (!files || files.length === 0) {
      toast.error('Niciun fișier încărcat pentru acest contract');
      return;
    }
    for (const meta of files) {
      const fallbackName = `contract-${contractId}-${meta.id}`;
      if (isBrowserWebRuntime()) {
        await saveBlobAfterUserGesture(meta.filename || fallbackName, async () => {
          const f = await apiCommand<ContractAttachmentFull>('get_contract_attachment', { id: meta.id });
          return payloadToBlob({
            base64: f.base64,
            filename: f.filename || fallbackName,
            mime: f.mime || 'application/octet-stream',
          });
        });
      } else {
        const f = await apiCommand<ContractAttachmentFull>('get_contract_attachment', { id: meta.id });
        triggerDownload({ base64: f.base64, filename: f.filename || fallbackName, mime: f.mime || 'application/octet-stream' });
      }
    }
    toast.success(files.length > 1 ? `${files.length} fișiere descărcate` : 'Fișier descărcat');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Eroare la descărcare');
  }
}

export async function downloadOfferPdf(leadId: number): Promise<void> {
  return downloadDocumentPdf('offer', leadId);
}








export async function downloadOfferPdfFromQuotation(quotationId: number): Promise<void> {
  try {
    if (isBrowserWebRuntime()) {
      await saveBlobAfterUserGesture(`oferta-${quotationId}.pdf`, async () => {
        const pdf = await apiCommand<PdfPayload>('generate_pdf_quotation', { quotation_id: quotationId });
        return payloadToBlob(pdf);
      });
    } else {
      const pdf = await apiCommand<PdfPayload>('generate_pdf_quotation', { quotation_id: quotationId });
      triggerDownload(pdf);
    }
    toast.success('PDF descărcat');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Eroare la generarea PDF-ului');
  }
}
