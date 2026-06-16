










import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  body?: string;
  
  confirmLabel?: string;
  
  cancelLabel?: string;
  
  danger?: boolean;
  
  hint?: string;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let _pending: PendingConfirm | null = null;
let _listener: ((p: PendingConfirm | null) => void) | null = null;


export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    
    if (_pending) _pending.resolve(false);
    _pending = { ...opts, resolve };
    _listener?.(_pending);
  });
}


export function ConfirmDialogHost(): JSX.Element | null {
  const [pending, setPending] = useState<PendingConfirm | null>(_pending);

  useEffect(() => {
    _listener = setPending;
    return () => { _listener = null; };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolve(false);
      else if (e.key === 'Enter') resolve(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  function resolve(value: boolean) {
    if (!pending) return;
    pending.resolve(value);
    _pending = null;
    setPending(null);
  }

  if (!pending) return null;

  const confirmLabel = pending.confirmLabel ?? (pending.danger ? 'Șterge' : 'Confirmă');
  const cancelLabel = pending.cancelLabel ?? 'Anulează';
  
  
  
  
  
  const confirmCls = pending.danger
    ? 'bg-status-red text-surface-primary hover:bg-status-red/90'
    : 'bg-accent text-surface-primary hover:opacity-90';

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => resolve(false)}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-md rounded-xl border border-line bg-surface-elevated shadow-[var(--elevation-4)] surface-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Închide"
          onClick={() => resolve(false)}
          className="absolute right-2 top-2 rounded p-1 text-content-muted hover:bg-surface-tertiary hover:text-content-primary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 px-5 pt-5">
          {pending.danger && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-red/15 text-status-red">
              <AlertTriangle className="h-4 w-4" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h2 id="confirm-title" className="text-base font-semibold text-content-primary leading-snug">
              {pending.title}
            </h2>
            {pending.body && (
              <p className="mt-1.5 text-sm text-content-secondary leading-relaxed">{pending.body}</p>
            )}
            {pending.hint && (
              <p className="mt-2 text-pm-xs text-content-muted leading-relaxed">{pending.hint}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-line px-5 py-3 bg-surface-primary/30">
          <button
            type="button"
            onClick={() => resolve(false)}
            className="rounded px-3 py-1.5 text-xs font-semibold text-content-secondary hover:bg-surface-tertiary transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => resolve(true)}
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
