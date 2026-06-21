





































import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Info, CheckCircle, Plus, Bell, Loader2, BellOff, Search, X } from 'lucide-react';
import type { User } from '@/core/types';
import { useAlertStore } from '@/store/alertStore';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { toast } from '@/store/toastStore';
import AlertsEnhancements from '@/pages/alerts/AlertsEnhancements';
import { apiCommand } from '@/api/commands';

import Button from '@/redesign/ui/Button';
import Page from '@/redesign/ui/Page';
import KpiCard from '@/redesign/ui/KpiCard';
import { GlassCard, EmptyState, Skeleton, ErrorState } from '@/redesign/ui';
import { filterSearchInputCls, filterSearchIconCls, filterClearInlineBtnCls, filterToggleCls } from '@/redesign/ui/filterControls';
import { vtName } from '@/redesign/lib/viewTransition';

import type { Alert } from '@/store/alertStore';

type AlertCategory = 'critical' | 'warning' | 'info' | 'resolved';

function getCategory(alert: Alert): AlertCategory {
  const s = (alert.severity || '').toLowerCase();
  const t = (alert.alert_type || '').toLowerCase();
  if (s === 'critical' || s === 'error' || t === 'critical' || t === 'error') return 'critical';
  if (s === 'warning' || t === 'warning' || t === 'deadline') return 'warning';
  if (s === 'resolved' || t === 'resolved' || alert.acknowledged) return 'resolved';
  return 'info';
}

const BORDER_COLOR: Record<AlertCategory, string> = {
  critical: 'border-l-status-red',
  warning:  'border-l-status-amber',
  info:     'border-l-status-blue',
  resolved: 'border-l-status-green',
};

const ICON_COLOR: Record<AlertCategory, string> = {
  critical: 'text-status-red',
  warning:  'text-status-amber',
  info:     'text-status-blue',
  resolved: 'text-status-green',
};

