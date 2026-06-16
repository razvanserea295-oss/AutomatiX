












import type { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';


let app: any = undefined;
try {
  const _e = require('electron');
  if (_e && typeof _e === 'object') { app = _e.app; }
} catch {  }

function dataDir(): string {
  const base = app && typeof app.getPath === 'function'
    ? path.join(app.getPath('userData'), 'data')
    : path.join(process.cwd(), 'data');
  return base;
}

export function exportsRoot(): string {
  return path.join(dataDir(), 'exports');
}

function twoDigit(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}


function timestampSlug(d: Date): string {
  return (
    `${d.getFullYear()}${twoDigit(d.getMonth() + 1)}${twoDigit(d.getDate())}` +
    `-${twoDigit(d.getHours())}${twoDigit(d.getMinutes())}${twoDigit(d.getSeconds())}`
  );
}

export interface ArchiveInput {
  docType: string;            
  docId: number;
  docNumber?: string | null;
  status?: string | null;
  buffer: Buffer;
  userId?: number | null;
}

export interface ArchiveResult {
  filePath: string;
  filename: string;
}





export function archiveExport(db: Database, input: ArchiveInput): ArchiveResult | null {
  try {
    const now = new Date();
    const dir = path.join(exportsRoot(), String(now.getFullYear()), twoDigit(now.getMonth() + 1));
    fs.mkdirSync(dir, { recursive: true });

    const safeType = input.docType.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'document';
    const filename = `${safeType}_${input.docId}_${timestampSlug(now)}.pdf`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, input.buffer);

    try {
      db.run(
        `INSERT INTO document_exports
           (doc_type, doc_id, doc_number, filename, file_path, status, exported_by, exported_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          safeType,
          input.docId,
          input.docNumber ?? null,
          filename,
          filePath,
          input.status ?? null,
          input.userId ?? null,
        ],
      );
    } catch (e) {
      console.warn('[exportArchive] could not record document_exports row:', e);
    }

    return { filePath, filename };
  } catch (e) {
    console.warn('[exportArchive] could not archive PDF copy:', e);
    return null;
  }
}


export function listExportsFor(db: Database, docType: string, docId: number): Array<Record<string, unknown>> {
  const stmt = db.prepare(
    `SELECT id, doc_type, doc_id, doc_number, filename, file_path, status, exported_by, exported_at
     FROM document_exports WHERE doc_type = ? AND doc_id = ? ORDER BY exported_at DESC LIMIT 50`,
  );
  stmt.bind([docType.toLowerCase(), docId]);
  const rows: Array<Record<string, unknown>> = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
