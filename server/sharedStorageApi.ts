import type { Application, Request, Response } from 'express';
import { AuthService } from '../electron/services/authService';
import { SharedStoragePool, SharedFolders, type CreateSharedFileRequest } from '../electron/services/sharedStorageService';
import { CommandError } from '../electron/middleware/errors';
import { getDb } from './db';
import fs from 'fs';
import path from 'path';

const SHARED_FILES_DIR = path.join(process.cwd(), 'data', 'shared-files');

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getAuthUser(req: Request): { id: number; full_name: string } | null {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try { return AuthService.validateSession(getDb(), token) || null; } catch { return null; }
}

// folder_id / parent_id parsing: empty / 'null' / 'root' / missing → root level (null).
function parseFolderId(q: unknown): number | null {
  if (q == null || q === '' || q === 'null' || q === 'root') return null;
  const n = Number(q);
  return Number.isFinite(n) ? n : null;
}

function sendError(res: Response, e: unknown): void {
  if (e instanceof CommandError) { res.status(e.code).json({ message: e.message }); return; }
  res.status(500).json({ message: e instanceof Error ? e.message : 'Eroare server' });
}

export function registerSharedStorageApi(app: Application): void {
  // List all files
  app.get('/api/shared-files', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) { res.status(401).json({ message: 'Autentificare necesară' }); return; }

    const folderId = parseFolderId(req.query.folder_id);
    const files = SharedStoragePool.list(getDb(), folderId);
    res.json(files.map(f => ({
      ...f,
      data: undefined,
      storage_path: f.storage_path ?? undefined,
    })));
  });

  // Get a specific file
  app.get('/api/shared-files/:id', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) { res.status(401).json({ message: 'Autentificare necesară' }); return; }
    
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ message: 'ID invalid' }); return; }
    
    const file = SharedStoragePool.getById(getDb(), id);
    if (!file) { res.status(404).json({ message: 'Fișier negăsit' }); return; }
    
    res.json({
      ...file,
      data: file.data ?? undefined,
      storage_path: file.storage_path ?? undefined,
    });
  });

  // Upload a file
  app.post('/api/shared-files', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) { res.status(401).json({ message: 'Autentificare necesară' }); return; }
    
    const body = req.body || {};
    if (!body.filename || !body.mime_type || !Number.isFinite(body.size_bytes)) {
      res.status(400).json({ message: 'Date învalide' });
      return;
    }
    
    const fileReq: CreateSharedFileRequest = {
      filename: body.filename,
      mime_type: body.mime_type,
      size_bytes: body.size_bytes,
      storage_path: body.storage_path ?? null,
      data: body.data ?? null,
      description: body.description ?? null,
      folder_id: parseFolderId(body.folder_id),
    };

    const file = SharedStoragePool.create(getDb(), user.id, fileReq.filename, fileReq);
    res.json(file);
  });

  // Download a file
  app.get('/api/shared-files/:id/download', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) { res.status(401).json({ message: 'Autentificare necesară' }); return; }
    
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ message: 'ID invalid' }); return; }
    
    const file = SharedStoragePool.getById(getDb(), id);
    if (!file) { res.status(404).json({ message: 'Fișier negăsit' }); return; }
    
    const safeName = (name: string) => name.replace(/[^\w\-_.]/g, '_').slice(0, 180);
    
    if (file.storage_path && fs.existsSync(file.storage_path)) {
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName(file.filename)}"`);
      fs.createReadStream(file.storage_path).pipe(res);
    } else if (file.data) {
      const buffer = Buffer.from(file.data, 'base64');
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName(file.filename)}"`);
      res.send(buffer);
    } else {
      res.status(410).json({ message: 'Fișier lipsă' });
    }
  });

  // Delete a file
  app.delete('/api/shared-files/:id', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) { res.status(401).json({ message: 'Autentificare necesară' }); return; }
    
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ message: 'ID invalid' }); return; }
    
    SharedStoragePool.delete(getDb(), user.id, id);
    res.json({ ok: true });
  });

  // Upload endpoint for multipart/form-data
  app.post('/api/shared-files/upload', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) { res.status(401).json({ message: 'Autentificare necesară' }); return; }
    
    const { filename, mime_type, size_bytes, description } = req.body;
    if (!filename || !mime_type) {
      res.status(400).json({ message: 'Numele fișierului și tipul MIME sunt obligatorii' });
      return;
    }
    
    ensureDir(SHARED_FILES_DIR);
    
    const ext = filename.split('.').pop() || 'bin';
    const storedName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const storagePath = path.join(SHARED_FILES_DIR, storedName);
    
    if (req.body.file_data || req.body.data) {
      const data = req.body.file_data || req.body.data;
      if (typeof data === 'string' && data.startsWith('data:')) {
        const base64 = data.split(',')[1];
        fs.writeFileSync(storagePath, Buffer.from(base64, 'base64'));
      } else {
        fs.writeFileSync(storagePath, data);
      }
    }
    
    const file = SharedStoragePool.create(getDb(), user.id, filename, {
      filename,
      mime_type,
      size_bytes: size_bytes || 0,
      storage_path: storagePath,
      data: null,
      description: description ?? null,
    });

    res.json(file);
  });

  // ── Folders ────────────────────────────────────────────────────────────────
  // List sub-folders of a parent (parent_id query; absent = root level).
  app.get('/api/shared-folders', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) { res.status(401).json({ message: 'Autentificare necesară' }); return; }
    res.json(SharedFolders.list(getDb(), parseFolderId(req.query.parent_id)));
  });

  // Create a folder.
  app.post('/api/shared-folders', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) { res.status(401).json({ message: 'Autentificare necesară' }); return; }
    try {
      const body = req.body || {};
      const folder = SharedFolders.create(getDb(), user.id, String(body.name || ''), parseFolderId(body.parent_id));
      res.json(folder);
    } catch (e) { sendError(res, e); }
  });

  // Delete a folder (only when it is empty).
  app.delete('/api/shared-folders/:id', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) { res.status(401).json({ message: 'Autentificare necesară' }); return; }
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ message: 'ID invalid' }); return; }
    try {
      SharedFolders.delete(getDb(), user.id, id);
      res.json({ ok: true });
    } catch (e) { sendError(res, e); }
  });
}