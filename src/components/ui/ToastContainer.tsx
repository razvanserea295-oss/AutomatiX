/**
 * ToastContainer — premium toast renderer wired to the global toastStore.
 * Mount once near the root of the app; every `toast.success/error/...` call
 * pushes a toast that animates in from below the bottom-right of the
 * viewport.
 *
 * Visual:
 *   - Glass surface with backdrop-blur
 *   - Color-coded left accent bar (semantic: success/error/warning/info)
 *   - Iconă status + mesaj + close button
 *   - Slide-up + fade-in animation
 *   - Auto-dismiss based on duration in store
 *   - Click anywhere on toast → dismiss
 *
 * Stacking: maximum 3 visible (enforced by toastStore). Newest at the bottom.
 */
import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, type ToastType } from '@/store/toastStore';

const meta: Record<ToastType, { icon: typeof CheckCircle2; bar: string; iconCls: string }> = {
  success: { icon: CheckCircle2,  bar: 'bg-status-green', iconCls: 'text-status-green' },
  error:   { icon: AlertCircle,   bar: 'bg-status-red',   iconCls: 'text-status-red' },
  warning: { icon: AlertTriangle, bar: 'bg-status-amber', iconCls: 'text-status-amber' },
  info:    { icon: Info,          bar: 'bg-accent',       iconCls: 'text-accent' },
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.removeToast);

  
  
  useEffect(() => {
    const onVis = () => {  };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-10 right-4 z-[1100] flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Notificări"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const m = meta[t.type];
        const Icon = m.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => remove(t.id)}
            className="pointer-events-auto group min-w-[280px] max-w-[420px] flex items-start gap-3 pl-0 pr-3 py-2.5 surface-glass rounded-lg overflow-hidden text-left anim-slide-up hover:brightness-105 transition-smooth duration-150 active:scale-[0.99]"
            aria-label={`Închide: ${t.message}`}
          >
            {}
            <span aria-hidden className={`w-1 self-stretch ${m.bar}`} />
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${m.iconCls}`} aria-hidden />
            <p className="flex-1 text-pm-base text-content-primary leading-snug">
              {t.message}
            </p>
            <X className="h-3.5 w-3.5 text-content-muted/60 group-hover:text-content-primary transition-colors mt-0.5 shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
