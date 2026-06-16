




























import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthService } from '../electron/services/authService';
import { ProjectBriefingService } from '../electron/services/projectBriefingService';
import { getDb, saveDatabase } from './db';

const MAX_FILE_BYTES   = 500 * 1024 * 1024; 
const INLINE_THRESHOLD = 5 * 1024 * 1024;   
const STALE_MS = 24 * 60 * 60 * 1000;

function filesBase(): string {
  return path.join(process.cwd(), 'data', 'briefing-files');
}
function stagingBase(): string {
  return path.join(filesBase(), '.staging');
}


function safeName(name: string): string {
  const base = (name || '').replace(/\\/g, '/').split('/').pop() || 'fisier';
  const clean = base.replace(/[\\/:*?"<>|]/g, '_').replace(/^\.+/, '').trim();
  return clean.slice(0, 180) || 'fisier';
}

function decodeB64Header(v: unknown): string | null {
  const s = String(v || '').trim();
  if (!s) return null;
  try { return Buffer.from(s, 'base64').toString('utf8'); } catch { return null; }
}

function authUser(req: Request) {
  const header = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const queryToken = (req.query.token as string) || '';
  const token = header || queryToken;
  if (!token) return null;
  if (!header && queryToken) {
    console.warn('[briefing-upload] DEPRECATED: auth via ?token= query string — prefer Authorization header (URL tokens leak into logs).');
  }
  try { return AuthService.validateSession(getDb(), token) || null; } catch { return null; }
}

function reapStaleStaging(): void {
  try {
    const base = stagingBase();
    if (!fs.existsSync(base)) return;
    const now = Date.now();
    for (const name of fs.readdirSync(base)) {
      const dir = path.join(base, name);
      try {
        const st = fs.statSync(dir);
        if (st.isDirectory() && now - st.mtimeMs > STALE_MS) fs.rmSync(dir, { recursive: true, force: true });
      } catch {  }
    }
  } catch {  }
}

async function assembleChunks(sessionDir: string, total: number, finalPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const out = fs.createWriteStream(finalPath);
    out.on('error', reject);
    out.on('finish', resolve);
    let i = 0;
    const next = () => {
      if (i >= total) { out.end(); return; }
      const chunkPath = path.join(sessionDir, `${i}.bin`);
      if (!fs.existsSync(chunkPath)) { out.destroy(new Error(`missing chunk ${i}`)); return; }
      const rs = fs.createReadStream(chunkPath);
      rs.on('error', (e) => out.destroy(e));
      rs.on('end', () => { i++; next(); });
      rs.pipe(out, { end: false });
    };
    next();
  });
}

