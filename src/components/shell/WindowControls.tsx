import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Minus, Square, Copy, X } from '@/icons';
import { isTauri } from '@/lib/tauriUpdater';
import { isElectronRuntime } from '@/lib/runtime';

type AppWindow = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onResized: (cb: () => void) => Promise<() => void>;
};

type WindowControlMode = 'tauri' | 'electron' | 'none';

export default function WindowControls() {
  const [mode, setMode] = useState<WindowControlMode>('none');
  const [tauriWin, setTauriWin] = useState<AppWindow | null>(null);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (isTauri()) {
      setMode('tauri');
      let unlisten: (() => void) | undefined;
      let alive = true;
      (async () => {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const w = getCurrentWindow() as unknown as AppWindow;
          if (!alive) return;
          setTauriWin(w);
          setMaximized(await w.isMaximized());
          unlisten = await w.onResized(async () => {
            try { setMaximized(await w.isMaximized()); } catch { /* noop */ }
          });
        } catch (e) {
          console.warn('[window-controls] tauri init failed:', e);
        }
      })();
      return () => {
        alive = false;
        unlisten?.();
      };
    }

    if (isElectronRuntime()) {
      setMode('electron');
      let unsub: (() => void) | undefined;
      let alive = true;
      (async () => {
        try {
          const res = await window.electron.invoke('window_is_maximized') as { maximized?: boolean };
          if (alive) setMaximized(!!res?.maximized);
        } catch { /* noop */ }
      })();
      if (typeof window.electron.onWindowMaxState === 'function') {
        unsub = window.electron.onWindowMaxState((max) => setMaximized(max));
      }
      return () => {
        alive = false;
        unsub?.();
      };
    }

    return undefined;
  }, []);

  if (mode === 'none') return null;

  const btn =
    'inline-flex h-full min-h-[var(--shell-titlebar-h)] w-[46px] items-center justify-center text-white/70 transition-smooth duration-150 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:shadow-[var(--ring-soft)]';

  const onMinimize = () => {
    if (mode === 'tauri' && tauriWin) void tauriWin.minimize();
    else if (mode === 'electron') void window.electron.invoke('window_minimize');
  };

  const onToggleMaximize = () => {
    if (mode === 'tauri' && tauriWin) void tauriWin.toggleMaximize();
    else if (mode === 'electron') void window.electron.invoke('window_toggle_maximize');
  };

  const onClose = () => {
    if (mode === 'tauri' && tauriWin) void tauriWin.close();
    else if (mode === 'electron') void window.electron.invoke('window_close');
  };

  if (mode === 'tauri' && !tauriWin) return null;

  // macOS Tauri bug: a parent `data-tauri-drag-region` swallows mousedown on child
  // buttons, so min/max/close never fire. Stopping mousedown propagation keeps the
  // titlebar draggable while letting these buttons receive their clicks.
  const stopDrag = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div className="ml-0.5 flex items-stretch self-stretch" onMouseDown={stopDrag} style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
      <button type="button" aria-label="Minimizează" title="Minimizează" className={btn} onMouseDown={stopDrag} onClick={onMinimize}>
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={maximized ? 'Restaurează' : 'Maximizează'}
        title={maximized ? 'Restaurează' : 'Maximizează'}
        className={btn}
        onClick={onToggleMaximize}
      >
        {maximized ? <Copy className="h-3.5 w-3.5 -scale-x-100" /> : <Square className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        aria-label="Închide"
        title="Închide"
        className="inline-flex h-full min-h-[var(--shell-titlebar-h)] w-[46px] items-center justify-center text-white/70 transition-smooth duration-150 hover:bg-[#e81123] hover:text-white focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
