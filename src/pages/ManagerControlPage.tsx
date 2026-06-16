







import { useEffect, useState } from 'react';
import { Crown, Flame, AlertTriangle, Clock, ArrowRight, Shield, Loader2, Check, CheckCircle2 } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { useEscClose } from '@/hooks/useEscClose';
import { useHandoffStore, type ProjectHandoff } from '@/store/handoffStore';
import { toast } from '@/store/toastStore';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue, AnimatedTabs } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge';
import type { StatusTone } from '@/lib/statusTokens';
import type { User } from '@/core/types';
import EmptyState from '@/components/EmptyState';
import Button from '@/components/ui/Button';
import ManagerEnhancements from '@/pages/manager/ManagerEnhancements';
import UserActivityLog from '@/pages/manager/UserActivityLog';

interface Anomaly {
  id: number;
  type: string;
  entity_type: string;
  entity_id: number;
  severity: string;
  title: string;
  description: string;
  suggestion: string | null;
  acknowledged: number;
  created_at: string;
}


const SEV_COLORS: Record<string, string> = {
  critical: 'bg-status-red/15 text-status-red border-status-red/40',
  high: 'bg-status-amber/15 text-status-amber border-status-amber/40',
  medium: 'bg-status-blue/15 text-status-blue border-status-blue/40',
  low: 'bg-surface-tertiary text-content-muted border-line',
};


const sevTone = (severity: string): StatusTone =>
  severity === 'critical' ? 'danger'
  : severity === 'high' ? 'warning'
  : severity === 'medium' ? 'info'
  : 'neutral';

