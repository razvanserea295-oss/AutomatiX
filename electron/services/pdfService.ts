









import type { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { CommandError } from '../middleware/errors';
import { FinanceService, type Invoice } from './financeService';
import { ContractService, type Contract } from './contractService';
import { SalesService, type SalesLead } from './salesService';
import type { UserWithRole } from './authService';
import { getBranding, logoNode, getEurRateForDate, dualCurrencyLine } from './pdfShared';





export interface PdfResult {
  base64: string;
  filename: string;
  mime: 'application/pdf';
}

interface CompanySettings {
  company_name: string;
  cui: string;
  reg_com: string;
  address: string;
  city: string;
  county: string;
  bank_name: string;
  iban: string;
  tva_rate: number;
  default_currency: string;
}





const FONT_CANDIDATES = [
  '/usr/share/fonts/TTF',
  '/usr/share/fonts/truetype/dejavu',
  '/usr/share/fonts/dejavu',
  // Windows: Arial ships with the OS and covers Romanian diacritics (ăâîșț).
  process.env.WINDIR ? path.join(process.env.WINDIR, 'Fonts') : 'C:\\Windows\\Fonts',
];

function findFont(filename: string): string | null {
  for (const dir of FONT_CANDIDATES) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

let pdfmakeInstance: any = null;
let fontsRegistered = false;

function getPdfmake(): any {
  if (pdfmakeInstance) return pdfmakeInstance;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  pdfmakeInstance = require('pdfmake');
  return pdfmakeInstance;
}

function ensureFonts(): string {
  const pdfmake = getPdfmake();
  if (fontsRegistered) return 'DejaVu';

  const dejaVuRegular = findFont('DejaVuSans.ttf');
  const dejaVuBold = findFont('DejaVuSans-Bold.ttf');
  const dejaVuItalic = findFont('DejaVuSans-Oblique.ttf');
  const dejaVuBoldItalic = findFont('DejaVuSans-BoldOblique.ttf');

  if (dejaVuRegular && dejaVuBold) {
    pdfmake.addFonts({
      DejaVu: {
        normal: dejaVuRegular,
        bold: dejaVuBold,
        italics: dejaVuItalic || dejaVuRegular,
        bolditalics: dejaVuBoldItalic || dejaVuBold,
      },
    });
    fontsRegistered = true;
    return 'DejaVu';
  }

  // Windows fallback: register Arial under the same 'DejaVu' family name so the
  // rest of the code (defaultStyle.font) is unchanged and diacritics render.
  // Without this, on Windows DejaVu isn't found and we'd return 'Roboto', which
  // is NOT registered server-side -> pdfmake throws "Roboto/bold not defined".
  const arial = findFont('arial.ttf');
  const arialBold = findFont('arialbd.ttf');
  if (arial && arialBold) {
    pdfmake.addFonts({
      DejaVu: {
        normal: arial,
        bold: arialBold,
        italics: findFont('ariali.ttf') || arial,
        bolditalics: findFont('arialbi.ttf') || arialBold,
      },
    });
    fontsRegistered = true;
    return 'DejaVu';
  }

  fontsRegistered = true;
  return 'Roboto';
}





function getCompanySettings(db: Database): CompanySettings {
  const raw = FinanceService.getCompanySettings(db);
  return {
    company_name: raw.company_name || 'Compania',
    cui: raw.cui || '',
    reg_com: raw.reg_com || '',
    address: raw.address || '',
    city: raw.city || '',
    county: raw.county || '',
    bank_name: raw.bank_name || '',
    iban: raw.iban || '',
    tva_rate: typeof raw.tva_rate === 'number' ? raw.tva_rate : 0.21,
    default_currency: raw.default_currency || 'RON',
  };
}

function getClientById(db: Database, id: number): {
  name: string; cui: string | null; address: string | null;
  email: string | null; phone: string | null;
} | null {
  const stmt = db.prepare('SELECT name, cui, address, email, phone FROM clients WHERE id = ?');
  stmt.bind([id]);
  let result: any = null;
  if (stmt.step()) result = stmt.getAsObject();
  stmt.free();
  if (!result) return null;
  return {
    name: result.name as string,
    cui: result.cui as string | null,
    address: result.address as string | null,
    email: result.email as string | null,
    phone: result.phone as string | null,
  };
}

function fmt(amount: number, currency = 'RON'): string {
  return `${(amount || 0).toFixed(2)} ${currency}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.split('T')[0] || iso;
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return iso;
  return `${day}.${m}.${y}`;
}

function buildCompanyHeader(company: CompanySettings, font: string, logoBase64?: string): any {
  const lines: string[] = [];
  if (company.cui) lines.push(`CUI: ${company.cui}`);
  if (company.reg_com) lines.push(`Reg. Com: ${company.reg_com}`);
  const addr = [company.address, company.city, company.county].filter(Boolean).join(', ');
  if (addr) lines.push(addr);
  if (company.bank_name) lines.push(`Banca: ${company.bank_name}`);
  if (company.iban) lines.push(`IBAN: ${company.iban}`);
  const logo = logoNode(logoBase64 || '');
  const columns: any[] = [
    {
      width: '*',
      stack: [
        { text: company.company_name || 'Compania', style: 'companyName' },
        { text: lines.join(' • '), style: 'companyMeta' },
      ],
    },
  ];
  if (logo) columns.push({ width: 'auto', stack: [logo], alignment: 'right' });
  return { columns, margin: [0, 0, 0, 16] };
}

async function streamToBuffer(doc: any): Promise<Buffer> {
  const stream = await doc.getStream();
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    stream.end();
  });
}

async function renderPdf(docDefinition: any, userName?: string): Promise<Buffer> {
  const font = ensureFonts();
  const pdfmake = getPdfmake();
  const generatedBy = userName ? `Generat de ${userName} • ${formatDate(new Date().toISOString())}` : `Generat: ${formatDate(new Date().toISOString())}`;
  const dd = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { font, fontSize: 10, color: '#222' },
    styles: {
      companyName: { fontSize: 18, bold: true, color: '#0f172a' },
      companyMeta: { fontSize: 8, color: '#64748b', margin: [0, 4, 0, 0] },
      docTitle: { fontSize: 22, bold: true, color: '#0f172a', margin: [0, 8, 0, 4] },
      sectionTitle: { fontSize: 12, bold: true, color: '#0f172a', margin: [0, 12, 0, 6] },
      label: { fontSize: 8, bold: true, color: '#64748b' },
      value: { fontSize: 10, color: '#0f172a' },
      tableHeader: { fontSize: 9, bold: true, color: '#fff', fillColor: '#0f172a' },
      tableCell: { fontSize: 9, color: '#222' },
      tableTotal: { fontSize: 11, bold: true, color: '#0f172a' },
      footer: { fontSize: 8, color: '#94a3b8' },
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: generatedBy, style: 'footer', alignment: 'left', margin: [40, 20, 0, 0] },
        { text: `Pagina ${currentPage} / ${pageCount}`, style: 'footer', alignment: 'right', margin: [0, 20, 40, 0] },
      ],
    }),
    ...docDefinition,
  };
  const doc = pdfmake.createPdf(dd);
  return streamToBuffer(doc);
}

// Render an arbitrary pdfmake document definition to a PDF buffer, reusing the
// already-registered fonts (DejaVu/Arial → Romanian diacritics). Unlike
// renderPdf() it adds NO company header/footer — used by the printing feature
// to turn plain text / images into a clean printable PDF.
export async function renderRawPdf(docDefinition: any): Promise<Buffer> {
  const font = ensureFonts();
  const pdfmake = getPdfmake();
  const dd = {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font, fontSize: 11, color: '#111' },
    ...docDefinition,
  };
  const doc = pdfmake.createPdf(dd);
  return streamToBuffer(doc);
}





export async function generateInvoicePdf(db: Database, user: UserWithRole, invoiceId: number): Promise<PdfResult> {
  const invoice = FinanceService.getInvoice(db, user, invoiceId);
  if (!invoice) throw CommandError.notFound('Factură negăsită');
  const company = getCompanySettings(db);
  const branding = getBranding(db);
  const eurRate = getEurRateForDate(db, invoice.issue_date);
  const client = getClientById(db, invoice.client_id);
  const font = ensureFonts();

  const tableBody: any[] = [
    [
      { text: '#', style: 'tableHeader', alignment: 'center' },
      { text: 'Descriere', style: 'tableHeader' },
      { text: 'UM', style: 'tableHeader', alignment: 'center' },
      { text: 'Cantitate', style: 'tableHeader', alignment: 'right' },
      { text: 'Preț unitar', style: 'tableHeader', alignment: 'right' },
      { text: 'Total', style: 'tableHeader', alignment: 'right' },
    ],
    ...invoice.lines.map((line, idx) => [
      { text: String(idx + 1), style: 'tableCell', alignment: 'center' },
      { text: line.description || '—', style: 'tableCell' },
      { text: line.unit || 'buc', style: 'tableCell', alignment: 'center' },
      { text: line.quantity.toString(), style: 'tableCell', alignment: 'right' },
      { text: fmt(line.unit_price, invoice.currency), style: 'tableCell', alignment: 'right' },
      { text: fmt(line.total, invoice.currency), style: 'tableCell', alignment: 'right' },
    ]),
  ];

  const docDefinition = {
    content: [
      buildCompanyHeader(company, font, branding.logo_base64),
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'FACTURĂ', style: 'docTitle' },
              { text: `Seria nr. ${invoice.invoice_number}`, fontSize: 11, bold: true, color: '#475569' },
            ],
          },
          {
            width: 'auto',
            table: {
              body: [
                [{ text: 'Data emiterii:', style: 'label' }, { text: formatDate(invoice.issue_date), style: 'value' }],
                [{ text: 'Data scadenței:', style: 'label' }, { text: formatDate(invoice.due_date), style: 'value' }],
                [{ text: 'Status:', style: 'label' }, { text: invoice.status.toUpperCase(), style: 'value' }],
              ],
            },
            layout: 'noBorders',
          },
        ],
      },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'FURNIZOR', style: 'label', margin: [0, 12, 0, 4] },
              { text: company.company_name, bold: true, fontSize: 11 },
              { text: company.cui ? `CUI: ${company.cui}` : '', fontSize: 9 },
              { text: company.reg_com ? `Reg. Com: ${company.reg_com}` : '', fontSize: 9 },
              { text: [company.address, company.city, company.county].filter(Boolean).join(', '), fontSize: 9 },
              { text: company.iban ? `IBAN: ${company.iban}` : '', fontSize: 9 },
            ].filter((t: any) => t.text !== ''),
          },
          {
            width: '50%',
            stack: [
              { text: 'CLIENT', style: 'label', margin: [0, 12, 0, 4] },
              { text: invoice.client_name, bold: true, fontSize: 11 },
              { text: client?.cui ? `CUI: ${client.cui}` : '', fontSize: 9 },
              { text: client?.address || '', fontSize: 9 },
              { text: client?.phone ? `Tel: ${client.phone}` : '', fontSize: 9 },
              { text: client?.email || '', fontSize: 9 },
              { text: invoice.project_name ? `Proiect: ${invoice.project_name}` : '', fontSize: 9, color: '#64748b' },
            ].filter((t: any) => t.text !== ''),
          },
        ],
      },
      {
        margin: [0, 16, 0, 0],
        table: {
          headerRows: 1,
          widths: [25, '*', 35, 50, 70, 70],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => rowIndex === 0 ? '#0f172a' : (rowIndex % 2 === 0 ? '#f8fafc' : null),
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0',
        },
      },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            margin: [0, 12, 0, 0],
            table: {
              body: [
                [{ text: 'Subtotal:', style: 'label', alignment: 'right' }, { text: fmt(invoice.subtotal, invoice.currency), alignment: 'right', bold: true }],
                [{ text: `TVA ${(invoice.tva_rate * 100).toFixed(0)}%:`, style: 'label', alignment: 'right' }, { text: fmt(invoice.tva_amount, invoice.currency), alignment: 'right' }],
                [{ text: 'TOTAL:', style: 'tableTotal', alignment: 'right', fillColor: '#0f172a', color: '#fff', margin: [6, 4, 6, 4] }, { text: fmt(invoice.total, invoice.currency), style: 'tableTotal', alignment: 'right', fillColor: '#0f172a', color: '#fff', margin: [6, 4, 6, 4] }],
                ...(invoice.paid_amount > 0 ? [
                  [{ text: 'Plătit:', style: 'label', alignment: 'right', color: '#10b981' }, { text: fmt(invoice.paid_amount, invoice.currency), alignment: 'right', color: '#10b981' }],
                  [{ text: 'De plată:', style: 'label', alignment: 'right', color: '#ef4444' }, { text: fmt(invoice.remaining, invoice.currency), alignment: 'right', color: '#ef4444', bold: true }],
                ] : []),
              ],
            },
            layout: 'noBorders',
          },
        ],
      },
      {
        columns: [
          { width: '*', text: '' },
          { width: 'auto', text: dualCurrencyLine(invoice.total, invoice.currency, eurRate), style: 'footer', alignment: 'right', margin: [0, 4, 0, 0] },
        ],
      },
      ...(invoice.notes ? [{
        margin: [0, 16, 0, 0],
        stack: [
          { text: 'Observații', style: 'label' },
          { text: invoice.notes, fontSize: 9, color: '#475569', margin: [0, 4, 0, 0] },
        ],
      }] : []),
      {
        margin: [0, 32, 0, 0],
        columns: [
          { width: '*', stack: [{ text: 'Furnizor', style: 'label' }, { text: '_____________________', margin: [0, 28, 0, 0], fontSize: 9 }] },
          { width: '*', stack: [{ text: 'Client', style: 'label' }, { text: '_____________________', margin: [0, 28, 0, 0], fontSize: 9 }] },
        ],
      },
    ],
  };

  const buf = await renderPdf(docDefinition, user.full_name || user.username);
  return {
    base64: buf.toString('base64'),
    filename: `Factura_${invoice.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
    mime: 'application/pdf',
  };
}





export async function generateContractPdf(db: Database, user: UserWithRole, contractId: number): Promise<PdfResult> {
  const contract = ContractService.getContract(db, contractId);
  if (!contract) throw CommandError.notFound('Contract negăsit');
  const company = getCompanySettings(db);
  const branding = getBranding(db);
  const eurRate = getEurRateForDate(db, contract.created_at);
  const client = getClientById(db, contract.client_id);
  const font = ensureFonts();

  const fixedFields: any[] = [
    contract.delivered_product ? ['Produs livrat', contract.delivered_product] : null,
    contract.sale_price > 0 ? ['Preț vânzare', fmt(contract.sale_price, company.default_currency)] : null,
    contract.execution_term ? ['Termen execuție', contract.execution_term] : null,
    contract.pif_term ? ['Termen PIF', contract.pif_term] : null,
    contract.site_location ? ['Locație șantier', contract.site_location] : null,
  ].filter(Boolean) as Array<[string, string]>;

  const docDefinition = {
    content: [
      buildCompanyHeader(company, font, branding.logo_base64),
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'CONTRACT', style: 'docTitle' },
              { text: `${contract.contract_code} • Rev. ${contract.revision}`, fontSize: 11, bold: true, color: '#475569' },
              { text: contract.title, fontSize: 11, color: '#0f172a', margin: [0, 4, 0, 0] },
            ],
          },
          {
            width: 'auto',
            table: {
              body: [
                [{ text: 'Data:', style: 'label' }, { text: formatDate(contract.created_at), style: 'value' }],
                [{ text: 'Status:', style: 'label' }, { text: contract.status.toUpperCase(), style: 'value' }],
              ],
            },
            layout: 'noBorders',
          },
        ],
      },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'PRESTATOR', style: 'label', margin: [0, 12, 0, 4] },
              { text: company.company_name, bold: true, fontSize: 11 },
              { text: company.cui ? `CUI: ${company.cui}` : '', fontSize: 9 },
              { text: company.reg_com ? `Reg. Com: ${company.reg_com}` : '', fontSize: 9 },
              { text: [company.address, company.city, company.county].filter(Boolean).join(', '), fontSize: 9 },
            ].filter((t: any) => t.text !== ''),
          },
          {
            width: '50%',
            stack: [
              { text: 'BENEFICIAR', style: 'label', margin: [0, 12, 0, 4] },
              { text: contract.client_name, bold: true, fontSize: 11 },
              { text: client?.cui ? `CUI: ${client.cui}` : '', fontSize: 9 },
              { text: client?.address || '', fontSize: 9 },
              { text: client?.phone ? `Tel: ${client.phone}` : '', fontSize: 9 },
              { text: contract.project_name ? `Proiect: ${contract.project_name}` : '', fontSize: 9, color: '#64748b' },
            ].filter((t: any) => t.text !== ''),
          },
        ],
      },
      ...(fixedFields.length > 0 ? [{
        margin: [0, 16, 0, 0],
        table: {
          widths: ['30%', '70%'],
          body: fixedFields.map(([label, value]) => [
            { text: label, style: 'label', margin: [4, 4, 4, 4] },
            { text: value, style: 'value', margin: [4, 4, 4, 4] },
          ]),
        },
        layout: {
          fillColor: (rowIndex: number) => rowIndex % 2 === 0 ? '#f8fafc' : null,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0',
        },
      }] : []),
      ...(contract.sale_price > 0 ? [{
        text: dualCurrencyLine(contract.sale_price, company.default_currency, eurRate),
        style: 'footer', margin: [0, 6, 0, 0],
      }] : []),
      ...contract.sections.map((section) => ({
        stack: [
          { text: section.title, style: 'sectionTitle' },
          { text: section.content || '—', fontSize: 10, color: section.content ? '#222' : '#94a3b8', italics: !section.content },
        ],
      })),
      ...(contract.observations ? [{
        margin: [0, 16, 0, 0],
        stack: [
          { text: 'Observații', style: 'sectionTitle' },
          { text: contract.observations, fontSize: 10, color: '#475569' },
        ],
      }] : []),
      {
        margin: [0, 40, 0, 0],
        columns: [
          { width: '*', stack: [{ text: 'PRESTATOR', style: 'label', alignment: 'center' }, { text: company.company_name, fontSize: 10, alignment: 'center', margin: [0, 4, 0, 28] }, { text: '_____________________', alignment: 'center', fontSize: 9 }] },
          { width: '*', stack: [{ text: 'BENEFICIAR', style: 'label', alignment: 'center' }, { text: contract.client_name, fontSize: 10, alignment: 'center', margin: [0, 4, 0, 28] }, { text: '_____________________', alignment: 'center', fontSize: 9 }] },
        ],
      },
    ],
  };

  const buf = await renderPdf(docDefinition, user.full_name || user.username);
  return {
    base64: buf.toString('base64'),
    filename: `Contract_${contract.contract_code.replace(/[^a-zA-Z0-9_-]/g, '_')}_rev${contract.revision}.pdf`,
    mime: 'application/pdf',
  };
}





