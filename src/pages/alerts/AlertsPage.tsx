import { useState, useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle, Plus, Bell, Loader2, BellOff } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import type { User } from '@/core/types';
import { useAlertStore } from '@/store/alertStore';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { toast } from '@/store/toastStore';
import AlertsEnhancements from '@/pages/alerts/AlertsEnhancements';
import { apiCommand } from '@/api/commands';

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

  if (loading) {
    return (
      <div className="flex flex-1 flex-col bg-surface-page p-5">
        <SkeletonList rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xs text-status-red font-medium">{error}</p>
      </div>
    );
  }

  const counts = { critical: 0, warning: 0, info: 0, resolved: 0 };
  alerts.forEach(a => { counts[getCategory(a)]++; });

  return (
    <Page className="mod-shell">
      <div className="mod-canvas">

        {}
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Instrumente"
          icon={Bell}
          title="Alerte"
          subtitle="Notificări despre stocuri critice, deadline-uri depășite și anomalii detectate"
          actions={
            <Button size="sm" onClick={() => openModal()}>
              <Plus className="h-3.5 w-3.5" /> Adaugă alertă
            </Button>
          }
        />

        {}
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={AlertTriangle} label="Critical"  value={counts.critical} warn={counts.critical > 0} />
          <KpiMini icon={AlertTriangle} label="Warning"   value={counts.warning} />
          <KpiMini icon={Info}          label="Info"      value={counts.info} />
          <KpiMini icon={CheckCircle}   label="Rezolvate" value={counts.resolved} />
        </div>

        {}
        <div className="mod-bento">
        <GlassCard size="regular" className="enter-up !p-0 overflow-hidden" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">Alerte active</span>
            <span className="text-pm-2xs text-content-muted">{`${alerts.length} ${alerts.length === 1 ? 'alertă' : 'alerte'}`}</span>
          </div>
          <div className="density-compact border-t border-line/40">
            {alerts.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={BellOff}
                  title="Nicio alerta activa"
                  body="Sistemul nu a generat alerte. Aici vor aparea notificarile despre stocuri critice, deadline-uri depasite si anomalii detectate."
                  size="lg"
                />
              </div>
            ) : (
              alerts.map((alert) => {
                const category = getCategory(alert);
                return (
                  <div
                    key={alert.id}
                    className={`cv-auto border-b border-line border-l-2 ${BORDER_COLOR[category]} flex items-start gap-3 px-4 py-3`}
                  >
                    <AlertIcon category={category} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-content-primary leading-snug">{alert.title}</p>
                      <p className="text-xs text-content-muted mt-0.5">{alert.message}</p>
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
                          className="border border-line px-2.5 py-1 text-pm-2xs font-semibold text-content-secondary hover:bg-surface-tertiary transition-colors disabled:opacity-50"
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

          {}
          <div className="mod-aside enter-up" style={{ animationDelay: '240ms' }}>
            <AlertsEnhancements
              alerts={alerts}
              onBulkAck={async (ids) => {
                await Promise.all(ids.map(id => apiCommand('acknowledge_alert', { id }).catch(() => {})));
              }}
            />
          </div>
        </div>
      </div>

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
