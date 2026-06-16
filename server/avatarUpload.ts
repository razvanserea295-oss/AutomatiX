












import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthService } from '../electron/services/authService';
import { logAuditEvent } from '../electron/db/auditLogs';
import { getDb, saveDatabase } from './db';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; 
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};
const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
};

function avatarsDir(): string {
  const dir = path.join(process.cwd(), 'data', 'avatars');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function authUser(req: Request) {
  const header = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = header || (req.query.token as string) || '';
  if (!token) return null;
  try { return AuthService.validateSession(getDb(), token) || null; } catch { return null; }
}


function clearExisting(userId: number): void {
  for (const ext of ['jpg', 'png', 'webp']) {
    const p = path.join(avatarsDir(), `${userId}.${ext}`);
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {  }
  }
}

export function registerAvatarUpload(app: Express): void {
  avatarsDir();

  
  app.post('/api/avatar/upload', async (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }

    const mime = String(req.headers['x-file-mime'] || req.headers['content-type'] || '').toLowerCase().split(';')[0].trim();
    const ext = MIME_EXT[mime];
    if (!ext) { res.status(415).json({ message: 'Format acceptat: JPG, PNG sau WEBP' }); return; }

    
    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;
    try {
      await new Promise<void>((resolve, reject) => {
        req.on('data', (b: Buffer) => {
          size += b.length;
          if (size > MAX_AVATAR_BYTES) {
            aborted = true;
            reject(new Error('Imaginea depășește 2 MB'));
            req.destroy();
            return;
          }
          chunks.push(b);
        });
        req.on('end', () => resolve());
        req.on('error', reject);
      });
    } catch (e) {
      res.status(413).json({ message: e instanceof Error ? e.message : 'Upload eșuat' });
      return;
    }
    if (aborted || size === 0) { res.status(400).json({ message: 'Fișier gol' }); return; }

    clearExisting(user.id);
    const rel = `avatars/${user.id}.${ext}`;
    try {
      fs.writeFileSync(path.join(process.cwd(), 'data', rel), Buffer.concat(chunks));
    } catch (e) {
      console.error('[avatar] write failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: 'Salvare eșuată' });
      return;
    }

    try {
      const db = getDb();
      db.run('UPDATE users SET avatar_path = ?, updated_at = datetime(\'now\') WHERE id = ?', [rel, user.id]);
      logAuditEvent(db, user.id, 'AVATAR_UPDATE', 'user', user.id);
      saveDatabase();
    } catch (e) {
      console.error('[avatar] db update failed:', e instanceof Error ? e.message : e);
      res.status(500).json({ message: 'Salvare eșuată' });
      return;
    }
    res.json({ ok: true, avatar_path: rel });
  });

  
  app.post('/api/avatar/remove', (req: Request, res: Response) => {
    const user = authUser(req);
    if (!user) { res.status(401).json({ message: 'token required' }); return; }
    clearExisting(user.id);
    try {
      const db = getDb();
      db.run('UPDATE users SET avatar_path = NULL, updated_at = datetime(\'now\') WHERE id = ?', [user.id]);
      logAuditEvent(db, user.id, 'AVATAR_REMOVE', 'user', user.id);
      saveDatabase();
    } catch {  }
    res.json({ ok: true });
  });

  
  app.get('/api/avatar/:userId', (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    if (!userId || Number.isNaN(userId)) { res.status(400).end(); return; }
    let rel: string | null = null;
    try {
      const db = getDb();
      const stmt = db.prepare('SELECT avatar_path FROM users WHERE id = ?');
      stmt.bind([userId]);
      if (stmt.step()) rel = (stmt.getAsObject().avatar_path as string | null) ?? null;
      stmt.free();
    } catch { res.status(404).end(); return; }
    if (!rel) { res.status(404).end(); return; }
    
    const abs = path.join(process.cwd(), 'data', rel);
    if (!abs.startsWith(avatarsDir()) || !fs.existsSync(abs)) { res.status(404).end(); return; }
    const ext = (rel.split('.').pop() || '').toLowerCase();
    res.setHeader('Content-Type', EXT_MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=60');
    fs.createReadStream(abs).on('error', () => { if (!res.headersSent) res.status(500).end(); }).pipe(res);
  });
}
