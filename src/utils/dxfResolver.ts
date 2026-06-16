




import { ElectronEnvironment } from '@/api/commands';

export function resolveDxfPath(sldprtPath: string): string {
  return sldprtPath.replace(/\.SLDPRT$/i, '.dxf');
}

export async function checkDxfExists(path: string): Promise<boolean> {
  if (!ElectronEnvironment.isElectron()) return false;
  try {
    return await window.electron.invoke('fs_exists', { path }) as boolean;
  } catch {
    return false;
  }
}

export async function findDxfFile(sldprtPath: string): Promise<string | null> {
  const directPath = resolveDxfPath(sldprtPath);
  if (await checkDxfExists(directPath)) return directPath;

  const parts = directPath.replace(/\\/g, '/').split('/');
  const fileName = parts.pop() || '';
  const parentDir = parts.join('/');
  const dxfSubfolderPath = `${parentDir}/dxf/${fileName}`;
  if (await checkDxfExists(dxfSubfolderPath)) return dxfSubfolderPath;

  const dxfUpperPath = `${parentDir}/DXF/${fileName}`;
  if (await checkDxfExists(dxfUpperPath)) return dxfUpperPath;

  return null;
}

export async function loadDxfContent(path: string): Promise<string> {
  if (!ElectronEnvironment.isElectron()) {
    throw new Error('DXF loading requires Electron desktop environment');
  }
  return await window.electron.invoke('fs_read_text', { path }) as string;
}

export async function pickDxfFile(): Promise<string | null> {
  if (!ElectronEnvironment.isElectron()) return null;
  try {
    return await window.electron.invoke('dialog_open_file', {
      title: 'Selectează fisier DXF',
      filters: [{ name: 'DXF Files', extensions: ['dxf'] }],
    }) as string | null;
  } catch {
    return null;
  }
}
