







import { useEffect, useState } from 'react';
import { Inbox, Check, X, AlertTriangle, Loader2, Clock, ArrowRight, Flame } from 'lucide-react';
import { useHandoffStore, type ProjectHandoff } from '@/store/handoffStore';
import { toast } from '@/store/toastStore';

const ROLE_LABEL: Record<string, string> = {
  sales: 'Vânzări',
  project_manager: 'Proiectare',
  hall_foreman: 'Șef Hală',
  manager: 'Manager',
  admin: 'Admin',
  finance: 'Contabilitate',
  service: 'Service',
  worker: 'Muncitor',
  logistics: 'Logistică',
  user: 'Utilizator',
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'acum';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}z`;
}

function isPastSla(sla: string): boolean {
  const t = new Date(sla).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

export default function InboxWidget({ onOpenProject }: { onOpenProject?: (id: number) => void }) {
  const pending = useHandoffStore(s => s.pending);
  const loading = useHandoffStore(s => s.loading);
  const fetchPending = useHandoffStore(s => s.fetchPending);
  const acceptHandoff = useHandoffStore(s => s.accept);
  const rejectHandoff = useHandoffStore(s => s.reject);

  const [actingId, setActingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  
  
  useEffect(() => { void fetchPending(true); }, [fetchPending]);

  const handleAccept = async (h: ProjectHandoff) => {
    setActingId(h.id);
    try {
      await acceptHandoff(h.id);
      toast.success(`Predare acceptată: ${h.project_name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la acceptare');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async () => {
    if (rejectingId == null) return;
    if (!rejectReason.trim()) {
      toast.error('Motivul respingerii e obligatoriu');
      return;
    }
    setActingId(rejectingId);
    try {
      await rejectHandoff(rejectingId, rejectReason.trim());
      toast.success('Predare respinsă');
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la respingere');
    } finally {
      setActingId(null);
    }
  };

  
  const sorted = [...pending].sort((a, b) => {
    if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
    const aOver = isPastSla(a.sla_due_at), bOver = isPastSla(b.sla_due_at);
    if (aOver !== bOver) return aOver ? -1 : 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <div className="bg-surface-secondary border-b border-line p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted flex items-center gap-1.5">
          <Inbox className="h-3.5 w-3.5" />
          Inbox — {pending.length} {pending.length === 1 ? 'predare' : 'predări'}
        </h2>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-content-muted" />}
          <span className="inline-flex items-center gap-1 text-pm-2xs text-status-green">
            <span className="h-1.5 w-1.5 rounded-full bg-status-green animate-pulse" />
            live
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="py-4 text-center text-xs text-content-muted">
          {loading ? 'Se încarcă...' : 'Nicio predare pendinte. ✓'}
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map(h => {
            const overdue = isPastSla(h.sla_due_at);
            return (
              <div
                key={h.id}
                className={`border px-3 py-2.5 transition-colors ${
                  h.is_urgent
                    ? 'border-status-red/40 bg-status-red/5'
                    : overdue
                      ? 'border-status-amber/40 bg-status-amber/5'
                      : 'border-line bg-surface-primary'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {h.is_urgent && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0 rounded bg-status-red/20 text-status-red text-pm-2xs font-bold uppercase">
                          <Flame className="h-2.5 w-2.5" /> Urgent
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenProject?.(h.project_id)}
                        className="text-sm font-medium text-content-primary hover:text-accent text-left truncate"
                      >
                        {h.project_name}
                      </button>
                      <span className="text-pm-2xs text-content-muted whitespace-nowrap">
                        {ROLE_LABEL[h.to_role] ?? h.to_role}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-pm-xs text-content-muted">
                      <span className="truncate">{h.from_stage_name ?? '—'}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="truncate font-medium text-content-secondary">{h.to_stage_name}</span>
                      <span className="ml-auto inline-flex items-center gap-0.5 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {timeAgo(h.created_at)}
                        {overdue && <AlertTriangle className="h-3 w-3 text-status-amber ml-1" />}
                      </span>
                    </div>
                    {h.handoff_notes && (
                      <p className="mt-1 text-pm-xs text-content-secondary line-clamp-2 italic">
                        "{h.handoff_notes}"
                      </p>
                    )}
                    {h.from_user_name && (
                      <p className="mt-0.5 text-pm-2xs text-content-muted">
                        de la {h.from_user_name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAccept(h)}
                      disabled={actingId === h.id}
                      title="Acceptă predarea"
                      className="h-7 px-2 rounded bg-status-green/15 text-status-green text-pm-xs font-semibold hover:bg-status-green/25 disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      {actingId === h.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectingId(h.id); setRejectReason(''); }}
                      disabled={actingId === h.id}
                      title="Respinge predarea"
                      className="h-7 px-2 rounded bg-status-red/10 text-status-red text-pm-xs font-semibold hover:bg-status-red/20 disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Respinge
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {}
      {rejectingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectingId(null)}>
          <div className="bg-surface-secondary rounded-lg border border-line shadow-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-content-primary mb-3">Motiv respingere</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Ex: Lipsește cota X la piesa Y; clarifică zincarea pe predozare; etc."
              rows={4}
              className="w-full rounded border border-line bg-surface-primary px-3 py-2 text-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
              autoFocus
            />
            <p className="mt-2 text-pm-2xs text-content-muted">
              Proiectul va reveni la etapa anterioară pentru ca trimiterea să corecteze.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                className="h-8 px-3 rounded border border-line text-xs font-semibold text-content-secondary hover:bg-surface-tertiary"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectReason.trim() || actingId !== null}
                className="h-8 px-4 rounded bg-status-red text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {actingId !== null ? 'Se respinge...' : 'Respinge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
