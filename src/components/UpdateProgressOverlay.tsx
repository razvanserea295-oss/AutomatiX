
















import { useEffect, useState } from 'react';
import { Download, Loader2, RotateCw, AlertTriangle, X, Sparkles } from 'lucide-react';

type Phase = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';

interface State {
  phase: Phase;
  version?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  error?: string;
}

interface IpcInvoke {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  onUpdateAvailable?: (cb: (info: { version: string; notes: string }) => void) => () => void;
  onUpdateDownloadProgress?: (cb: (p: { percent: number; transferred?: number; total?: number }) => void) => () => void;
  onUpdateDownloaded?: (cb: (info: { version: string }) => void) => () => void;
  onUpdateUnreachable?: (cb: (info: { error: string }) => void) => () => void;
}

function getElectron(): IpcInvoke | null {
  return typeof window !== 'undefined' && 'electron' in window
    ? (window as unknown as { electron: IpcInvoke }).electron
    : null;
}

function fmtBytes(n?: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function UpdateProgressOverlay() {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const ipc = getElectron();
    if (!ipc) return;

    const offs: Array<() => void> = [];
    if (ipc.onUpdateAvailable) {
      offs.push(ipc.onUpdateAvailable((info) => {
        setDismissed(false);
        setState((s) => ({ ...s, phase: 'available', version: info.version }));
      }));
    }
    if (ipc.onUpdateDownloadProgress) {
      offs.push(ipc.onUpdateDownloadProgress((p) => {
        setDismissed(false);
        setState((s) => ({
          ...s,
          phase: 'downloading',
          percent: Math.max(0, Math.min(100, p.percent || 0)),
          transferred: p.transferred,
          total: p.total,
        }));
      }));
    }
    if (ipc.onUpdateDownloaded) {
      offs.push(ipc.onUpdateDownloaded((info) => {
        setDismissed(false);
        setState((s) => ({ ...s, phase: 'downloaded', version: info.version, percent: 100 }));
      }));
    }
    if (ipc.onUpdateUnreachable) {
      offs.push(ipc.onUpdateUnreachable((info) => {
        setState({ phase: 'error', error: info.error });
        setDismissed(false);
        
        
        setTimeout(() => setState({ phase: 'idle' }), 8_000);
      }));
    }
    return () => { for (const off of offs) off(); };
  }, []);

  const restart = async () => {
    const ipc = getElectron();
    if (!ipc) return;
    setInstalling(true);
    try { await ipc.invoke('updater_install'); }
    catch { setInstalling(false); }
    
  };

  const visible = state.phase !== 'idle' && !dismissed;
  
  
  const canDismiss = state.phase === 'available' || state.phase === 'downloading' || state.phase === 'error';

  
  
  const wrapClass = `fixed bottom-4 right-4 z-[90] transition-[opacity,transform] duration-300 ease-out ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
  }`;

  return (
    <div className={wrapClass} aria-live="polite">
      <div className="w-[340px] bg-surface-elevated border border-line shadow-soft-lg overflow-hidden">
        {}
        <div className={`h-0.5 ${
          state.phase === 'downloading' ? 'bg-accent/30' :
          state.phase === 'downloaded'  ? 'bg-status-green' :
          state.phase === 'error'       ? 'bg-status-red' :
                                          'bg-accent'
        }`}>
          {state.phase === 'downloading' && (
            <div
              className="h-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${state.percent ?? 0}%` }}
            />
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {state.phase === 'available'   && <Download    className="h-4 w-4 text-accent" />}
              {state.phase === 'downloading' && <Loader2     className="h-4 w-4 text-accent animate-spin" />}
              {state.phase === 'downloaded'  && <Sparkles    className="h-4 w-4 text-status-green" />}
              {state.phase === 'error'       && <AlertTriangle className="h-4 w-4 text-status-red" />}
            </div>

            <div className="flex-1 min-w-0">
              {state.phase === 'available' && (
                <>
                  <p className="text-pm-eyebrow text-content-muted">Update disponibil</p>
                  <p className="text-pm-sm font-semibold text-content-primary mt-0.5">
                    Versiunea {state.version ?? '…'}
                  </p>
                  <p className="text-pm-xs text-content-muted mt-1">
                    Se descarcă în fundal…
                  </p>
                </>
              )}

              {state.phase === 'downloading' && (
                <>
                  <p className="text-pm-eyebrow text-content-muted">Se descarcă update</p>
                  <p className="text-pm-sm font-semibold text-content-primary mt-0.5 tabular-nums">
                    {state.percent?.toFixed(0) ?? 0}%
                    {state.version && <span className="ml-1.5 text-pm-xs font-normal text-content-muted">v{state.version}</span>}
                  </p>
                  <p className="text-pm-xs text-content-muted mt-1 tabular-nums font-mono">
                    {fmtBytes(state.transferred)} / {fmtBytes(state.total)}
                  </p>
                </>
              )}

              {state.phase === 'downloaded' && (
                <>
                  <p className="text-pm-eyebrow text-status-green">Update descărcat</p>
                  <p className="text-pm-sm font-semibold text-content-primary mt-0.5">
                    Versiunea {state.version ?? '…'} e gata de instalare
                  </p>
                  <p className="text-pm-xs text-content-muted mt-1">
                    Repornește acum sau la următoarea închidere.
                  </p>
                </>
              )}

              {state.phase === 'error' && (
                <>
                  <p className="text-pm-eyebrow text-status-red">Update inaccesibil</p>
                  <p className="text-pm-sm text-content-primary mt-0.5">
                    Server-ul de update nu răspunde
                  </p>
                  {state.error && (
                    <p className="text-pm-2xs text-content-muted mt-1 font-mono break-all line-clamp-2">{state.error}</p>
                  )}
                </>
              )}
            </div>

            {canDismiss && (
              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Închide"
                className="shrink-0 -mr-1 -mt-1 p-1 text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {state.phase === 'downloaded' && (
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-line-subtle">
              <button
                type="button"
                onClick={() => setDismissed(true)}
                disabled={installing}
                className="h-7 px-3 text-pm-xs font-semibold text-content-secondary hover:bg-surface-tertiary disabled:opacity-50"
              >
                Mai târziu
              </button>
              <button
                type="button"
                onClick={restart}
                disabled={installing}
                className="h-7 px-3 bg-accent text-on-accent text-pm-xs font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
              >
                {installing
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <RotateCw className="h-3 w-3" />}
                Repornește acum
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
