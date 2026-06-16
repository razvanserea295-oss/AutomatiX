

























import type { Express, Request, Response } from 'express';
import fs from 'fs';
import { AuthService } from '../electron/services/authService';
import { getDb } from './db';





interface ArchiverInstance {
  on(event: 'warning' | 'error', cb: (err: Error) => void): void;
  pipe(stream: NodeJS.WritableStream): void;
  file(absolutePath: string, opts: { name: string }): ArchiverInstance;
  append(content: string | Buffer, opts: { name: string }): ArchiverInstance;
  finalize(): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver: (format: 'zip', opts?: { store?: boolean }) => ArchiverInstance = require('archiver');

interface PieceRow {
  id: number;
  parent_piece_id: number | null;
  name: string;
  source_file_name: string | null;
  source_file_path: string | null;
  source_file_size: number;
}

function loadPieces(projectId: number): PieceRow[] {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT id, parent_piece_id, name, source_file_name, source_file_path, source_file_size
       FROM project_pieces
      WHERE project_id = ?
      ORDER BY parent_piece_id IS NULL DESC, parent_piece_id ASC, sort_order ASC, id ASC`,
  );
  stmt.bind([projectId]);
  const rows: PieceRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as PieceRow);
  }
  stmt.free();
  return rows;
}

function loadProjectName(projectId: number): string | null {
  const db = getDb();
  const stmt = db.prepare('SELECT name FROM projects WHERE id = ? LIMIT 1');
  stmt.bind([projectId]);
  const out: string | null = stmt.step() ? (stmt.get()[0] as string) : null;
  stmt.free();
  return out;
}







function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '_').trim() || 'untitled';
}







function asciiFold(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '_');
}







function isRealFile(p: PieceRow): boolean {
  if (!p.source_file_path) return false;
  if (p.source_file_size > 0) return true;
  
  try { return fs.statSync(p.source_file_path).isFile(); }
  catch { return false; }
}






function* walkForZip(
  pieces: PieceRow[],
): Generator<{ piece: PieceRow; zipPath: string }> {
  const byParent = new Map<number | null, PieceRow[]>();
  for (const p of pieces) {
    const key = (p.parent_piece_id ?? null) as number | null;
    const list = byParent.get(key) || [];
    list.push(p);
    byParent.set(key, list);
  }

  function* recurse(parent: number | null, prefix: string): Generator<{ piece: PieceRow; zipPath: string }> {
    const kids = byParent.get(parent) || [];
    for (const k of kids) {
      const here = isRealFile(k);
      if (here) {
        
        
        
        const fileName = safeName(k.source_file_name || k.name);
        yield { piece: k, zipPath: prefix ? `${prefix}/${fileName}` : fileName };
      } else {
        
        
        const folderName = safeName(k.source_file_name || k.name);
        yield* recurse(k.id, prefix ? `${prefix}/${folderName}` : folderName);
      }
      if (here) {
        
        
        yield* recurse(k.id, prefix);
      }
    }
  }

  yield* recurse(null, '');
}

export function registerPartsTreeDownload(app: Express): void {
  app.get('/api/parts-tree/:projectId/download.zip', (req: Request, res: Response) => {
    
    const token = (req.query.token as string) || '';
    if (!token) { res.status(401).json({ message: 'token required' }); return; }
    let user;
    try { user = AuthService.validateSession(getDb(), token); }
    catch { res.status(401).json({ message: 'invalid token' }); return; }
    if (!user) { res.status(401).json({ message: 'invalid token' }); return; }

    const projectId = Number(req.params.projectId);
    if (!projectId || Number.isNaN(projectId)) {
      res.status(400).json({ message: 'invalid project id' });
      return;
    }

    const projectName = loadProjectName(projectId);
    if (!projectName) {
      res.status(404).json({ message: 'proiect inexistent' });
      return;
    }

    const pieces = loadPieces(projectId);
    if (pieces.length === 0) {
      res.status(404).json({ message: 'arborele este gol' });
      return;
    }

    
    
    
    
    
    
    const safe = safeName(projectName);
    const asciiName = asciiFold(safe) + '.zip';
    const utf8Name  = encodeURIComponent(safe + '.zip');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
    );

    
    
    
    const zip = archiver('zip', { store: true });

    zip.on('warning', (err) => {
      
      
      console.warn('[parts-tree-zip] warning:', err.message);
    });
    zip.on('error', (err) => {
      console.error('[parts-tree-zip] fatal:', err);
      if (!res.headersSent) res.status(500).end();
    });

    zip.pipe(res);

    let added = 0;
    let missing = 0;
    for (const { piece, zipPath } of walkForZip(pieces)) {
      if (!piece.source_file_path) continue;
      try {
        if (!fs.existsSync(piece.source_file_path)) { missing++; continue; }
        zip.file(piece.source_file_path, { name: `${safeName(projectName)}/${zipPath}` });
        added++;
      } catch (e) {
        console.warn('[parts-tree-zip] skip', piece.source_file_path, e instanceof Error ? e.message : e);
        missing++;
      }
    }

    
    
    
    const readme =
      `Arbore proiect: ${projectName}\n` +
      `Generat la: ${new Date().toISOString()}\n` +
      `Descărcat de: ${user.username} (${user.full_name || '—'})\n\n` +
      `Fișiere incluse: ${added}\n` +
      (missing > 0 ? `Fișiere lipsă pe disc (nu mai existau): ${missing}\n` : '') +
      `Total piese în arbore: ${pieces.length}\n`;
    zip.append(readme, { name: `${safeName(projectName)}/README.txt` });

    console.log(`[parts-tree-zip] project=${projectId} added=${added} missing=${missing} pieces=${pieces.length}`);
    zip.finalize();
  });
}
