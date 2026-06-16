import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import Popover from './Popover';
import Button from '@/components/ui/Button';

export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  get?: (row: T) => string | number;
}

interface ExportMenuProps<T> {
  rows: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  
  title?: string;
}

function escapeCsv(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map(c => escapeCsv(c.label)).join(',');
  const body = rows.map(r =>
    columns.map(c => {
      const v = c.get ? c.get(r) : (r as Record<string, unknown>)[c.key as string];
      return escapeCsv(v);
    }).join(',')
  );
  return [header, ...body].join('\n');
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printRows<T>(rows: T[], columns: ExportColumn<T>[], title?: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  const head = `<style>
    body{font-family:system-ui,sans-serif;font-size:12px;color:#111827;padding:24px;}
    h1{font-size:16px;margin:0 0 12px;}
    table{width:100%;border-collapse:collapse;}
    th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left;}
    th{background:#f3f4f6;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:0.04em;}
    tr:nth-child(even) td{background:#fafafa;}
  </style>`;
  const heading = title ? `<h1>${title}</h1>` : '';
  const tHead = `<tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr>`;
  const tBody = rows.map(r =>
    `<tr>${columns.map(c => {
      const v = c.get ? c.get(r) : (r as Record<string, unknown>)[c.key as string];
      return `<td>${v == null ? '' : String(v)}</td>`;
    }).join('')}</tr>`
  ).join('');
  w.document.write(`<html><head><title>${title || 'Export'}</title>${head}</head><body>${heading}<table>${tHead}${tBody}</table></body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 200);
}

export default function ExportMenu<T>({ rows, columns, filename = 'export', title }: ExportMenuProps<T>) {
  const baseName = filename.replace(/\.[^.]+$/, '');
  return (
    <Popover
      width={200}
      trigger={
        <Button variant="ghost" size="sm" type="button" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      }
    >
      {(close) => (
        <div className="py-1 text-pm-base">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-tertiary text-content-secondary"
            onClick={() => { downloadBlob(buildCsv(rows, columns), 'text/csv;charset=utf-8', `${baseName}.csv`); close(); }}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-tertiary text-content-secondary"
            onClick={() => { downloadBlob(buildCsv(rows, columns), 'application/vnd.ms-excel', `${baseName}.xls`); close(); }}
          >
            <FileText className="h-3.5 w-3.5" /> Excel (.xls)
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-tertiary text-content-secondary"
            onClick={() => { printRows(rows, columns, title); close(); }}
          >
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </button>
        </div>
      )}
    </Popover>
  );
}
