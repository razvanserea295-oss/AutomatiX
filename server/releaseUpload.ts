



























import type { Express, Request, Response } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';


// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml: { dump(obj: unknown, opts?: Record<string, unknown>): string } = require('js-yaml');
import { AuthService } from '../electron/services/authService';
import { getDb } from './db';

const ALLOWED_EXT = new Set(['.exe', '.msi']);
const MAX_BYTES = 10 * 1024 * 1024 * 1024; 
const FILENAME_RE = /^[A-Za-z0-9._\- ]+\.(exe|msi)$/;
const SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;

function basenameSafe(name: string): string {
  
  
  
  return path.basename(name);
}

function toB64Sha512(buf: Buffer): string {
  return crypto.createHash('sha512').update(buf).digest('base64');
}

function decodeNotes(b64: string | undefined): string | null {
  if (!b64) return null;
  try { return Buffer.from(b64, 'base64').toString('utf-8').trim() || null; }
  catch { return null; }
}






function appendChangelog(repoRoot: string, version: string, notesMd: string): void {
  const file = path.join(repoRoot, 'CHANGELOG.md');
  let raw: string;
  try { raw = fs.readFileSync(file, 'utf-8'); }
  catch {
    
    raw = '# Changelog\n\n';
  }
  const headerRe = new RegExp(`^##\\s*\\[?${version.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\]?`, 'm');
  if (headerRe.test(raw)) return;

  const today = new Date().toISOString().slice(0, 10);
  const block = `\n## [${version}] - ${today}\n\n${notesMd}\n\n---\n`;

  
  
  const sepIdx = raw.indexOf('\n---\n');
  if (sepIdx !== -1) {
    const insertAt = sepIdx + '\n---\n'.length;
    raw = raw.slice(0, insertAt) + block + raw.slice(insertAt);
  } else {
    raw = raw.replace(/(^# [^\n]*\n)/, `$1\n${block}`);
  }
  fs.writeFileSync(file, raw);
}

function findRepoRoot(): string {
  
  
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  
  
  return process.cwd();
}

export function registerReleaseUpload(app: Express, updatesDir: string): void {
  // Tight per-call cap; the global JSON parser ignores binary payloads anyway.
  const rawParser = express.raw({ type: 'application/octet-stream', limit: MAX_BYTES });

  app.post('/api/admin/upload-release', rawParser, async (req: Request, res: Response) => {
    try {
      
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim() || '';
      if (!token) return res.status(401).json({ code: 401, message: 'token required' });
      let user;
      try { user = AuthService.validateSession(getDb(), token); }
      catch { return res.status(401).json({ code: 401, message: 'invalid token' }); }
      if (!user) return res.status(401).json({ code: 401, message: 'invalid token' });
      if (user.role_name?.toLowerCase() !== 'admin') {
        return res.status(403).json({ code: 403, message: 'admin only' });
      }

      
      const filename = basenameSafe(String(req.headers['x-release-filename'] || ''));
      const version = String(req.headers['x-release-version'] || '').trim();
      const notes = decodeNotes(req.headers['x-release-notes-b64'] as string | undefined);

      if (!filename || !FILENAME_RE.test(filename)) {
        return res.status(400).json({ code: 400, message: 'invalid X-Release-Filename (expected name.exe or name.msi)' });
      }
      if (!version || !SEMVER_RE.test(version)) {
        return res.status(400).json({ code: 400, message: 'invalid X-Release-Version (expected semver, e.g. 1.2.1)' });
      }
      const ext = path.extname(filename).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        return res.status(400).json({ code: 400, message: 'unsupported extension (only .exe / .msi)' });
      }

      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        return res.status(400).json({ code: 400, message: 'empty body — send binary as application/octet-stream' });
      }

      
      
      if (!fs.existsSync(updatesDir)) fs.mkdirSync(updatesDir, { recursive: true });
      const outFile = path.join(updatesDir, filename);
      const tmpFile = outFile + '.uploading';
      fs.writeFileSync(tmpFile, body);
      fs.renameSync(tmpFile, outFile);

      const sha512 = toB64Sha512(body);
      const size = body.length;
      const latestYml = {
        version,
        files: [{ url: filename, sha512, size }],
        path: filename,
        sha512,
        releaseDate: new Date().toISOString(),
      };
      const ymlPath = path.join(updatesDir, 'latest.yml');
      fs.writeFileSync(ymlPath, yaml.dump(latestYml, { lineWidth: 4096, quotingType: '"' }));

      
      if (notes) {
        try { appendChangelog(findRepoRoot(), version, notes); }
        catch (e) { console.warn('[upload-release] changelog write failed:', e); }
      }

      console.log(`[upload-release] published ${filename} (${(size / 1024 / 1024).toFixed(1)} MB) v${version} by user_id=${user.id}`);
      return res.json({ ok: true, version, file: filename, sha512, size, latestYmlPath: ymlPath });
    } catch (err: any) {
      console.error('[upload-release] failed:', err);
      
      
      if (err?.type === 'entity.too.large') {
        return res.status(413).json({ code: 413, message: `payload exceeds ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB` });
      }
      return res.status(500).json({ code: 500, message: err?.message || 'upload failed' });
    }
  });
}
