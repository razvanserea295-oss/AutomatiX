





































import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthService } from '../electron/services/authService';
import { getDb } from './db';

const UPLOAD_BASE = path.join(process.cwd(), 'data', 'uploads', 'parts-tree');
const STAGING_BASE = path.join(UPLOAD_BASE, '.staging');
const STALE_MS = 24 * 60 * 60 * 1000;


function ensureDirs(): void {
  fs.mkdirSync(UPLOAD_BASE, { recursive: true });
  fs.mkdirSync(STAGING_BASE, { recursive: true });
}






function safeRelPath(rel: string): string {
  const segments = rel.replace(/\\/g, '/').split('/').filter(Boolean);
  const clean: string[] = [];
  for (const seg of segments) {
    if (seg === '..' || seg === '.') continue;
    clean.push(seg.replace(/[\\/:*?"<>|]/g, '_'));
  }
  if (clean.length === 0) return 'untitled';
  return clean.join('/');
}







function authUser(req: Request): { id: number; username: string } | null {
  const header = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const queryToken = (req.query.token as string) || '';
  
  
  
  const token = header || queryToken;
  if (!token) return null;
  if (!header && queryToken) {
    console.warn('[parts-tree-upload] DEPRECATED: auth via ?token= query string — switch to "Authorization: Bearer <token>" (URL tokens leak into logs/Referer).');
  }
  try {
    const u = AuthService.validateSession(getDb(), token);
    if (!u) return null;
    return { id: u.id, username: u.username };
  } catch { return null; }
}






function reapStaleStaging(): void {
  try {
    if (!fs.existsSync(STAGING_BASE)) return;
    const now = Date.now();
    for (const name of fs.readdirSync(STAGING_BASE)) {
      const dir = path.join(STAGING_BASE, name);
      try {
        const stat = fs.statSync(dir);
        if (stat.isDirectory() && now - stat.mtimeMs > STALE_MS) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      } catch {  }
    }
  } catch (e) {
    console.warn('[parts-upload] reapStaleStaging failed:', e instanceof Error ? e.message : e);
  }
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
      if (!fs.existsSync(chunkPath)) {
        out.destroy(new Error(`missing chunk ${i}`));
        return;
      }
      const rs = fs.createReadStream(chunkPath);
      rs.on('error', (e) => out.destroy(e));
      rs.on('end', () => { i++; next(); });
      rs.pipe(out, { end: false });
    };
    next();
  });
}

export function registerPartsTreeUpload(app: Express): void {
  ensureDirs();

  app.post('/api/parts-tree/:projectId/upload-chunk', async (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }

    const projectId = Number(req.params.projectId);
    if (!projectId || Number.isNaN(projectId)) {
      res.status(400).json({ message: 'invalid project id' });
      return;
    }

    const session = String(req.headers['x-upload-session'] || '').trim();
    const chunkIndex = Number(req.headers['x-chunk-index']);
    const chunkTotal = Number(req.headers['x-chunk-total']);
    const relPathB64 = String(req.headers['x-rel-path-b64'] || '').trim();
    const fileSize = Number(req.headers['x-file-size']);

    
    
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(session)) {
      res.status(400).json({ message: 'invalid session id (must be 8-64 alphanumeric)' });
      return;
    }
    if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
      res.status(400).json({ message: 'invalid chunk index' });
      return;
    }
    if (!Number.isFinite(chunkTotal) || chunkTotal <= 0 || chunkTotal > 100_000) {
      res.status(400).json({ message: 'invalid chunk total' });
      return;
    }
    if (chunkIndex >= chunkTotal) {
      res.status(400).json({ message: 'chunk index >= total' });
      return;
    }
    if (!relPathB64) {
      res.status(400).json({ message: 'X-Rel-Path-B64 required' });
      return;
    }
    let relPath: string;
    try { relPath = safeRelPath(Buffer.from(relPathB64, 'base64').toString('utf8')); }
    catch { res.status(400).json({ message: 'malformed X-Rel-Path-B64' }); return; }

    const sessionDir = path.join(STAGING_BASE, session);
    fs.mkdirSync(sessionDir, { recursive: true });
    const chunkPath = path.join(sessionDir, `${chunkIndex}.bin`);

    
    
    
    
    try {
      await new Promise<void>((resolve, reject) => {
        const ws = fs.createWriteStream(chunkPath);
        let bytes = 0;
        req.on('data', (b: Buffer) => { bytes += b.length; });
        req.on('error', reject);
        ws.on('error', reject);
        ws.on('finish', () => {
          
          
          if (bytes === 0 && chunkTotal > 1) {
            try { fs.unlinkSync(chunkPath); } catch {  }
            reject(new Error('empty chunk'));
            return;
          }
          resolve();
        });
        req.pipe(ws);
      });
    } catch (e) {
      console.error('[parts-upload] chunk write failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: e instanceof Error ? e.message : 'write failed' });
      return;
    }

    
    if (chunkIndex < chunkTotal - 1) {
      res.json({ ok: true, received: chunkIndex });
      return;
    }

    
    
    
    const missing: number[] = [];
    for (let i = 0; i < chunkTotal; i++) {
      if (!fs.existsSync(path.join(sessionDir, `${i}.bin`))) missing.push(i);
    }
    if (missing.length > 0) {
      res.status(409).json({
        message: 'incomplete upload, missing chunks',
        missing_chunks: missing,
      });
      return;
    }

    const finalDir = path.join(UPLOAD_BASE, String(projectId));
    const finalPath = path.join(finalDir, relPath);

    try {
      await assembleChunks(sessionDir, chunkTotal, finalPath);
      
      
      if (Number.isFinite(fileSize) && fileSize > 0) {
        const onDisk = fs.statSync(finalPath).size;
        if (onDisk !== fileSize) {
          console.warn(`[parts-upload] size mismatch for ${relPath}: declared=${fileSize}, on disk=${onDisk}`);
        }
      }
      
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (e) {
      console.error('[parts-upload] assemble failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: 'assemble failed' });
      return;
    }

    
    
    reapStaleStaging();

    
    
    
    const serverPath = finalPath.replace(/\\/g, '/');
    res.json({ ok: true, server_path: serverPath });
  });
}
