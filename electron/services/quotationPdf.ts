






import type { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { FinanceService } from './financeService';
import type { Quotation } from './quotationService';
import { getBranding, logoNode, getEurRateForDate, dualCurrencyLine } from './pdfShared';

interface CompanySettings {
  company_name: string;
  cui: string;
  reg_com: string;
  address: string;
  city: string;
  county: string;
  bank_name: string;
  iban: string;
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
  const r = findFont('DejaVuSans.ttf');
  const b = findFont('DejaVuSans-Bold.ttf');
  const i = findFont('DejaVuSans-Oblique.ttf');
  const bi = findFont('DejaVuSans-BoldOblique.ttf');
  if (r && b) {
    pdfmake.addFonts({ DejaVu: { normal: r, bold: b, italics: i || r, bolditalics: bi || b } });
    fontsRegistered = true;
    return 'DejaVu';
  }
  // Windows fallback: register Arial under the 'DejaVu' family so diacritics
  // render and we never fall through to the unregistered 'Roboto' (which throws).
  const ar = findFont('arial.ttf');
  const arB = findFont('arialbd.ttf');
  if (ar && arB) {
    pdfmake.addFonts({ DejaVu: { normal: ar, bold: arB, italics: findFont('ariali.ttf') || ar, bolditalics: findFont('arialbi.ttf') || arB } });
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
    default_currency: raw.default_currency || 'RON',
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

export async function generateQuotationPdf(
  db: Database,
  q: Quotation,
  userName?: string,
): Promise<{ base64: string; filename: string; mime: 'application/pdf' }> {
  const company = getCompanySettings(db);
  const branding = getBranding(db);
  const eurRate = getEurRateForDate(db, q.created_at);
  const font = ensureFonts();
  const pdfmake = getPdfmake();
  const generatedBy = userName
    ? `Generat de ${userName} • ${formatDate(new Date().toISOString())}`
    : `Generat: ${formatDate(new Date().toISOString())}`;

  const tableBody: any[] = [
    [
      { text: '#', style: 'th', alignment: 'center' },
      { text: 'Descriere', style: 'th' },
      { text: 'UM', style: 'th', alignment: 'center' },
      { text: 'Cant.', style: 'th', alignment: 'right' },
      { text: 'Preț unit.', style: 'th', alignment: 'right' },
      { text: 'Disc. %', style: 'th', alignment: 'right' },
      { text: 'Total', style: 'th', alignment: 'right' },
    ],
    ...q.lines.map((line, idx) => [
      { text: String(idx + 1), style: 'td', alignment: 'center' },
      { text: line.description, style: 'td' },
      { text: line.unit, style: 'td', alignment: 'center' },
      { text: line.quantity.toString(), style: 'td', alignment: 'right' },
      { text: fmt(line.unit_price, q.currency), style: 'td', alignment: 'right' },
      { text: line.discount_percent ? `${line.discount_percent}%` : '—', style: 'td', alignment: 'right' },
      { text: fmt(line.total, q.currency), style: 'td', alignment: 'right' },
    ]),
  ];

  const dd = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { font, fontSize: 10, color: '#222' },
    styles: {
      companyName: { fontSize: 18, bold: true, color: '#0f172a' },
      docTitle: { fontSize: 22, bold: true, color: '#0f172a' },
      label: { fontSize: 8, bold: true, color: '#64748b' },
      value: { fontSize: 10, color: '#0f172a' },
      sectionTitle: { fontSize: 12, bold: true, color: '#0f172a', margin: [0, 12, 0, 6] },
      th: { fontSize: 9, bold: true, color: '#fff', fillColor: '#0f172a' },
      td: { fontSize: 9, color: '#222' },
      footer: { fontSize: 8, color: '#94a3b8' },
    },
    footer: (cp: number, pc: number) => ({
      columns: [
        { text: generatedBy, style: 'footer', alignment: 'left', margin: [40, 20, 0, 0] },
        { text: `Pagina ${cp} / ${pc}`, style: 'footer', alignment: 'right', margin: [0, 20, 40, 0] },
      ],
    }),
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: company.company_name, style: 'companyName' },
              {
                text: [
                  company.cui && `CUI: ${company.cui}`,
                  company.reg_com && `Reg. Com: ${company.reg_com}`,
                  [company.address, company.city, company.county].filter(Boolean).join(', '),
                ].filter(Boolean).join(' • '),
                fontSize: 8, color: '#64748b', margin: [0, 4, 0, 0],
              },
            ],
          },
          ...(logoNode(branding.logo_base64) ? [{ width: 'auto', stack: [logoNode(branding.logo_base64)], alignment: 'right' }] : []),
        ],
        margin: [0, 0, 0, 16],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'OFERTĂ COMERCIALĂ', style: 'docTitle' },
              { text: q.quotation_number, fontSize: 11, bold: true, color: '#475569', margin: [0, 4, 0, 0] },
              { text: q.title, fontSize: 11, color: '#0f172a', margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: 'auto',
            table: {
              body: [
                [{ text: 'Data:', style: 'label' }, { text: formatDate(q.created_at), style: 'value' }],
                [{ text: 'Valabilă până la:', style: 'label' }, { text: q.valid_until ? formatDate(q.valid_until) : '—', style: 'value' }],
                [{ text: 'Status:', style: 'label' }, { text: q.status.toUpperCase(), style: 'value' }],
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
              { text: 'OFERTANT', style: 'label', margin: [0, 12, 0, 4] },
              { text: company.company_name, bold: true, fontSize: 11 },
              { text: company.cui ? `CUI: ${company.cui}` : '', fontSize: 9 },
              { text: [company.address, company.city, company.county].filter(Boolean).join(', '), fontSize: 9 },
            ].filter((t: any) => t.text !== ''),
          },
          {
            width: '50%',
            stack: [
              { text: 'CLIENT', style: 'label', margin: [0, 12, 0, 4] },
              { text: q.client_name, bold: true, fontSize: 11 },
              { text: q.contact_email ? `Email: ${q.contact_email}` : '', fontSize: 9 },
            ].filter((t: any) => t.text !== ''),
          },
        ],
      },
      ...(q.description ? [
        { text: 'Descriere', style: 'sectionTitle' },
        { text: q.description, fontSize: 10, color: '#475569' },
      ] : []),
      {
        margin: [0, 16, 0, 0],
        table: {
          headerRows: 1,
          widths: [20, '*', 30, 35, 60, 40, 65],
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
                ...(q.discount_percent > 0 ? [
                  [{ text: `Discount global ${q.discount_percent}%`, style: 'label', alignment: 'right' }, { text: '', alignment: 'right' }],
                ] : []),
                [{ text: 'Subtotal:', style: 'label', alignment: 'right' }, { text: fmt(q.subtotal, q.currency), alignment: 'right', bold: true }],
                [{ text: `TVA ${(q.tva_rate * 100).toFixed(0)}%:`, style: 'label', alignment: 'right' }, { text: fmt(q.tva_amount, q.currency), alignment: 'right' }],
                [
                  { text: 'TOTAL:', fontSize: 11, bold: true, alignment: 'right', fillColor: '#0f172a', color: '#fff', margin: [6, 4, 6, 4] },
                  { text: fmt(q.total, q.currency), fontSize: 11, bold: true, alignment: 'right', fillColor: '#0f172a', color: '#fff', margin: [6, 4, 6, 4] },
                ],
              ],
            },
            layout: 'noBorders',
          },
        ],
      },
      {
        columns: [
          { width: '*', text: '' },
          { width: 'auto', text: dualCurrencyLine(q.total, q.currency, eurRate), style: 'footer', alignment: 'right', margin: [0, 4, 0, 0] },
        ],
      },
      ...(q.notes ? [
        { text: 'Observații', style: 'sectionTitle' },
        { text: q.notes, fontSize: 10, color: '#475569' },
      ] : []),
      {
        margin: [0, 32, 0, 0],
        columns: [
          { width: '*', stack: [{ text: 'Ofertant', style: 'label' }, { text: '_____________________', margin: [0, 28, 0, 0], fontSize: 9 }] },
          { width: '*', stack: [{ text: 'Acceptat de client', style: 'label' }, { text: '_____________________', margin: [0, 28, 0, 0], fontSize: 9 }] },
        ],
      },
    ],
  };

  const doc = pdfmake.createPdf(dd);
  const buf = await streamToBuffer(doc);
  return {
    base64: buf.toString('base64'),
    filename: `Oferta_${q.quotation_number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
    mime: 'application/pdf',
  };
}
