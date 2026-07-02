import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { flushDatabase } from './db';

/** Respawn the Node server process, preserving cwd and loading `.env` on restart. */
export function scheduleServerRespawn(meta: { by: string; reason: string; userId?: number }): void {
  const node = process.execPath;
  const entry = process.argv[1];
  const cwd = process.cwd();
  const isWin = process.platform === 'win32';
  if (!entry) {
    throw new Error('Nu pot determina scriptul serverului (process.argv[1] lipsă).');
  }

  try {
    fs.writeFileSync(path.join(cwd, '.restart-marker'), JSON.stringify({
      at: new Date().toISOString(),
      by: meta.by,
      user_id: meta.userId ?? null,
      old_pid: process.pid,
      entry,
      reason: meta.reason,
    }, null, 2));
  } catch (e) {
    console.warn('[respawn] marker write failed (continuing):', e);
  }

  const envFlag = '--env-file-if-exists=.env';
  const child = isWin
    ? spawn(
      'cmd.exe',
      ['/c', `ping -n 3 127.0.0.1 >nul & "${node}" ${envFlag} "${entry}"`],
      { cwd, detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true },
    )
    : spawn('sh', ['-c', `sleep 2; exec "${node}" ${envFlag} "${entry}"`], { cwd, detached: true, stdio: 'ignore' });
  child.unref();
  console.log(`[respawn] scheduled (child pid ${child.pid}) — ${meta.reason}`);

  setTimeout(() => {
    try { flushDatabase(); } catch (e) { console.error('[respawn] DB flush failed:', e); }
    console.log('[respawn] exiting now for respawn.');
    process.exit(0);
  }, isWin ? 1000 : 1200);
}
