

import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Flame, AlertTriangle, Clock, ArrowRight, Shield, Loader2, Check, CheckCircle2 } from '@/icons';
import { apiCommand } from '@/api/commands';
import { useEscClose } from '@/hooks/useEscClose';
import { useHandoffStore, type ProjectHandoff } from '@/store/handoffStore';
import { toast } from '@/store/toastStore';
import type { StatusTone } from '@/lib/statusTokens';
import type { User } from '@/core/types';
import ManagerEnhancements from '@/pages/manager/ManagerEnhancements';
import UserActivityLog from '@/pages/manager/UserActivityLog';

import { PageChrome, DashboardLayout, PAGE_GRID_12 } from '@/app-ui';
import Card, { CardHeader, CardBody } from '@/redesign/ui/Card';
import Page from '@/redesign/ui/Page';
import KpiCard from '@/redesign/ui/KpiCard';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import StatusBadge from '@/redesign/ui/StatusBadge';
import AnimatedTabs from '@/redesign/ui/AnimatedTabs';
import EmptyState from '@/redesign/ui/EmptyState';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';

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
  const _isManager = role === 'admin' || role === 'manager';
  void _isManager;
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

  const openForce = (h: ProjectHandoff) => {
    startMorphTransition(() => flushSync(() => setForcing(h)), { dir: 'forward' });
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

  const kpiStrip = tab === 'supervision' ? (
    <Page.Kpis cols={4} className="shrink-0">
      <KpiCard
        vtName={vtName('mgr-kpi', 'pending')}
        label="Predări pendinte"
        value={pending.length}
        icon={Clock}
        iconColor="text-accent"
      />
      <KpiCard
        vtName={vtName('mgr-kpi', 'overdue')}
        label="Predări blocate >24h"
        value={overdue.length}
        icon={AlertTriangle}
        iconColor={overdue.length > 0 ? 'text-status-red' : 'text-content-muted'}
      />
      <KpiCard
        vtName={vtName('mgr-kpi', 'urgent')}
        label="Predări urgente"
        value={pending.filter(h => h.is_urgent).length}
        icon={Flame}
        iconColor={pending.some(h => h.is_urgent) ? 'text-status-amber' : 'text-content-muted'}
      />
      <KpiCard
        vtName={vtName('mgr-kpi', 'anomalies')}
        label="Anomalii nerezolvate"
        value={anomalies.length}
        icon={Shield}
        iconColor={anomalies.some(a => a.severity === 'critical') ? 'text-status-red' : 'text-content-muted'}
      />
    </Page.Kpis>
  ) : undefined;

  return (
    <>
      <DashboardLayout
        chrome={(
          <PageChrome
            actions={tab === 'supervision' ? (
              <Button variant="secondary" size="md" onClick={() => void detectAnomalies()}>
                Detectează anomalii
              </Button>
            ) : undefined}
            toolbar={
              <AnimatedTabs
                active={tab}
                onChange={(id) => setTab(id as 'supervision' | 'activity')}
                tabs={[
                  { id: 'supervision', label: 'Supraveghere' },
                  { id: 'activity', label: 'Activitate' },
                ]}
              />
            }
          />
        )}
      kpis={kpiStrip}
        bodyClassName="overflow-y-auto"
        contentClassName="max-w-[var(--page-max-wide)] mx-auto w-full"
      >
      {tab === 'supervision' && (
        <>
          <div className={PAGE_GRID_12}>
            <Card className="xl:col-span-8 flex flex-col max-h-[55vh]">
              <CardHeader
                className="shrink-0"
                title="Predări în supraveghere"
                subtitle="Manager poate forța tranziții sau marca urgent"
                actions={<StatusBadge tone="neutral" label={`${pending.length} pendinte`} size="sm" />}
              />
              <CardBody className="flex-1 min-h-0 overflow-y-auto space-y-4">
                {overdue.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-pm-2xs font-bold uppercase tracking-wide text-status-red">Predări blocate &gt;24h</h3>
                      <StatusBadge tone="danger" label={String(overdue.length)} size="xs" />
                      <span className="text-pm-2xs text-content-muted">SLA depășit, intervenție Manager necesară</span>
                    </div>
                    <div key={`overdue-${overdue.length}`} className="space-y-2 stagger-in">
                      {overdue.map(h => (
                        <HandoffRow key={h.id} handoff={h} onForce={openForce} onUrgent={handleSetUrgent} acting={actingId === h.id} />
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-pm-2xs font-bold uppercase tracking-wide text-content-secondary">Toate predările pendinte</h3>
                    <StatusBadge tone="neutral" label={String(pending.length)} size="xs" />
                  </div>
                  {pending.length === 0 ? (
                    <EmptyState
                      icon={CheckCircle2}
                      title="Nicio predare pendinte"
                      description="Toate predările au fost confirmate. Vine ceva nou aici doar când o etapă nu e acceptată în 24h."
                    />
                  ) : (
                    <div key={`pending-${pending.length}`} className="space-y-2 stagger-in">
                      {pending.map(h => (
                        <HandoffRow key={h.id} handoff={h} onForce={openForce} onUrgent={handleSetUrgent} acting={actingId === h.id} />
                      ))}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
            <Card className="xl:col-span-4 flex flex-col max-h-[55vh]">
              <CardHeader
                className="shrink-0"
                title="Anomalii detectate"
                subtitle="Sortate pe severitate"
                actions={<StatusBadge tone={anomalies.some(a => a.severity === 'critical') ? 'danger' : 'neutral'} label={String(anomalies.length)} size="sm" />}
              />
              <CardBody className="flex-1 min-h-0 overflow-y-auto">
                {loadingAnom ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-content-muted" />
                  </div>
                ) : anomalies.length === 0 ? (
                  <EmptyState
                    icon={Shield}
                    title="Nicio anomalie"
                    description='Apasă "Rulează detecție" pentru a verifica.'
                  />
                ) : (
                  <div key={`anom-${anomalies.length}`} className="space-y-2 stagger-in">
                    {anomalies.map(a => (
                      <div
                        key={a.id}
                        className={`rounded-xl border-l-4 px-3 py-3 transition-smooth duration-150 hover:shadow-[var(--elevation-2)] ${SEV_COLORS[a.severity] ?? SEV_COLORS.low} bg-surface-secondary`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <StatusBadge tone={sevTone(a.severity)} label={a.severity} size="xs" uppercase />
                              <span className="text-pm-sm font-medium text-content-primary">{a.title}</span>
                            </div>
                            <p className="mt-0.5 text-pm-xs text-content-secondary">{a.description}</p>
                            {a.suggestion && (
                              <p className="mt-1 text-pm-xs text-accent italic">→ {a.suggestion}</p>
                            )}
                          </div>
                          <IconButton
                            intent="success"
                            size="sm"
                            onClick={() => ackAnomaly(a.id)}
                            title="Marcaj rezolvat"
                            aria-label="Marcaj rezolvat"
                            className="shrink-0"
                          >
                            <Check />
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
          <div className="shrink-0">
            <ManagerEnhancements
              anomalies={anomalies}
              handoffs={pending}
              onBulkAck={async (ids) => {
                await Promise.all(ids.map(id => apiCommand('acknowledge_anomaly', { id }).catch(() => {})));
                await loadAnomalies();
              }}
            />
          </div>
        </>
      )}

      {tab === 'activity' && (
        <UserActivityLog />
      )}
      </DashboardLayout>

      {forcing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 anim-fade-in" onClick={() => setForcing(null)}>
          <div
            className="bg-surface-elevated rounded-2xl border-2 border-status-red shadow-[var(--elevation-4)] w-full max-w-lg p-6 anim-scale-in vt-morph"
            style={{ viewTransitionName: vtName('handoff', forcing.id) }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-pm-base font-semibold text-status-red mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Forțare tranziție
            </h3>
            <p className="text-pm-xs text-content-muted mb-3">
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
              className="w-full rounded-xl border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]"
              autoFocus
            />
            <label className="mt-3 flex items-center gap-2 text-pm-xs text-content-secondary cursor-pointer transition-smooth duration-150 hover:text-content-primary">
              <input
                type="checkbox"
                checked={forceConfirmed}
                onChange={e => setForceConfirmed(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-[var(--color-accent)] transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
              />
              Confirm că vreau să forțez tranziția în ciuda lipsei de accept
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setForcing(null); setForceReason(''); setForceConfirmed(false); }}
              >
                Anulează
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={submitForce}
                disabled={!forceReason.trim() || !forceConfirmed || actingId !== null}
              >
                {actingId !== null ? 'Se forțează...' : 'Forțează'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
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
    <div
      className={`rounded-xl border px-3 py-3 vt-morph transition-smooth duration-150 hover:shadow-[var(--elevation-2)] ${handoff.is_urgent ? 'border-status-red/40 bg-status-red/5' : overdue ? 'border-status-amber/40 bg-status-amber/5' : 'border-line bg-surface-secondary'}`}
      style={{ viewTransitionName: vtName('handoff', handoff.id) }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {handoff.is_urgent && (
              <StatusBadge tone="danger" label="Urgent" size="xs" uppercase />
            )}
            <span className="text-pm-sm font-medium text-content-primary truncate">{handoff.project_name}</span>
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
            aria-label={handoff.is_urgent ? 'Elimină marcaj urgent' : 'Marchează urgent'}
            className={`h-7 px-2 rounded-lg text-pm-xs font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] motion-reduce:transition-none disabled:opacity-40 disabled:pointer-events-none ${
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
            aria-label="Forțează tranziție"
            className="h-7 px-2 rounded-lg bg-status-red text-white text-pm-xs font-semibold inline-flex items-center justify-center whitespace-nowrap transition-smooth duration-150 hover:bg-status-red/90 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] motion-reduce:transition-none disabled:opacity-40 disabled:pointer-events-none"
          >
            Forțează
          </button>
        </div>
      </div>
    </div>
  );
}
