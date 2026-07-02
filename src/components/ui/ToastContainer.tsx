/**
 * ToastContainer — premium toast renderer wired to the global toastStore.
 * Glass surface, colored accent bar, progress drain, spring slide-in.
 */
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from '@/icons';
import { useToastStore, type ToastType } from '@/store/toastStore';

const DURATION: Record<ToastType, number> = {
  success: 2500,
  error: 0,
  warning: 5000,
  info: 3000,
};

const meta: Record<ToastType, { icon: typeof CheckCircle2; bar: string; iconCls: string }> = {
  success: { icon: CheckCircle2, bar: 'bg-status-green', iconCls: 'text-status-green' },
  error: { icon: AlertCircle, bar: 'bg-status-red', iconCls: 'text-status-red' },
  warning: { icon: AlertTriangle, bar: 'bg-status-amber', iconCls: 'text-status-amber' },
  info: { icon: Info, bar: 'bg-accent', iconCls: 'text-accent' },
};

function ToastItem({
  id,
  type,
  message,
  duration,
  onRemove,
}: {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  onRemove: (id: string) => void;
}) {
  const m = meta[type];
  const Icon = m.icon;
  const [paused, setPaused] = useState(false);
  const [exiting, setExiting] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const startRef = useRef(Date.now());
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (duration <= 0) return;
    const tick = () => {
      if (paused) return;
      const elapsed = elapsedRef.current + (Date.now() - startRef.current);
      const pct = Math.min(1, elapsed / duration);
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${1 - pct})`;
      }
      if (pct >= 1) {
        setExiting(true);
        window.setTimeout(() => onRemove(id), 200);
      }
    };
    const interval = window.setInterval(tick, 50);
    return () => window.clearInterval(interval);
  }, [duration, id, onRemove, paused]);

  const handlePause = (pause: boolean) => {
    if (pause && !paused) {
      elapsedRef.current += Date.now() - startRef.current;
    } else if (!pause) {
      startRef.current = Date.now();
    }
    setPaused(pause);
  };

  return (
    <div
      className={`ds-toast group ${exiting ? 'ds-toast--exit' : ''}`}
      onMouseEnter={() => handlePause(true)}
      onMouseLeave={() => handlePause(false)}
    >
      <span aria-hidden className={`ds-toast__accent ${m.bar}`} />
      <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${m.iconCls}`} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-ds-sm font-semibold text-ds-primary leading-snug">{message}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-md p-1 text-ds-muted opacity-0 transition-opacity hover:text-ds-primary group-hover:opacity-100"
        aria-label={`Închide: ${message}`}
        onClick={() => {
          setExiting(true);
          window.setTimeout(() => onRemove(id), 200);
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {duration > 0 && (
        <div
          ref={progressRef}
          className={`ds-toast__progress ${m.iconCls}`}
          style={{ transform: 'scaleX(1)' }}
          aria-hidden
        />
      )}
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="ds-toast-stack" role="region" aria-label="Notificări" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          type={t.type}
          message={t.message}
          duration={t.duration ?? DURATION[t.type]}
          onRemove={remove}
        />
      ))}
    </div>
  );
}
