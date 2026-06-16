







import { useEffect, useState } from 'react';
import {
  Factory, ArrowRight, Inbox, CheckCircle2, XCircle, Clock, AlertTriangle, FileText, Sparkles,
} from 'lucide-react';
import type { User } from '@/core/types';
import { useHandoffStore, type ProjectHandoff } from '@/store/handoffStore';
import { toast } from '@/store/toastStore';
import {
  Card, ListRow, RowTitle, RowMeta, Tag, Divider, EmptyState, CenterSpinner,
  Sheet, MButton, TextArea, timeAgo, fmtDate, type Tone,
} from './kit';

function slaState(h: ProjectHandoff): { tone: Tone; label: string } {
  const due = new Date(h.sla_due_at).getTime();
  if (h.is_urgent) return { tone: 'red', label: 'Urgent' };
  if (!Number.isNaN(due) && due < Date.now()) return { tone: 'amber', label: 'SLA depășit' };
  return { tone: 'blue', label: 'În termen' };
}

export default function ProductionTab({ refreshKey }: { user: User; refreshKey: number }) {
  const pending = useHandoffStore(s => s.pending);
  const loaded = useHandoffStore(s => s.loaded);
  const loading = useHandoffStore(s => s.loading);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    const stop = useHandoffStore.getState().startPolling(5000);
    return stop;
  }, []);
  useEffect(() => { if (refreshKey > 0) void useHandoffStore.getState().fetchPending(true); }, [refreshKey]);

  
  const sorted = [...pending].sort((a, b) => {
    if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
    return new Date(a.sla_due_at).getTime() - new Date(b.sla_due_at).getTime();
  });

  const openHandoff = pending.find(h => h.id === openId) || null;

  return (
    <div className="pt-3">
      <div className="px-3.5">
        <p className="px-1 text-pm-2xl font-semibold text-content-primary leading-tight">Predări</p>
        <p className="px-1 text-pm-sm text-content-muted">Sarcini care așteaptă confirmarea ta</p>
      </div>

      <div className="px-3.5 mt-3">
        {!loaded && loading ? (
          <CenterSpinner label="Se încarcă predările…" />
        ) : sorted.length === 0 ? (
          <Card><EmptyState icon={Inbox} title="Nicio predare pendinte" hint="Coada ta e goală. ✓" /></Card>
        ) : (
          <Card className="overflow-hidden">
            {sorted.map((h, i) => {
              const sla = slaState(h);
              return (
                <div key={h.id}>
                  {i > 0 && <Divider />}
                  <ListRow onClick={() => setOpenId(h.id)} accent={sla.tone}>
                    <div className="flex items-center gap-2">
                      <RowTitle>{h.project_name}</RowTitle>
                    </div>
                    <RowMeta>
                      <Tag tone={sla.tone}>{sla.label}</Tag>
                      <span className="inline-flex items-center gap-1 truncate">
                        {h.from_stage_name || '—'}
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        {h.to_stage_name}
                      </span>
                    </RowMeta>
                    <RowMeta>
                      <Clock className="h-3 w-3" /> termen {fmtDate(h.sla_due_at)}
                      <span>· {timeAgo(h.created_at)}</span>
                    </RowMeta>
                  </ListRow>
                </div>
              );
            })}
          </Card>
        )}
        <div className="h-2" />
      </div>

      <HandoffSheet handoff={openHandoff} onClose={() => setOpenId(null)} />
    </div>
  );
}

function HandoffSheet({ handoff, onClose }: { handoff: ProjectHandoff | null; onClose: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setRejecting(false); setReason(''); }, [handoff?.id]);

  if (!handoff) return null;
  const sla = slaState(handoff);

  const accept = async () => {
    setBusy(true);
    try {
      await useHandoffStore.getState().accept(handoff.id);
      toast.success('Predare acceptată');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally { setBusy(false); }
  };

  const reject = async () => {
    const r = reason.trim();
    if (!r) { toast.error('Adaugă un motiv'); return; }
    setBusy(true);
    try {
      await useHandoffStore.getState().reject(handoff.id, r);
      toast.success('Predare respinsă');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally { setBusy(false); }
  };

  return (
    <Sheet
      open={!!handoff}
      onClose={onClose}
      title={handoff.project_name}
      subtitle={<span className="inline-flex items-center gap-1.5">{handoff.from_stage_name || '—'} <ArrowRight className="h-3.5 w-3.5" /> {handoff.to_stage_name}</span>}
      footer={
        rejecting ? (
          <div className="space-y-2">
            <TextArea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivul respingerii…" rows={2} />
            <div className="flex gap-2">
              <MButton variant="ghost" full onClick={() => setRejecting(false)}>Înapoi</MButton>
              <MButton variant="danger" full icon={XCircle} busy={busy} onClick={reject}>Confirmă respingerea</MButton>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <MButton variant="danger" full icon={XCircle} onClick={() => setRejecting(true)}>Respinge</MButton>
            <MButton variant="primary" full icon={CheckCircle2} busy={busy} onClick={accept}>Acceptă</MButton>
          </div>
        )
      }
    >
      <div className="space-y-3">
        <div className={`flex items-center gap-2 rounded-lg p-3 ${sla.tone === 'red' ? 'bg-status-red/10' : sla.tone === 'amber' ? 'bg-status-amber/10' : 'bg-surface-secondary'}`}>
          {handoff.is_urgent
            ? <AlertTriangle className="h-5 w-5 text-status-red shrink-0" />
            : <Clock className="h-5 w-5 text-content-muted shrink-0" />}
          <div>
            <Tag tone={sla.tone}>{sla.label}</Tag>
            <div className="mt-1 text-pm-sm text-content-secondary">Termen SLA: {fmtDate(handoff.sla_due_at)}</div>
          </div>
        </div>

        <Meta icon={Factory} label="Etapă" value={`${handoff.from_stage_name || '—'} → ${handoff.to_stage_name}`} />
        {handoff.from_user_name && <Meta icon={FileText} label="Predă" value={handoff.from_user_name} />}

        {handoff.handoff_notes && <Block title="Note de predare" body={handoff.handoff_notes} />}
        {handoff.ai_summary && <Block title="Rezumat" body={handoff.ai_summary} icon={Sparkles} />}
      </div>
    </Sheet>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Factory; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 shrink-0 text-content-muted mt-0.5" />
      <span className="text-pm-2xs uppercase tracking-wide text-content-muted w-16 shrink-0 mt-0.5">{label}</span>
      <span className="text-pm-md text-content-primary break-words">{value}</span>
    </div>
  );
}

function Block({ title, body, icon: Icon }: { title: string; body: string; icon?: typeof Factory }) {
  return (
    <div className="rounded-lg border border-line bg-surface-secondary p-3">
      <div className="flex items-center gap-1.5 text-pm-2xs uppercase tracking-wide text-content-muted mb-1">
        {Icon && <Icon className="h-3.5 w-3.5" />}{title}
      </div>
      <p className="text-pm-md text-content-primary whitespace-pre-wrap break-words">{body}</p>
    </div>
  );
}
