





import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { isTauri } from '@/lib/tauriUpdater';

type AppWindow = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onResized: (cb: () => void) => Promise<() => void>;
};

export default function WindowControls() {
  const [win, setWin] = useState<AppWindow | null>(null);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let alive = true;
    (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const w = getCurrentWindow() as unknown as AppWindow;
        if (!alive) return;
        setWin(w);
        setMaximized(await w.isMaximized());
        unlisten = await w.onResized(async () => {
          try { setMaximized(await w.isMaximized()); } catch {  }
        });
      } catch (e) {
        console.warn('[window-controls] init failed (ignored):', e);
      }
    })();
    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);

  if (!isTauri() || !win) return null;

  const btn =
    'inline-flex h-11 w-[46px] items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none';

  return (
    <div className="ml-1 flex items-stretch self-stretch" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button type="button" aria-label="Minimizează" title="Minimizează" className={btn} onClick={() => win.minimize()}>
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={maximized ? 'Restaurează' : 'Maximizează'}
        title={maximized ? 'Restaurează' : 'Maximizează'}
        className={btn}
        onClick={() => win.toggleMaximize()}
      >
        {maximized ? <Copy className="h-3.5 w-3.5 -scale-x-100" /> : <Square className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        aria-label="Închide"
        title="Închide"
        className="inline-flex h-11 w-[46px] items-center justify-center text-white/70 transition-colors hover:bg-[#e81123] hover:text-white focus:outline-none"
        onClick={() => win.close()}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