export default function ManagerControlPage({ user }: { user: User | null }) {
  const role = (user?.role_name || '').toLowerCase();
  const isManager = role === 'admin' || role === 'manager';
  const [tab, setTab] = useState<'supervision' | 'activity'>('supervision');

  const pending = useHandoffStore(s => s.pending);
  const fetchPending = useHandoffStore(s => s.fetchPending);
  const setUrgentStore = useHandoffStore(s => s.setUrgent);
  const forceStore = useHandoffStore(s => s.force);

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loadingAnom, setLoadingAnom] = useState(true);
  const [forcing, setForcing] = useState<ProjectHandoff | null>(null);
  useEscClose(forcing != null, () => setForcing(null));
  const [forceReason, setForceReason] = useState('');
  const [forceConfirmed, setForceConfirmed] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  const loadAnomalies = async () => {
    setLoadingAnom(true);
    try {
      const a = await apiCommand<Anomaly[]>('get_anomalies');
      setAnomalies(Array.isArray(a) ? a : []);
    } catch { setAnomalies([]); } finally { setLoadingAnom(false); }
  };

  const detectAnomalies = async () => {
    try {
      await apiCommand('detect_anomalies');
      await loadAnomalies();
      toast.success('Anomalii detectate');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare detectare anomalii');
    }
  };

  const ackAnomaly = async (id: number) => {
    try {
      await apiCommand('acknowledge_anomaly', { id });
      setAnomalies(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare');
    }
  };

  useEffect(() => {
    void fetchPending(true);
    void loadAnomalies();
  }, [fetchPending]);

  const handleSetUrgent = async (h: ProjectHandoff) => {
    setActingId(h.id);
    try {
      await setUrgentStore(h.id, !h.is_urgent);
      toast.success(h.is_urgent ? 'Marcaj urgent eliminat' : 'Marcat urgent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare');
    } finally { setActingId(null); }
  };

  const submitForce = async () => {
    if (!forcing || !forceReason.trim() || !forceConfirmed) return;
    setActingId(forcing.id);
    try {
      await forceStore(forcing.id, forceReason.trim());
      toast.success('Tranziție forțată');
      setForcing(null); setForceReason(''); setForceConfirmed(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la forțare');
    } finally { setActingId(null); }
  };

  const overdue = pending.filter(h => new Date(h.sla_due_at).getTime() < Date.now());

  return (
    <Page className="mod-shell">
      {}
      <div className="px-5 pt-4 pb-1 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Birou control"
          icon={Crown}
          title="Birou de control"
          subtitle="Supraveghere predări, anomalii și activitatea utilizatorilor"
          actions={
            <div className="flex items-center gap-2">
              {isManager && (
                <AnimatedTabs
                  active={tab}
                  onChange={(id) => setTab(id as 'supervision' | 'activity')}
                  tabs={[
                    { id: 'supervision', label: 'Supraveghere' },
                    { id: 'activity', label: 'Activitate utilizatori' },
                  ]}
                />
              )}
              {tab === 'supervision' && <Button size="sm" onClick={detectAnomalies}>Rulează detecție</Button>}
            </div>
          }
        />
      </div>

      {


}
      {tab === 'supervision' && (
      <div className="p-5 space-y-5">

        {}
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini label="Predări pendinte"      value={pending.length} icon={Clock} />
          <KpiMini label="Predări blocate >24h"  value={overdue.length} icon={AlertTriangle} warn={overdue.length > 0} />
          <KpiMini label="Predări urgente"       value={pending.filter(h => h.is_urgent).length} icon={Flame} warn={pending.some(h => h.is_urgent)} />
          <KpiMini label="Anomalii nerezolvate"  value={anomalies.length} icon={Shield} warn={anomalies.some(a => a.severity === 'critical')} />
        </div>

        {}
        {overdue.length > 0 && (
          <Section title="Predări blocate >24h" subtitle="SLA depășit, intervenție Manager necesară">
            <div className="space-y-2">
              {overdue.map(h => (
                <HandoffRow key={h.id} handoff={h} onForce={(hh) => setForcing(hh)} onUrgent={handleSetUrgent} acting={actingId === h.id} />
              ))}
            </div>
          </Section>
        )}

        {}
        <Section title={`Toate predările pendinte (${pending.length})`} subtitle="Manager poate forța sau marca urgent">
          {pending.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nicio predare pendinte"
              body="Toate predările au fost confirmate. Vine ceva nou aici doar când o etapă nu e acceptată în 24h."
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {pending.map(h => (
                <HandoffRow key={h.id} handoff={h} onForce={(hh) => setForcing(hh)} onUrgent={handleSetUrgent} acting={actingId === h.id} />
              ))}
            </div>
          )}
        </Section>

        {}
        <Section title={`Anomalii detectate (${anomalies.length})`} subtitle="Sortate pe severitate">
          {loadingAnom ? (
            <Loader2 className="h-4 w-4 animate-spin text-content-muted" />
          ) : anomalies.length === 0 ? (
            <p className="text-xs text-content-muted py-4 text-center">Nicio anomalie. Apasă "Rulează detecție" pentru a verifică.</p>
          ) : (
            <div className="space-y-2">
              {anomalies.map(a => (
                <div
                  key={a.id}
                  className={`rounded border-l-4 px-3 py-2.5 ${SEV_COLORS[a.severity] ?? SEV_COLORS.low} bg-surface-secondary`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge tone={sevTone(a.severity)} label={a.severity} size="xs" uppercase />
                        <span className="text-sm font-medium text-content-primary">{a.title}</span>
                      </div>
                      <p className="mt-0.5 text-pm-xs text-content-secondary">{a.description}</p>
                      {a.suggestion && (
                        <p className="mt-1 text-pm-xs text-accent italic">→ {a.suggestion}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => ackAnomaly(a.id)}
                      title="Marcaj rezolvat"
                      className="shrink-0 rounded p-1 text-content-muted hover:bg-surface-tertiary hover:text-status-green"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {
}
        <ManagerEnhancements
          anomalies={anomalies}
          handoffs={pending}
          onBulkAck={async (ids) => {
            await Promise.all(ids.map(id => apiCommand('acknowledge_anomaly', { id }).catch(() => {})));
            await loadAnomalies();
          }}
        />
      </div>
      )}

      {tab === 'activity' && <UserActivityLog />}

      {}
      {forcing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setForcing(null)}>
          <div className="bg-surface-secondary rounded-lg border-2 border-status-red shadow-xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-status-red mb-1 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Forțare tranziție
            </h3>
            <p className="text-xs text-content-muted mb-3">
              Forțezi tranziția pentru proiectul <strong>{forcing.project_name}</strong> de la{' '}
              <strong>{forcing.from_stage_name}</strong> la <strong>{forcing.to_stage_name}</strong>.
              Acțiunea va fi logată în istoric ca "forced by Manager".
            </p>
            <label className="block text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-1">
              Motiv (obligatoriu)
            </label>
            <textarea
              value={forceReason}
              onChange={e => setForceReason(e.target.value)}
              rows={3}
              placeholder="Ex: deadline urgent, rolul destinatar nedisponibil, decizie executivă..."
              className="w-full rounded border border-line bg-surface-primary px-3 py-2 text-xs text-content-primary"
              autoFocus
            />
            <label className="mt-3 flex items-center gap-2 text-xs text-content-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={forceConfirmed}
                onChange={e => setForceConfirmed(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-accent)]"
              />
              Confirm că vreau să forțez tranziția în ciuda lipsei de accept
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setForcing(null); setForceReason(''); setForceConfirmed(false); }}
                className="h-8 px-3 rounded border border-line text-xs font-semibold text-content-secondary hover:bg-surface-tertiary"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={submitForce}
                disabled={!forceReason.trim() || !forceConfirmed || actingId !== null}
                className="h-8 px-4 rounded bg-status-red text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                {actingId !== null ? 'Se forțează...' : 'Forțează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-content-secondary">{title}</h2>
        {subtitle && <p className="text-pm-2xs text-content-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function HandoffRow({ handoff, onForce, onUrgent, acting }: {
  handoff: ProjectHandoff;
  onForce: (h: ProjectHandoff) => void;
  onUrgent: (h: ProjectHandoff) => void;
  acting: boolean;
}) {
  const overdue = new Date(handoff.sla_due_at).getTime() < Date.now();
  return (
    <div className={`rounded border px-3 py-2.5 ${handoff.is_urgent ? 'border-status-red/40 bg-status-red/5' : overdue ? 'border-status-amber/40 bg-status-amber/5' : 'border-line bg-surface-secondary'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {handoff.is_urgent && (
              <StatusBadge tone="danger" label="Urgent" size="xs" uppercase />
            )}
            <span className="text-sm font-medium text-content-primary truncate">{handoff.project_name}</span>
            <span className="text-pm-2xs text-content-muted">→ {handoff.to_role}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-pm-xs text-content-muted">
            <span className="truncate">{handoff.from_stage_name ?? '—'}</span>
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span className="truncate font-medium">{handoff.to_stage_name}</span>
            <span className="ml-2 text-content-muted">de la {handoff.from_user_name ?? '—'}</span>
            <span className="ml-auto inline-flex items-center gap-0.5 whitespace-nowrap">
              <Clock className="h-3 w-3" />
              SLA: {new Date(handoff.sla_due_at).toLocaleString('ro-RO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
              {overdue && <AlertTriangle className="h-3 w-3 text-status-amber ml-1" />}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onUrgent(handoff)}
            disabled={acting}
            title={handoff.is_urgent ? 'Elimină urgent' : 'Marchează urgent'}
            className={`h-7 px-2 rounded text-pm-xs font-semibold transition-colors flex items-center gap-1 ${
              handoff.is_urgent
                ? 'bg-status-red/20 text-status-red hover:bg-status-red/30'
                : 'bg-status-amber/15 text-status-amber hover:bg-status-amber/25'
            }`}
          >
            <Flame className="h-3 w-3" />
            {handoff.is_urgent ? 'Anulează urgent' : 'Marchez urgent'}
          </button>
          <button
            type="button"
            onClick={() => onForce(handoff)}
            disabled={acting}
            title="Forțează tranziție"
            className="h-7 px-2 rounded bg-status-red text-white text-pm-xs font-semibold hover:opacity-90 disabled:opacity-40"
          >
            Forțează
          </button>
        </div>
      </div>
    </div>
  );
}




function KpiMini({ icon: Icon, label, value, warn, format }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean; format?: (n: number) => string;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} format={format} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}
