














import { useEffect, useState, useCallback, useRef } from 'react';
import { Megaphone, AlertTriangle, AlertOctagon, X } from '@/icons';
import { apiCommand } from '@/api/commands';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

interface AdminBroadcast {
  id: number;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'important';
  created_by_user_id: number;
  created_by_name: string | null;
  created_at: string;
  expires_at: string | null;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; 

const SEVERITY_STYLES: Record<AdminBroadcast['severity'], {
  icon: typeof Megaphone;
  ring: string;
  iconBg: string;
  iconColor: string;
  label: string;
}> = {
  info: {
    icon: Megaphone,
    ring: 'border-accent/40',
    iconBg: 'bg-accent/15',
    iconColor: 'text-accent',
    label: 'Informare',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'border-status-amber/40',
    iconBg: 'bg-status-amber/15',
    iconColor: 'text-status-amber',
    label: 'Atenție',
  },
  important: {
    icon: AlertOctagon,
    ring: 'border-status-red/40',
    iconBg: 'bg-status-red/15',
    iconColor: 'text-status-red',
    label: 'Important',
  },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ro-RO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function BroadcastPopup(): JSX.Element | null {
  const user = useAuthStore(s => s.user);
  const [queue, setQueue] = useState<AdminBroadcast[]>([]);
  const [dismissing, setDismissing] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPending = useCallback(async () => {
    if (!user) return;
    try {
      const list = await apiCommand<AdminBroadcast[]>('get_pending_broadcasts');
      
      
      setQueue(prev => {
        if (prev.length === list.length && prev.every((b, i) => b.id === list[i].id)) return prev;
        return list;
      });
    } catch (err) {
      
      
      
      console.debug('[BroadcastPopup] poll failed:', err);
    }
  }, [user]);

  
  
  useEffect(() => {
    if (!user) {
      setQueue([]);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }
    void loadPending();
    pollTimerRef.current = setInterval(() => { void loadPending(); }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [user, loadPending]);

  const current = queue[0] ?? null;

  const handleDismiss = useCallback(async () => {
    if (!current || dismissing) return;
    setDismissing(true);
    try {
      await apiCommand('dismiss_broadcast', { broadcast_id: current.id });
      setQueue(prev => prev.slice(1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la marcare ca citit');
    } finally {
      setDismissing(false);
    }
  }, [current, dismissing]);

  if (!current) return null;

  const sev = SEVERITY_STYLES[current.severity] ?? SEVERITY_STYLES.info;
  const Icon = sev.icon;

  return (
    <div
      
      
      
      
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 anim-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="broadcast-title"
    >
      <div className={`relative w-full max-w-lg rounded-lg border ${sev.ring} bg-surface-secondary shadow-2xl overflow-hidden anim-scale-in`}>
        {}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-line/60">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${sev.iconBg} ${sev.iconColor}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-pm-2xs font-bold uppercase tracking-wider text-content-muted mb-0.5">
              {sev.label}
              {queue.length > 1 && (
                <span className="ml-2 normal-case font-medium text-content-muted">
                  · {queue.length} mesaje
                </span>
              )}
            </p>
            <h2 id="broadcast-title" className="text-base font-semibold text-content-primary leading-snug">
              {current.title}
            </h2>
          </div>
        </div>

        {}
        <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
          <p className="text-sm text-content-primary whitespace-pre-wrap leading-relaxed">
            {current.body}
          </p>
          {current.created_by_name && (
            <p className="mt-4 text-pm-xs text-content-muted">
              — {current.created_by_name} · {formatDate(current.created_at)}
            </p>
          )}
        </div>

        {}
        <div className="flex items-center justify-end gap-2 border-t border-line/60 px-5 py-3 bg-surface-primary/40">
          <button
            type="button"
            autoFocus
            onClick={handleDismiss}
            disabled={dismissing}
            className="rounded px-4 py-1.5 bg-accent text-[var(--color-on-accent)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            {queue.length > 1 ? 'Am înțeles · Următorul' : 'Am înțeles'}
          </button>
        </div>
      </div>
    </div>
  );
}
