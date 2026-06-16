
















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
      className="fixed bottom-10 right-4 z-[1100] flex flex-col gap-2.5 pointer-events-none"
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
            className="pointer-events-auto group min-w-[280px] max-w-[420px] flex items-start gap-3 pl-0 pr-3.5 py-3 surface-glass rounded-xl shadow-[var(--elevation-3)] overflow-hidden text-left anim-slide-up transition-smooth duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[var(--elevation-4)] active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            aria-label={`Închide: ${t.message}`}
          >
            {}
            <span aria-hidden className={`w-1 self-stretch rounded-full ${m.bar}`} />
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
