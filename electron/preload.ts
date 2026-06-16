






















import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

type Unsub = () => void;


function on<T>(channel: string, cb: (payload: T) => void): Unsub {
  const listener = (_e: IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api = {
  platform: process.platform,

  





  invoke: (command: string, args?: Record<string, unknown>): Promise<unknown> =>
    ipcRenderer.invoke(command, args),

  
  notify: (opts: { title: string; body?: string; level?: 'info' | 'success' | 'warning' | 'error' }): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('notify', opts) as Promise<{ ok: boolean }>,

  
  onUpdateAvailable: (cb: (info: { version: string; notes: string }) => void): Unsub =>
    on('update:available', cb),
  onUpdateDownloadProgress: (
    cb: (progress: { percent: number; transferred?: number; total?: number }) => void,
  ): Unsub => on('update:download-progress', cb),
  onUpdateDownloaded: (cb: (info: { version: string }) => void): Unsub =>
    on('update:downloaded', cb),
  onUpdateUnreachable: (cb: (info: { error: string }) => void): Unsub =>
    on('update:unreachable', cb),

  
  onWindowMaxState: (cb: (maximized: boolean) => void): Unsub =>
    on('window:max-state', cb),
};

contextBridge.exposeInMainWorld('electron', api);
