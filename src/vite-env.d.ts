/// <reference types="vite/client" />

type ElectronUnsubscribe = () => void;

declare global {
  // Injected by Vite at build time (see vite.config.ts `define`) from package.json.
  const __APP_VERSION__: string;

  interface Window {
    electron: {
      platform: 'win32' | 'darwin' | 'linux' | 'freebsd' | 'openbsd' | 'sunos' | 'aix' | string;
      invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
      notify?: (opts: { title: string; body?: string; level?: 'info' | 'success' | 'warning' | 'error' }) => Promise<{ ok: boolean }>;
      onUpdateAvailable: (callback: (info: { version: string; notes: string }) => void) => ElectronUnsubscribe;
      onUpdateDownloadProgress: (callback: (progress: { percent: number; transferred?: number; total?: number }) => void) => ElectronUnsubscribe;
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => ElectronUnsubscribe;
      onUpdateUnreachable?: (callback: (info: { error: string }) => void) => ElectronUnsubscribe;
      onWindowMaxState?: (callback: (maximized: boolean) => void) => ElectronUnsubscribe;
    };
  }
}

export {};
