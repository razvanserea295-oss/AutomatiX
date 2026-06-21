











export function isTauri(): boolean {
  return isTauriRuntime();
}

export type UpdateInfo = {
  version: string;
  currentVersion: string;
  notes?: string;
  date?: string;
};

export type UpdatePhase = 'download' | 'install';


let pendingUpdate: { downloadAndInstall: (cb: (e: DownloadEvent) => void) => Promise<void> } | null = null;

type DownloadEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished' };






export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri()) return null;
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) {
      pendingUpdate = null;
      return null;
    }
    pendingUpdate = update as unknown as typeof pendingUpdate;
    return {
      version: update.version,
      currentVersion: update.currentVersion,
      notes: update.body || undefined,
      date: update.date || undefined,
    };
  } catch (e) {
    console.warn('[updater] check failed (ignored):', e);
    pendingUpdate = null;
    return null;
  }
}






export async function installPendingUpdate(
  onProgress?: (pct: number | null, phase: UpdatePhase) => void,
): Promise<void> {
  if (!isTauri() || !pendingUpdate) return;
  const update = pendingUpdate;

  let downloaded = 0;
  let contentLength = 0;
  await update.downloadAndInstall((event: DownloadEvent) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength ?? 0;
        onProgress?.(0, 'download');
        break;
      case 'Progress':
        downloaded += event.data.chunkLength ?? 0;
        onProgress?.(contentLength ? Math.round((downloaded / contentLength) * 100) : null, 'download');
        break;
      case 'Finished':
        onProgress?.(100, 'install');
        break;
    }
  });

  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}
import { isTauriRuntime } from '@/lib/runtime';
