import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Clock, Flame, Shield } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useHandoffStore, type ProjectHandoff } from '@/store/handoffStore';
import { formatDateTimeRo } from '@/lib/format';
import { Page, PageHeader, PageKpis, PageBody } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { KPICard } from '@/v2/analytics';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Card } from '@/v2/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Label } from '@/v2/components/ui/label';
import { Textarea } from '@/v2/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/v2/components/ui/tabs';
import UserActivityPanel from '@/v2/pages/admin/UserActivityPanel';

interface Anomaly {
  id: number;
  severity: string;
  title: string;
  description: string;
  suggestion: string | null;
}

function HandoffRow({
  handoff,
  onForce,
  onUrgent,
  acting,
}: {
  handoff: ProjectHandoff;
  onForce: (h: ProjectHandoff) => void;
  onUrgent: (h: ProjectHandoff) => void;
  acting: boolean;
}) {
  const overdue = new Date(handoff.sla_due_at).getTime() < Date.now();

  return (
    <Card className="shadow-none">
      <div className="density-list-item flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{handoff.project_name}</p>
            {handoff.is_urgent && <StatusBadge status="urgent" />}
            {overdue && <StatusBadge status="blocat" />}
          </div>
          <p className="text-sm text-muted-foreground">
            {handoff.from_stage_name || '—'} → {handoff.to_stage_name}
          </p>
          <p className="text-xs text-muted-foreground">
            De la {handoff.from_user_name || '—'} · SLA {formatDateTimeRo(handoff.sla_due_at)}
          </p>
          {handoff.handoff_notes && (
            <p className="text-xs text-muted-foreground italic">{handoff.handoff_notes}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" disabled={acting} onClick={() => onUrgent(handoff)}>
            <Flame className="mr-1 h-3.5 w-3.5" />
            {handoff.is_urgent ? 'Nu urgent' : 'Urgent'}
          </Button>
          <Button size="sm" variant="destructive" disabled={acting} onClick={() => onForce(handoff)}>
            Forțează
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function ManagerControlPage() {
  const [tab, setTab] = useState<'supervision' | 'activity'>('supervision');
  const pending = useHandoffStore((s) => s.pending);
  const fetchPending = useHandoffStore((s) => s.fetchPending);
  const setUrgentStore = useHandoffStore((s) => s.setUrgent);
  const forceStore = useHandoffStore((s) => s.force);
  const loadingHandoffs = useHandoffStore((s) => s.loading);

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loadingAnom, setLoadingAnom] = useState(true);
  const [forcing, setForcing] = useState<ProjectHandoff | null>(null);
  const [forceReason, setForceReason] = useState('');
  const [actingId, setActingId] = useState<number | null>(null);

  const loadAnomalies = useCallback(async () => {
    setLoadingAnom(true);
    try {
      const a = await apiCommand<Anomaly[]>('get_anomalies');
      setAnomalies(Array.isArray(a) ? a : []);
    } catch {
      setAnomalies([]);
    } finally {
      setLoadingAnom(false);
    }
  }, []);

  useEffect(() => {
    void fetchPending(true);
    void loadAnomalies();
  }, [fetchPending, loadAnomalies]);

  const overdue = pending.filter((h) => new Date(h.sla_due_at).getTime() < Date.now());

  const detectAnomalies = async () => {
    try {
      await apiCommand('detect_anomalies');
      await loadAnomalies();
      toast.success('Anomalii detectate');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare detectare');
    }
  };

  const ackAnomaly = async (id: number) => {
    try {
      await apiCommand('acknowledge_anomaly', { id });
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const handleSetUrgent = async (h: ProjectHandoff) => {
    setActingId(h.id);
    try {
      await setUrgentStore(h.id, !h.is_urgent);
      toast.success(h.is_urgent ? 'Marcaj urgent eliminat' : 'Marcat urgent');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setActingId(null);
    }
  };

  const submitForce = async () => {
    if (!forcing || !forceReason.trim()) return;
    setActingId(forcing.id);
    try {
      await forceStore(forcing.id, forceReason.trim());
      toast.success('Tranziție forțată');
      setForcing(null);
      setForceReason('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare la forțare');
    } finally {
      setActingId(null);
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Birou de control"
        description="Predări în așteptare, anomalii și supraveghere SLA"
        actions={
          tab === 'supervision' ? (
            <Button size="sm" variant="outline" onClick={() => void detectAnomalies()}>
              Detectează anomalii
            </Button>
          ) : undefined
        }
      />

      <PageBody>
        <Tabs className="shrink-0">
          <TabsList>
            <TabsTrigger active={tab === 'supervision'} onClick={() => setTab('supervision')}>Supraveghere</TabsTrigger>
            <TabsTrigger active={tab === 'activity'} onClick={() => setTab('activity')}>Activitate</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'activity' ? (
          <UserActivityPanel />
        ) : (
          <>
            <PageKpis>
              <KPICard label="Predări pendinte" value={pending.length} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
              <KPICard label="Blocate >24h" value={overdue.length} icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} />
              <KPICard label="Urgente" value={pending.filter((h) => h.is_urgent).length} icon={<Flame className="h-4 w-4 text-muted-foreground" />} />
              <KPICard label="Anomalii" value={anomalies.length} icon={<Shield className="h-4 w-4 text-muted-foreground" />} />
            </PageKpis>

            <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Predări în supraveghere</h3>
                <AsyncContent loading={loadingHandoffs && pending.length === 0} error={null} empty={pending.length === 0}>
                  {overdue.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-xs font-medium uppercase text-destructive">SLA depășit ({overdue.length})</p>
                      {overdue.map((h) => (
                        <HandoffRow
                          key={h.id}
                          handoff={h}
                          onForce={setForcing}
                          onUrgent={handleSetUrgent}
                          acting={actingId === h.id}
                        />
                      ))}
                    </div>
                  )}
                  {pending.filter((h) => !overdue.some((o) => o.id === h.id)).map((h) => (
                    <HandoffRow
                      key={h.id}
                      handoff={h}
                      onForce={setForcing}
                      onUrgent={handleSetUrgent}
                      acting={actingId === h.id}
                    />
                  ))}
                </AsyncContent>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Anomalii detectate</h3>
                <AsyncContent loading={loadingAnom} error={null} empty={anomalies.length === 0}>
                  {anomalies.map((a) => (
                    <Card key={a.id} className="shadow-none">
                      <div className="density-list-item">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                              <StatusBadge status={a.severity} />
                              <p className="text-[length:var(--density-fs-body)] font-medium">{a.title}</p>
                            </div>
                            <p className="density-meta text-muted-foreground">{a.description}</p>
                            {a.suggestion && (
                              <p className="density-meta mt-1 text-primary italic">→ {a.suggestion}</p>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => void ackAnomaly(a.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </AsyncContent>
              </div>
            </div>
          </>
        )}
      </PageBody>

      <Dialog open={!!forcing} onOpenChange={(o) => !o && setForcing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forțare tranziție — {forcing?.project_name}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              {forcing?.from_stage_name} → {forcing?.to_stage_name}
            </p>
            <div className="grid gap-1.5">
              <Label>Motiv obligatoriu</Label>
              <Textarea value={forceReason} onChange={(e) => setForceReason(e.target.value)} rows={3} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForcing(null)}>Anulează</Button>
            <Button variant="destructive" disabled={!forceReason.trim()} onClick={() => void submitForce()}>
              Confirmă forțarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
