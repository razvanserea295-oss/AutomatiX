import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Single-instance guard for the database file.
 *
 * sql.js keeps the WHOLE database in memory and persists it as a full-file
 * snapshot (server/db.ts). If two server processes ever open the same promix.db,
 * each periodically exports its in-memory copy over the other's file — so the
 * last writer silently CLOBBERS the other's committed work, with no error. For a
 * system of record that is catastrophic. This lock refuses to start a second
 * instance against the same DB file.
 *
 * The legitimate restart_server handoff (parent flushes + exits while a detached
 * child relaunches) is preserved: if the current holder is still alive, we wait
 * up to `graceMs` for it to release before giving up, instead of failing hard.
 */

export interface LockInfo {
  pid: number;
  startedAt: string;
  host: string;
  dbFile: string;
}

let _heldLockPath: string | null = null;

function isProcessAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    // Signal 0 doesn't kill — it only checks existence/permission.
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // ESRCH = no such process (dead). EPERM = exists but not ours (alive).
    return (e as NodeJS.ErrnoException)?.code === 'EPERM';
  }
}

export async function acquireInstanceLock(dbPath: string, graceMs = 12000): Promise<void> {
  const lockPath = dbPath + '.lock';
  const payload = (): string =>
    JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
      host: os.hostname(),
      dbFile: path.basename(dbPath),
    } as LockInfo);

  const deadline = Date.now() + graceMs;

  for (;;) {
    try {
      // 'wx' = create exclusively; fails with EEXIST if the lock already exists.
      fs.writeFileSync(lockPath, payload(), { flag: 'wx' });
      _heldLockPath = lockPath;
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException)?.code !== 'EEXIST') throw e;

      let holder: LockInfo | null = null;
      try { holder = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as LockInfo; } catch { holder = null; }
      const pid = holder?.pid ?? 0;

      if (pid === process.pid) { _heldLockPath = lockPath; return; }

      if (!isProcessAlive(pid)) {
        // Previous server died without releasing (e.g. killed -9 / power loss).
        // Reclaim the stale lock and retry.
        try { fs.unlinkSync(lockPath); } catch { /* raced with another reclaimer */ }
        continue;
      }

      if (Date.now() >= deadline) {
        throw new Error(
          `Another Automatix server is already running (PID ${pid} on ${holder?.host ?? '?'}, since ${holder?.startedAt ?? '?'}) ` +
          `and is using ${path.basename(dbPath)}. Refusing to start a second instance — two servers on one database ` +
          `silently overwrite each other's data. Stop the other process first. If you are certain no server is running, ` +
          `delete the stale lock file: ${lockPath}`,
        );
      }

      // Holder is alive and we're within the grace window — this is most likely a
      // restart_server handoff. Wait briefly for the old process to exit.
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

/** Remove our lock (only if it is still ours). Safe to call multiple times. */
export function releaseInstanceLock(): void {
  if (!_heldLockPath) return;
  const lockPath = _heldLockPath;
  _heldLockPath = null;
  try {
    const holder = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as LockInfo;
    if (holder.pid === process.pid) fs.unlinkSync(lockPath);
  } catch { /* already gone or not ours — nothing to do */ }
}