export function registerBriefingUpload(app: Express): void {
  fs.mkdirSync(stagingBase(), { recursive: true });

  
  app.post('/api/briefing/:briefingId/upload-chunk', async (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }

    const briefingId = Number(req.params.briefingId);
    if (!briefingId || Number.isNaN(briefingId)) { res.status(400).json({ message: 'invalid briefing id' }); return; }

    const session = String(req.headers['x-upload-session'] || '').trim();
    const chunkIndex = Number(req.headers['x-chunk-index']);
    const chunkTotal = Number(req.headers['x-chunk-total']);
    const fileSize = Number(req.headers['x-file-size']);

    if (!/^[A-Za-z0-9_-]{8,64}$/.test(session)) { res.status(400).json({ message: 'invalid session id' }); return; }
    if (!Number.isFinite(chunkIndex) || chunkIndex < 0) { res.status(400).json({ message: 'invalid chunk index' }); return; }
    if (!Number.isFinite(chunkTotal) || chunkTotal <= 0 || chunkTotal > 200_000) { res.status(400).json({ message: 'invalid chunk total' }); return; }
    if (chunkIndex >= chunkTotal) { res.status(400).json({ message: 'chunk index >= total' }); return; }
    if (Number.isFinite(fileSize) && fileSize > MAX_FILE_BYTES) {
      res.status(413).json({ message: 'Fișierul depășește 500 MB' });
      return;
    }

    const sessionDir = path.join(stagingBase(), session);
    fs.mkdirSync(sessionDir, { recursive: true });
    const chunkPath = path.join(sessionDir, `${chunkIndex}.bin`);

    
    
    try {
      await new Promise<void>((resolve, reject) => {
        const ws = fs.createWriteStream(chunkPath);
        req.on('error', reject);
        ws.on('error', reject);
        ws.on('finish', () => resolve());
        req.pipe(ws);
      });
    } catch (e) {
      console.error('[briefing-upload] chunk write failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: 'write failed' });
      return;
    }

    if (chunkIndex < chunkTotal - 1) { res.json({ ok: true, received: chunkIndex }); return; }

    
    const missing: number[] = [];
    for (let i = 0; i < chunkTotal; i++) {
      if (!fs.existsSync(path.join(sessionDir, `${i}.bin`))) missing.push(i);
    }
    if (missing.length > 0) { res.status(409).json({ message: 'incomplete upload', missing_chunks: missing }); return; }

    const filename = safeName(decodeB64Header(req.headers['x-file-name-b64']) || `briefing-${briefingId}`);
    const mime = decodeB64Header(req.headers['x-file-mime-b64']) || 'application/octet-stream';
    const note = decodeB64Header(req.headers['x-file-note-b64']);

    const tmpAssembled = path.join(sessionDir, '_assembled.bin');
    try {
      await assembleChunks(sessionDir, chunkTotal, tmpAssembled);
      const onDisk = fs.statSync(tmpAssembled).size;
      if (onDisk > MAX_FILE_BYTES) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        res.status(413).json({ message: 'Fișierul depășește 500 MB' });
        return;
      }

      let result: { id: number };
      if (onDisk <= INLINE_THRESHOLD) {
        
        const data = fs.readFileSync(tmpAssembled).toString('base64');
        result = ProjectBriefingService.addAttachment(getDb(), user, {
          briefing_id: briefingId, filename, mime, data, annotation: note,
        });
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } else {
        
        const destDir = path.join(filesBase(), String(briefingId));
        fs.mkdirSync(destDir, { recursive: true });
        const destPath = path.join(destDir, `${Date.now()}_${filename}`);
        fs.renameSync(tmpAssembled, destPath);
        fs.rmSync(sessionDir, { recursive: true, force: true });
        result = ProjectBriefingService.addDiskAttachment(getDb(), user, {
          briefing_id: briefingId, filename, mime, storage_path: destPath, size_bytes: onDisk, annotation: note,
        });
      }
      saveDatabase();
      reapStaleStaging();
      res.json({ ok: true, id: result.id });
    } catch (e: unknown) {
      try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {  }
      const code = (e && typeof e === 'object' && 'code' in e && Number.isInteger((e as any).code)) ? (e as any).code : 500;
      console.error('[briefing-upload] finalize failed:', e instanceof Error ? e.message : e);
      res.status(code >= 400 && code < 600 ? code : 500).json({ message: e instanceof Error ? e.message : 'finalize failed' });
    }
  });

  
  app.get('/api/briefing-attachment/:id/download', (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) { res.status(400).json({ message: 'invalid id' }); return; }

    let meta;
    try { meta = ProjectBriefingService.getAttachmentMeta(getDb(), id); }
    catch { res.status(404).json({ message: 'Fișier negăsit' }); return; }

    const dispName = safeName(meta.filename || `briefing-fisier-${id}`);
    res.setHeader('Content-Type', meta.mime || 'application/octet-stream');
    
    res.setHeader('Content-Disposition',
      `attachment; filename="${dispName.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(dispName)}`);

    if (meta.storage_path) {
      if (!fs.existsSync(meta.storage_path)) { res.status(410).json({ message: 'Fișier lipsă pe disc' }); return; }
      fs.createReadStream(meta.storage_path).on('error', () => { if (!res.headersSent) res.status(500).end(); }).pipe(res);
    } else if (meta.data) {
      res.end(Buffer.from(meta.data, 'base64'));
    } else {
      res.status(404).json({ message: 'Fișier gol' });
    }
  });
}
