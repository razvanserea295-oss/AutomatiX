












import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthService } from '../electron/services/authService';
import { getDb, saveDatabase } from './db';

type Scope = 'user' | 'company' | 'global';
const SCOPES: Scope[] = ['user', 'company', 'global'];
const MAX_FILE_BYTES = 100 * 1024 * 1024;

function filesDir(): string {
  const dir = path.join(process.cwd(), 'data', 'shared-files');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function authUser(req: Request) {
  const header = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = header || (req.query.token as string) || '';
  if (!token) return null;
  try { return AuthService.validateSession(getDb(), token) || null; } catch { return null; }
}

function parseScope(raw: string): Scope | null {
  return (SCOPES as string[]).includes(raw) ? (raw as Scope) : null;
}

function ownerFor(scope: Scope, userId: number): number {
  return scope === 'user' ? userId : 0;
}

function decodeB64Header(v: unknown): string | null {
  const s = String(v || '').trim();
  if (!s) return null;
  try { return Buffer.from(s, 'base64').toString('utf8'); } catch { return null; }
}

function safeName(name: string): string {
  const base = (name || '').replace(/\\/g, '/').split('/').pop() || 'fisier';
  const clean = base.replace(/[\\/:*?"<>|]/g, '_').replace(/^\.+/, '').trim();
  return clean.slice(0, 180) || 'fisier';
}

interface FileRow {
  id: number; filename: string; mime: string | null; size: number;
  stored_name: string; uploaded_by: number | null; uploaded_at: string;
}

function getFileRow(scope: Scope, owner: number, id: number): FileRow | null {
  const stmt = getDb().prepare(
    'SELECT id, filename, mime, size, stored_name, uploaded_by, uploaded_at FROM shared_files WHERE id = ? AND scope = ? AND owner_id = ?',
  );
  stmt.bind([id, scope, owner]);
  let row: FileRow | null = null;
  if (stmt.step()) row = stmt.getAsObject() as unknown as FileRow;
  stmt.free();
  return row;
}

export function registerSharedFiles(app: Express): void {
  filesDir();

  app.post('/api/shared-files/:scope', (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }
    const scope = parseScope(String(req.params.scope));
    if (!scope) { res.status(400).json({ message: 'scope invalid' }); return; }

    const declared = Number(req.headers['x-file-size']);
    if (Number.isFinite(declared) && declared > MAX_FILE_BYTES) {
      res.status(413).json({ message: 'Fișierul depășește 100 MB' });
      return;
    }

    const filename = safeName(decodeB64Header(req.headers['x-file-name-b64']) || 'fisier');
    const mime = decodeB64Header(req.headers['x-file-mime-b64']) || 'application/octet-stream';
    const storedName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${filename}`;
    const destPath = path.join(filesDir(), storedName);

    const ws = fs.createWriteStream(destPath);
    let size = 0;
    let failed: { code: number; message: string } | null = null;

    req.on('data', (b: Buffer) => {
      size += b.length;
      if (size > MAX_FILE_BYTES) {
        failed = { code: 413, message: 'Fișierul depășește 100 MB' };
        req.destroy();
      }
    });
    req.pipe(ws);

    const cleanup = () => { try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch {  } };

    ws.on('error', () => {
      if (!failed) failed = { code: 500, message: 'write failed' };
      cleanup();
      if (!res.headersSent) res.status(failed.code).json({ message: failed.message });
    });
    req.on('error', () => {
      cleanup();
      const f = failed || { code: 400, message: 'upload întrerupt' };
      if (!res.headersSent) res.status(f.code).json({ message: f.message });
    });

    ws.on('finish', () => {
      if (failed) { cleanup(); if (!res.headersSent) res.status(failed.code).json({ message: failed.message }); return; }
      if (size === 0) { cleanup(); res.status(400).json({ message: 'Fișier gol' }); return; }
      const owner = ownerFor(scope, user.id);
      let id = 0;
      try {
        const db = getDb();
        db.run(
          `INSERT INTO shared_files (scope, owner_id, filename, mime, size, stored_name, uploaded_by, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [scope, owner, filename, mime, size, storedName, user.id],
        );
        const r = db.exec('SELECT last_insert_rowid() AS id');
        id = (r[0]?.values?.[0]?.[0] as number) || 0;
        saveDatabase();
      } catch (e) {
        cleanup();
        console.error('[shared-files] insert failed:', e instanceof Error ? e.message : e);
        res.status(500).json({ message: 'save failed' });
        return;
      }
      res.json({ id, filename, mime, size, scope, uploadedBy: user.id, uploadedAt: new Date().toISOString() });
    });
  });

  app.get('/api/shared-files/:scope', (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }
    const scope = parseScope(String(req.params.scope));
    if (!scope) { res.status(400).json({ message: 'scope invalid' }); return; }

    const owner = ownerFor(scope, user.id);
    const items: Array<Record<string, unknown>> = [];
    try {
      const stmt = getDb().prepare(
        'SELECT id, filename, mime, size, uploaded_by, uploaded_at FROM shared_files WHERE scope = ? AND owner_id = ? ORDER BY uploaded_at DESC',
      );
      stmt.bind([scope, owner]);
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        items.push({
          id: row.id, filename: row.filename, mime: row.mime, size: row.size,
          scope, uploadedBy: row.uploaded_by, uploadedAt: row.uploaded_at,
        });
      }
      stmt.free();
    } catch (e) {
      console.error('[shared-files] list failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: 'list failed' });
      return;
    }
    res.json(items);
  });

  app.get('/api/shared-files/:scope/:id/download', (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }
    const scope = parseScope(String(req.params.scope));
    if (!scope) { res.status(400).json({ message: 'scope invalid' }); return; }
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) { res.status(400).json({ message: 'invalid id' }); return; }

    const owner = ownerFor(scope, user.id);
    let row: FileRow | null;
    try { row = getFileRow(scope, owner, id); }
    catch { res.status(404).json({ message: 'Fișier negăsit' }); return; }
    if (!row) { res.status(404).json({ message: 'Fișier negăsit' }); return; }

    const abs = path.join(filesDir(), row.stored_name);
    if (!abs.startsWith(filesDir()) || !fs.existsSync(abs)) { res.status(410).json({ message: 'Fișier lipsă pe disc' }); return; }

    const dispName = safeName(row.filename || `fisier-${id}`);
    res.setHeader('Content-Type', row.mime || 'application/octet-stream');
    res.setHeader('Content-Length', String(row.size));
    res.setHeader('Content-Disposition',
      `attachment; filename="${dispName.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(dispName)}`);
    fs.createReadStream(abs).on('error', () => { if (!res.headersSent) res.status(500).end(); }).pipe(res);
  });

  app.delete('/api/shared-files/:scope/:id', (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }
    const scope = parseScope(String(req.params.scope));
    if (!scope) { res.status(400).json({ message: 'scope invalid' }); return; }
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) { res.status(400).json({ message: 'invalid id' }); return; }

    const owner = ownerFor(scope, user.id);
    try {
      const row = getFileRow(scope, owner, id);
      if (!row) { res.status(404).json({ message: 'Fișier negăsit' }); return; }
      const abs = path.join(filesDir(), row.stored_name);
      if (abs.startsWith(filesDir())) { try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch {  } }
      getDb().run('DELETE FROM shared_files WHERE id = ? AND scope = ? AND owner_id = ?', [id, scope, owner]);
      saveDatabase();
    } catch (e) {
      console.error('[shared-files] delete failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: 'delete failed' });
      return;
    }
    res.json({ ok: true });
  });
}
