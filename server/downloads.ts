














import type { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const NAME_RE = /^Automatix-Setup-(.+)\.exe$/i;


function downloadsDir(): string {
  const candidates = [
    path.join(process.cwd(), 'public', 'downloads'),
    path.join(__dirname, '../../public/downloads'),
    path.join(__dirname, '../../../public/downloads'),
    path.join(process.cwd(), 'dist', 'downloads'),
    path.join(__dirname, '../../dist/downloads'),
  ];
  return candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || candidates[0];
}

interface InstallerMeta { file: string; version: string; size: number; mtime: number; }


function findLatest(): InstallerMeta | null {
  const dir = downloadsDir();
  let entries: string[] = [];
  try { entries = fs.readdirSync(dir); } catch { return null; }
  const matches: InstallerMeta[] = [];
  for (const f of entries) {
    const m = NAME_RE.exec(f);
    if (!m) continue;
    try {
      const st = fs.statSync(path.join(dir, f));
      matches.push({ file: f, version: m[1], size: st.size, mtime: st.mtimeMs });
    } catch {  }
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.mtime - a.mtime);
  return matches[0];
}

export function registerDownloads(app: Express): void {
  
  
  app.get('/download', (_req: Request, res: Response) => {
    res.redirect(302, '/#/download');
  });

  
  app.get('/api/download/latest', (_req: Request, res: Response) => {
    const latest = findLatest();
    res.set('Cache-Control', 'no-store');
    if (!latest) {
      res.json({ available: false, version: null, file: null, url: null, size: null });
      return;
    }
    res.json({
      available: true,
      version: latest.version,
      file: latest.file,
      url: `/downloads/${encodeURIComponent(latest.file)}`,
      size: latest.size,
    });
  });

  
  
  app.get('/downloads/:file', (req: Request, res: Response) => {
    const file = path.basename(String(req.params.file || ''));
    if (!NAME_RE.test(file)) { res.status(404).json({ message: 'not found' }); return; }
    const full = path.join(downloadsDir(), file);
    if (!fs.existsSync(full)) { res.status(404).json({ message: 'not found' }); return; }
    res.download(full, file, (err) => {
      if (err && !res.headersSent) res.status(500).end();
    });
  });
}
