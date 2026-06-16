type Unsubscribe = () => void;

declare global {
  interface Window {
    electron: {
      invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
      onUpdateAvailable: (callback: (info: { version: string; notes: string }) => void) => Unsubscribe;
      onUpdateDownloadProgress: (callback: (progress: { percent: number; transferred?: number; total?: number }) => void) => Unsubscribe;
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => Unsubscribe;
      onUpdateUnreachable: (callback: (info: { error: string }) => void) => Unsubscribe;
    };
  }
}

export {};
