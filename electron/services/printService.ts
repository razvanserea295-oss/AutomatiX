// printService — remote printing. A user uploads a file (base64); the server
// normalizes it to a PDF and prints it silently on an admin-approved printer
// installed on this Windows machine, via pdf-to-printer (bundled SumatraPDF,
// invoked with an argument array — never a shell string). Every successful job
// is audited in print_jobs; temp files are always deleted.
import type { Database } from 'sql.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { CommandError } from '../middleware/errors';
import { logAuditEvent } from '../db/auditLogs';
import { getAppSetting, setAppSetting } from './setupService';
import { renderRawPdf } from './pdfService';
import type { UserWithRole } from './authService';

// ── app_settings keys ───────────────────────────────────────────────────────
const KEY_ENABLED = 'print_enabled';          // '1' | '0'  (unset → ON)
const KEY_ALLOWED = 'print_allowed_printers'; // JSON string[] (empty → none approved)

// ── Upload guard ────────────────────────────────────────────────────────────
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
// Accepted extensions → the family we know how to turn into a PDF.
const ALLOWED: Record<string, 'pdf' | 'text' | 'image'> = {
  pdf: 'pdf',
  txt: 'text', text: 'text', log: 'text', csv: 'text', md: 'text',
  png: 'image', jpg: 'image', jpeg: 'image',
};

export interface PrinterInfo { name: string; isDefault: boolean }
export interface PrintJobRow {
  id: number; printer_name: string; filename: string; mime: string;
  size_bytes: number; copies: number; status: string; error: string | null; created_at: string;
}
interface PrintFileArgs {
  filename?: string; mime?: string; data?: string; // base64 (no data: prefix)
  printer?: string; copies?: number; pages?: string;
}

const isWindows = process.platform === 'win32';

// Lazy require — pdf-to-printer is a Windows-only native helper; keep it out of
// module load so non-Windows instances (e.g. the Linux demo) still boot.
function p2p(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('pdf-to-printer');
}

function extOf(filename: string): string {
  const m = /\.([a-z0-9]+)$/i.exec((filename || '').trim());
  return m ? m[1].toLowerCase() : '';
}

async function listInstalled(): Promise<PrinterInfo[]> {
  if (!isWindows) return [];
  const mod = p2p();
  const printers = await mod.getPrinters();
  let defName = '';
  try { const d = await mod.getDefaultPrinter(); defName = d?.name || ''; } catch { /* no default */ }
  const seen = new Set<string>();
  const out: PrinterInfo[] = [];
  for (const pr of printers || []) {
    const name = String(pr?.name || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, isDefault: name === defName });
  }
  return out;
}

