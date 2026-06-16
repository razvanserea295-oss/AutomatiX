import { ElectronEnvironment } from '@/api/commands';





export async function quitApplication(): Promise<void> {
  if (!ElectronEnvironment.isElectron()) {
    console.warn('[automatiX] Quit is only available in the desktop app.');
    return;
  }
  try {
    await window.electron.invoke('app_quit');
  } catch (err) {
    console.error('[automatiX] Failed to quit:', err);
  }
}