export async function generateOfferPdf(db: Database, user: UserWithRole, leadId: number): Promise<PdfResult> {
  const lead = SalesService.getLead(db, user, leadId);
  if (!lead) throw CommandError.notFound('Lead/ofertă negăsită');
  const company = getCompanySettings(db);
  const branding = getBranding(db);
  const eurRate = getEurRateForDate(db, new Date().toISOString());
  const font = ensureFonts();

  const docDefinition = {
    content: [
      buildCompanyHeader(company, font, branding.logo_base64),
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'OFERTĂ COMERCIALĂ', style: 'docTitle' },
              { text: `Nr. OFR-${String(lead.id).padStart(5, '0')}`, fontSize: 11, bold: true, color: '#475569' },
            ],
          },
          {
            width: 'auto',
            table: {
              body: [
                [{ text: 'Data emiterii:', style: 'label' }, { text: formatDate(new Date().toISOString()), style: 'value' }],
                [{ text: 'Valabilitate:', style: 'label' }, { text: '30 zile', style: 'value' }],
                [{ text: 'Status:', style: 'label' }, { text: lead.status.toUpperCase(), style: 'value' }],
              ],
            },
            layout: 'noBorders',
          },
        ],
      },
      {
        margin: [0, 16, 0, 0],
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'OFERTANT', style: 'label', margin: [0, 0, 0, 4] },
              { text: company.company_name, bold: true, fontSize: 11 },
              { text: company.cui ? `CUI: ${company.cui}` : '', fontSize: 9 },
              { text: [company.address, company.city, company.county].filter(Boolean).join(', '), fontSize: 9 },
            ].filter((t: any) => t.text !== ''),
          },
          {
            width: '50%',
            stack: [
              { text: 'CLIENT', style: 'label', margin: [0, 0, 0, 4] },
              { text: lead.client_name, bold: true, fontSize: 11 },
              { text: lead.contact_person ? `Persoană contact: ${lead.contact_person}` : '', fontSize: 9 },
              { text: lead.contact_email ? `Email: ${lead.contact_email}` : '', fontSize: 9 },
              { text: lead.contact_phone ? `Tel: ${lead.contact_phone}` : '', fontSize: 9 },
              { text: lead.location ? `Locație: ${lead.location}` : '', fontSize: 9 },
            ].filter((t: any) => t.text !== ''),
          },
        ],
      },
      { text: 'Obiect ofertă', style: 'sectionTitle' },
      { text: lead.product_interest || '—', fontSize: 10 },
      ...(lead.notes ? [
        { text: 'Detalii', style: 'sectionTitle' },
        { text: lead.notes, fontSize: 10, color: '#475569' },
      ] : []),
      {
        margin: [0, 24, 0, 0],
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'Valoare estimată ofertă', fontSize: 11, bold: true, fillColor: '#0f172a', color: '#fff', margin: [8, 8, 8, 8] },
              { text: fmt(lead.estimated_value, company.default_currency), fontSize: 14, bold: true, fillColor: '#0f172a', color: '#fff', margin: [8, 8, 8, 8], alignment: 'right' },
            ],
          ],
        },
        layout: 'noBorders',
      },
      {
        text: dualCurrencyLine(lead.estimated_value, company.default_currency, eurRate),
        style: 'footer', alignment: 'right', margin: [0, 6, 0, 0],
      },
      {
        margin: [0, 16, 0, 0],
        text: 'Notă: această ofertă este orientativă și poate fi detaliată cu poziții individuale (line items) într-o versiune extinsă a sistemului.',
        fontSize: 8,
        color: '#94a3b8',
        italics: true,
      },
      {
        margin: [0, 32, 0, 0],
        columns: [
          { width: '*', stack: [{ text: 'Ofertant', style: 'label' }, { text: '_____________________', margin: [0, 28, 0, 0], fontSize: 9 }] },
          { width: '*', stack: [{ text: 'Client', style: 'label' }, { text: '_____________________', margin: [0, 28, 0, 0], fontSize: 9 }] },
        ],
      },
    ],
  };

  const buf = await renderPdf(docDefinition, user.full_name || user.username);
  return {
    base64: buf.toString('base64'),
    filename: `Oferta_OFR-${String(lead.id).padStart(5, '0')}.pdf`,
    mime: 'application/pdf',
  };
}





export const PdfService = {
  generateInvoicePdf,
  generateContractPdf,
  generateOfferPdf,
};