function readAllowed(db: Database): string[] {
  const raw = getAppSetting(db, KEY_ALLOWED);
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

function printingEnabled(db: Database): boolean {
  const raw = getAppSetting(db, KEY_ENABLED);
  return raw === null || raw === '' ? true : raw === '1'; // default ON
}

function insertJob(
  db: Database, userId: number, printer: string, filename: string,
  mime: string, size: number, copies: number, status: string, error: string | null,
): number {
  db.run(
    `INSERT INTO print_jobs (user_id, printer_name, filename, mime, size_bytes, copies, status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, printer, filename, mime, size, copies, status, error],
  );
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const id = Number(stmt.getAsObject().id);
  stmt.free();
  return id;
}

function safeUnlink(p: string): void {
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* best-effort */ }
}

export const PrintService = {
  // Printers a normal user may target: installed ∩ admin-approved.
  async listPrintablePrinters(db: Database): Promise<PrinterInfo[]> {
    if (!printingEnabled(db)) return [];
    const allowed = readAllowed(db);
    if (allowed.length === 0) return [];
    const allowSet = new Set(allowed);
    return (await listInstalled()).filter(p => allowSet.has(p.name));
  },

  // Admin view: every installed printer + its approved flag + the global toggle.
  async adminGetConfig(db: Database): Promise<{
    enabled: boolean; platformSupported: boolean;
    printers: { name: string; isDefault: boolean; allowed: boolean }[];
  }> {
    const installed = await listInstalled();
    const allowSet = new Set(readAllowed(db));
    return {
      enabled: printingEnabled(db),
      platformSupported: isWindows,
      printers: installed.map(p => ({ ...p, allowed: allowSet.has(p.name) })),
    };
  },

  adminSetConfig(db: Database, user: UserWithRole, args: { enabled?: boolean; allowed?: string[] }): { ok: true } {
    if (typeof args?.enabled === 'boolean') setAppSetting(db, KEY_ENABLED, args.enabled ? '1' : '0');
    if (Array.isArray(args?.allowed)) {
      const clean = [...new Set(args.allowed.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()))];
      setAppSetting(db, KEY_ALLOWED, JSON.stringify(clean));
    }
    logAuditEvent(db, user.id, 'PRINT_CONFIG_UPDATE', 'print_jobs', null,
      `enabled=${args?.enabled} allowed=${Array.isArray(args?.allowed) ? args.allowed.length : 'unchanged'}`);
    return { ok: true };
  },

  listJobs(db: Database, user: UserWithRole, limit = 25): PrintJobRow[] {
    const isAdmin = user.role_name === 'admin';
    const lim = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const cols = 'id, printer_name, filename, mime, size_bytes, copies, status, error, created_at';
    const stmt = db.prepare(
      isAdmin
        ? `SELECT ${cols} FROM print_jobs ORDER BY id DESC LIMIT ?`
        : `SELECT ${cols} FROM print_jobs WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    );
    stmt.bind(isAdmin ? [lim] : [user.id, lim]);
    const rows: PrintJobRow[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as PrintJobRow);
    stmt.free();
    return rows;
  },

  async printFile(db: Database, user: UserWithRole, args: PrintFileArgs): Promise<{ job_id: number; status: string }> {
    // 1 — permission
    if ((user.role_name || '').toLowerCase() === 'viewer') {
      throw CommandError.forbidden('Rolul „viewer" nu poate imprima');
    }
    if (!isWindows) throw CommandError.badRequest('Imprimarea este disponibilă doar pe serverul Windows');
    if (!printingEnabled(db)) throw CommandError.forbidden('Imprimarea este dezactivată de administrator');

    // 2 — validate file (allowlist + size) before decoding
    const filename = (String(args?.filename || '').trim() || 'document').slice(0, 200);
    const ext = extOf(filename);
    const kind = ALLOWED[ext];
    if (!kind) throw CommandError.badRequest(`Tip de fișier nepermis: .${ext || '?'} (acceptate: PDF, text, imagini)`);
    const b64 = String(args?.data || '');
    if (!b64) throw CommandError.badRequest('Fișier lipsă');
    if (Math.floor(b64.length * 3 / 4) > MAX_BYTES) throw CommandError.badRequest('Fișier prea mare (max 25 MB)');
    let buf: Buffer;
    try { buf = Buffer.from(b64, 'base64'); } catch { throw CommandError.badRequest('Conținut base64 invalid'); }
    if (buf.length === 0 || buf.length > MAX_BYTES) throw CommandError.badRequest('Fișier gol sau prea mare');

    const copies = Math.min(Math.max(parseInt(String(args?.copies ?? 1), 10) || 1, 1), 50);
    const pages = typeof args?.pages === 'string' && /^[0-9,\- ]+$/.test(args.pages.trim())
      ? args.pages.trim() : undefined;

    // 3 — printer must be installed AND admin-approved (blocks injected names)
    const printer = String(args?.printer || '').trim();
    const printable = await this.listPrintablePrinters(db);
    if (!printer || !printable.some(p => p.name === printer)) {
      throw CommandError.badRequest('Imprimantă invalidă sau neaprobată');
    }

    // 4 — write a temp file with a server-generated name + validated extension
    const rand = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(os.tmpdir(), `print_${rand}.${ext}`);
    let pdfPath = inputPath;
    let generatedPdf = false;
    fs.writeFileSync(inputPath, buf);

    try {
      // 5 — normalize to PDF (pdf passes through; text/image rendered via pdfmake)
      if (kind === 'text') {
        const text = buf.toString('utf8');
        const pdf = await renderRawPdf({ content: [{ text, preserveLeadingSpaces: true, fontSize: 10, lineHeight: 1.25 }] });
        pdfPath = path.join(os.tmpdir(), `print_${rand}.pdf`);
        generatedPdf = true;
        fs.writeFileSync(pdfPath, pdf);
      } else if (kind === 'image') {
        const mime = args?.mime || (ext === 'png' ? 'image/png' : 'image/jpeg');
        const pdf = await renderRawPdf({
          pageMargins: [24, 24, 24, 24],
          content: [{ image: `data:${mime};base64,${buf.toString('base64')}`, fit: [547, 760], alignment: 'center' }],
        });
        pdfPath = path.join(os.tmpdir(), `print_${rand}.pdf`);
        generatedPdf = true;
        fs.writeFileSync(pdfPath, pdf);
      }

      // 6 — print (argument array via pdf-to-printer/SumatraPDF, no shell)
      await p2p().print(pdfPath, { printer, copies, silent: true, ...(pages ? { pages } : {}) });

      // 7 — audit success
      const jobId = insertJob(db, user.id, printer, filename, args?.mime || kind, buf.length, copies, 'done', null);
      logAuditEvent(db, user.id, 'PRINT_FILE', 'print_jobs', jobId, `printer=${printer} file=${filename} copies=${copies}`);
      return { job_id: jobId, status: 'done' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (err instanceof CommandError) throw err;
      throw CommandError.internal(`Imprimarea a eșuat: ${msg}`);
    } finally {
      safeUnlink(inputPath);
      if (generatedPdf && pdfPath !== inputPath) safeUnlink(pdfPath);
    }
  },
};