function AlertIcon({ category }: { category: AlertCategory }) {
  const cls = `h-4 w-4 shrink-0 ${ICON_COLOR[category]}`;
  switch (category) {
    case 'critical':
    case 'warning':
      return <AlertTriangle className={cls} aria-hidden="true" />;
    case 'resolved':
      return <CheckCircle className={cls} aria-hidden="true" />;
    default:
      return <Info className={cls} aria-hidden="true" />;
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ro-RO', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}




const SEVERITY_PILLS: { value: AlertCategory; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'warning',  label: 'Warning' },
  { value: 'info',     label: 'Info' },
  { value: 'resolved', label: 'Rezolvate' },
];

interface AlertsPageProps { user: User | null; }

export default function AlertsPage({ user }: AlertsPageProps) {
  const alerts = useAlertStore(s => s.alerts);
  const loading = useAlertStore(s => s.loading);
  const error = useAlertStore(s => s.error);
  const generateAndFetch = useAlertStore(s => s.generateAndFetch);
  const createAlertStore = useAlertStore(s => s.createAlert);
  const updateAlertStore = useAlertStore(s => s.updateAlert);
  const acknowledgeAlertStore = useAlertStore(s => s.acknowledgeAlert);
  const [ackingIds, setAckingIds] = useState<Set<number>>(new Set());
  const { isOpen, editingItem, openModal, closeModal, isEditing } = useFormModal();
  
  
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AlertCategory | ''>('');

  useEffect(() => { void generateAndFetch(); }, [generateAndFetch]);

  const formFields: FormField[] = [
    { name: 'title', label: 'Titlu', type: 'text', required: true, placeholder: 'Titlu alerta' },
    { name: 'message', label: 'Mesaj', type: 'textarea', required: true, placeholder: 'Descriere alerta' },
    { name: 'severity', label: 'Severitate', type: 'select', required: true,
      options: [{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'critical', label: 'Critical' }] },
    { name: 'type', label: 'Tip', type: 'select', required: true,
      options: [{ value: 'system', label: 'System' }, { value: 'deadline', label: 'Deadline' }, { value: 'inventory', label: 'Inventory' }, { value: 'production', label: 'Production' }] },
    {
      name: 'entity_type', label: 'Tip entitate', type: 'select', required: false,
      options: [
        { value: 'system', label: 'System (general)' },
        { value: 'project', label: 'Proiect' },
        { value: 'station', label: 'Statie' },
        { value: 'material', label: 'Material' },
        { value: 'piece', label: 'Piesa' },
      ],
    },
    { name: 'entity_id', label: 'ID entitate', type: 'number', required: false, placeholder: '0 daca nu se aplică' },
  ];

  const handleSubmit = async (data: Record<string, any>) => {
    const payload = {
      ...data,
      entity_type: data.entity_type || 'system',
      entity_id: data.entity_id != null && data.entity_id !== '' ? Number(data.entity_id) : 0,
      acknowledged: false,
    };
    if (isEditing) {
      await updateAlertStore(editingItem.id, payload);
    } else {
      await createAlertStore(payload);
    }
  };

  const handleAcknowledge = async (alertId: number) => {
    if (!user) return;
    setAckingIds((prev) => new Set(prev).add(alertId));
    try {
      await acknowledgeAlertStore(alertId, user.id);
      toast.success('Alerta confirmata');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la confirmare');
    } finally {
      setAckingIds((prev) => { const next = new Set(prev); next.delete(alertId); return next; });
    }
  };

  
  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0, resolved: 0 };
    alerts.forEach(a => { c[getCategory(a)]++; });
    return c;
  }, [alerts]);

  
  
  const visibleAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      if (severityFilter && getCategory(a) !== severityFilter) return false;
      if (!q) return true;
      return (a.title || '').toLowerCase().includes(q) || (a.message || '').toLowerCase().includes(q);
    });
  }, [alerts, search, severityFilter]);

  const toggleSeverity = (cat: AlertCategory) =>
    setSeverityFilter((prev) => (prev === cat ? '' : cat));

  if (loading) {
    return (
      <Page fit>
        <Page.Body fit maxWidth="full" padding="comfortable">
          <GlassCard size="regular">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton width={36} height={36} rounded="lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton width="40%" height={12} />
                    <Skeleton width="70%" height={10} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </Page.Body>
      </Page>
    );
  }

  if (error) {
    return (
      <Page fit>
        <Page.Body fit maxWidth="full" padding="comfortable">
          <ErrorState title="Eroare la încărcarea alertelor" description={error} onRetry={() => void generateAndFetch()} />
        </Page.Body>
      </Page>
    );
  }

  return (
    <Page fit>
      <Page.Body fit maxWidth="full" padding="comfortable">

        {


}
        <div className="enter-up shrink-0 pb-4 border-b border-line/60" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            {}
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
                <h1 className="text-pm-2xl font-semibold text-content-primary truncate leading-tight">Alerte</h1>
                <p className="text-pm-sm text-content-muted truncate">Notificări despre stocuri critice, deadline-uri depășite și anomalii detectate</p>
              </div>
            </div>

            {}
            <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
              <div className="relative group">
                <Search className={filterSearchIconCls} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Caută titlu, mesaj..."
                  className={filterSearchInputCls}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Golește căutarea"
                    className={filterClearInlineBtnCls}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSeverityFilter('')} className={filterToggleCls(severityFilter === '')}>
                  Toate
                </button>
                {SEVERITY_PILLS.map((p) => (
                  <button key={p.value} onClick={() => toggleSeverity(p.value)} className={filterToggleCls(severityFilter === p.value)}>
                    {p.label}
                  </button>
                ))}
              </div>

              <Button size="md" onClick={() => openModal()}>
                <Plus className="h-4 w-4" /> Adaugă alertă
              </Button>
            </div>
          </div>
        </div>

        {

}
        <div className="enter-up shrink-0" style={{ animationDelay: '70ms' }}>
          <Page.Kpis cols={4}>
            <button type="button" onClick={() => toggleSeverity('critical')}
              className={`text-left rounded-2xl transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${severityFilter === 'critical' ? 'ring-2 ring-status-red/40' : ''}`}>
              <KpiCard label="Critical"  value={counts.critical} icon={AlertTriangle} iconColor="text-status-red" />
            </button>
            <button type="button" onClick={() => toggleSeverity('warning')}
              className={`text-left rounded-2xl transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${severityFilter === 'warning' ? 'ring-2 ring-status-amber/40' : ''}`}>
              <KpiCard label="Warning"   value={counts.warning} icon={AlertTriangle} iconColor="text-status-amber" />
            </button>
            <button type="button" onClick={() => toggleSeverity('info')}
              className={`text-left rounded-2xl transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${severityFilter === 'info' ? 'ring-2 ring-status-blue/40' : ''}`}>
              <KpiCard label="Info"      value={counts.info} icon={Info} iconColor="text-status-blue" />
            </button>
            <button type="button" onClick={() => toggleSeverity('resolved')}
              className={`text-left rounded-2xl transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${severityFilter === 'resolved' ? 'ring-2 ring-status-green/40' : ''}`}>
              <KpiCard label="Rezolvate" value={counts.resolved} icon={CheckCircle} iconColor="text-status-green" />
            </button>
          </Page.Kpis>
        </div>

        {



}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0 enter-up" style={{ animationDelay: '140ms' }}>

          {}
          <section className="xl:col-span-8 min-w-0 min-h-0 flex flex-col">
            <GlassCard size="regular" className="!p-0 overflow-hidden flex flex-col min-h-0 flex-1">
              <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-line/50">
                <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">Alerte active</span>
                <span className="text-pm-xs text-content-muted shrink-0">
                  {visibleAlerts.length} {visibleAlerts.length === 1 ? 'alertă' : 'alerte'}
                  {(search || severityFilter) ? ` din ${alerts.length}` : ''}
                </span>
              </div>
              <div key={`${severityFilter}|${search}`} className="density-compact stagger-in min-h-0 flex-1 overflow-y-auto">
                {alerts.length === 0 ? (
                  <EmptyState
                    icon={BellOff}
                    title="Nicio alerta activa"
                    description="Sistemul nu a generat alerte. Aici vor aparea notificarile despre stocuri critice, deadline-uri depasite si anomalii detectate."
                  />
                ) : visibleAlerts.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="Niciun rezultat"
                    description="Nicio alertă nu corespunde căutării sau filtrului curent."
                  />
                ) : (
                  visibleAlerts.map((alert) => {
                    const category = getCategory(alert);
                    const highSeverity = category === 'critical' || category === 'warning';
                    return (
                      <div
                        key={alert.id}
                        style={{ viewTransitionName: vtName('alert', alert.id) }}
                        className={`group cv-auto vt-morph border-b border-line/50 last:border-b-0 border-l-2 ${BORDER_COLOR[category]} flex items-start gap-3 px-4 py-3 hover:bg-surface-tertiary/40 transition-colors`}
                      >
                        <span className={highSeverity ? 'anim-pop inline-flex' : 'inline-flex'}>
                          <AlertIcon category={category} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-pm-sm font-medium text-content-primary leading-snug truncate" title={alert.title}>{alert.title}</p>
                          <p className="text-pm-xs text-content-muted mt-0.5 line-clamp-2" title={alert.message}>{alert.message}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="text-pm-2xs text-content-muted whitespace-nowrap tabular-nums">
                            {formatTimestamp(alert.created_at)}
                          </span>
                          {!alert.acknowledged && (
                            <button
                              type="button"
                              disabled={ackingIds.has(alert.id)}
                              onClick={() => void handleAcknowledge(alert.id)}
                              aria-label={`Confirmă alerta ${alert.title}`}
                              className="rounded-lg border border-line/70 px-3 py-1 text-pm-2xs font-semibold text-content-secondary hover:bg-surface-tertiary transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-50"
                            >
                              {ackingIds.has(alert.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmă'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>
          </section>

          {
}
          <aside className="xl:col-span-4 min-h-0 space-y-4 overflow-y-auto">
            {}
            <GlassCard size="regular">
              <p className="text-pm-eyebrow text-accent mb-3 flex items-center gap-2">
                <span className="inline-block h-px w-3.5 bg-accent/50" aria-hidden />
                Distribuție severitate
              </p>
              {alerts.length === 0 ? (
                <p className="text-pm-xs text-content-muted">Nicio alertă înregistrată.</p>
              ) : (
                <div className="stagger-in space-y-2">
                  {SEVERITY_PILLS.map((p) => {
                    const count = counts[p.value];
                    const pct = alerts.length > 0 ? (count / alerts.length) * 100 : 0;
                    return (
                      <button
                        key={p.value}
                        onClick={() => toggleSeverity(p.value)}
                        className={`w-full rounded-lg px-3 py-2 text-left transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                          severityFilter === p.value ? 'bg-accent/5 ring-1 ring-accent/20' : 'hover:bg-surface-tertiary/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="flex items-center gap-1.5 text-pm-sm text-content-secondary">
                            <span className={`h-1.5 w-1.5 rounded-full ${ICON_COLOR[p.value].replace('text-', 'bg-')}`} aria-hidden />
                            {p.label}
                          </span>
                          <span className="text-pm-sm font-semibold text-content-primary tabular-nums">{count}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
                          <span className={`anim-bar-grow block h-full ${ICON_COLOR[p.value].replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} aria-hidden />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {

}
            <AlertsEnhancements
              alerts={alerts}
              onBulkAck={async (ids) => {
                await Promise.all(ids.map(id => apiCommand('acknowledge_alert', { id }).catch(() => {})));
              }}
            />
          </aside>
        </div>

      </Page.Body>

      <FormModal
        isOpen={isOpen}
        onClose={closeModal}
        title={isEditing ? 'Editează alerta' : 'Adaugă alerta'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingItem || {}}
        submitLabel={isEditing ? 'Actualizează' : 'Adaugă'}
      />
    </Page>
  );
}
