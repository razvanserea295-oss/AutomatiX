















import { useEffect, useState } from 'react';
import { AlertTriangle, X } from '@/icons';
import Button from '@/v2/components/primitives/Button';

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

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center surface-glass p-4 anim-fade-in"
      onClick={() => resolve(false)}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-md rounded-2xl border border-line/60 surface-glass-strong shadow-[var(--elevation-4)] overflow-hidden anim-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Închide"
          onClick={() => resolve(false)}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-xl text-content-muted transition-smooth duration-150 hover:bg-surface-tertiary hover:text-content-primary active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4 px-6 pt-6">
          {pending.danger && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-red/15 text-status-red">
              <AlertTriangle className="h-5 w-5" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h2 id="confirm-title" className="text-pm-md font-semibold text-content-primary leading-snug">
              {pending.title}
            </h2>
            {pending.body && (
              <p className="mt-2 text-pm-sm text-content-secondary leading-relaxed">{pending.body}</p>
            )}
            {pending.hint && (
              <p className="mt-2 text-pm-xs text-content-muted leading-relaxed">{pending.hint}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-line/50 bg-surface-secondary px-6 py-4">
          <Button variant="ghost" size="md" onClick={() => resolve(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={pending.danger ? 'danger' : 'primary'}
            size="md"
            autoFocus
            onClick={() => resolve(true)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
