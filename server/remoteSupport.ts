import type { Express, Request, Response } from 'express';
import { getDb, saveDatabase } from './db';
import { RemoteSupportService } from '../electron/services/remoteSupportService';
import { findSupportBundle, supportAssetsDir } from '../electron/services/remoteSupportBundle';

function validateQuickCode(req: Request, res: Response): string | null {
  const code = String(req.params.code || '').trim().toLowerCase();
  if (!/^[a-f0-9]{8,24}$/i.test(code)) {
    res.status(400).json({ message: 'Cod invalid' });
    return null;
  }
  return code;
}

export function registerRemoteSupportRoutes(app: Express, tokenLimiter: (req: Request, res: Response, next: () => void) => void): void {
  app.get('/api/support/q/:code', tokenLimiter, (req, res) => {
    const code = validateQuickCode(req, res);
    if (!code) return;
    try {
      const view = RemoteSupportService.getPublicQuickView(getDb(), code);
      saveDatabase();
      res.set('Cache-Control', 'no-store');
      res.json(view);
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      const status = e?.code && e.code >= 100 && e.code < 600 ? e.code : 500;
      res.status(status).json({ message: e?.message || 'support error' });
    }
  });

  app.post('/api/support/q/:code/report-id', tokenLimiter, (req, res) => {
    const code = validateQuickCode(req, res);
    if (!code) return;
    try {
      const rustdeskId = String(req.body?.rustdesk_id || req.body?.id || '');
      RemoteSupportService.reportQuickRustDeskId(getDb(), code, rustdeskId);
      saveDatabase();
      res.json({ ok: true });
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      const status = e?.code && e.code >= 100 && e.code < 600 ? e.code : 500;
      res.status(status).json({ message: e?.message || 'report error' });
    }
  });

  app.get('/api/support/q/:code/download', tokenLimiter, (req, res) => {
    const code = validateQuickCode(req, res);
    if (!code) return;
    try {
      RemoteSupportService.getPublicQuickView(getDb(), code);
      saveDatabase();
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      const status = e?.code && e.code >= 100 && e.code < 600 ? e.code : 500;
      res.status(status).json({ message: e?.message || 'invalid code' });
      return;
    }

    const bundle = findSupportBundle();
    if (!bundle) {
      res.status(404).json({
        message: 'Instrumentul de suport nu este configurat pe server. Plasați Promix-QuickSupport.exe în public/support/.',
      });
      return;
    }

    const downloadName = bundle.file.includes('.zip')
      ? bundle.file
      : bundle.file.includes('QuickSupport')
        ? bundle.file
        : 'Promix-QuickSupport.zip';
    res.download(bundle.full, downloadName, (err) => {
      if (err && !res.headersSent) res.status(500).end();
    });
  });

  app.get('/api/support/bundle-info', (_req, res) => {
    const bundle = findSupportBundle();
    res.json({
      available: !!bundle,
      file: bundle?.file ?? null,
      dir: supportAssetsDir(),
    });
  });
}
