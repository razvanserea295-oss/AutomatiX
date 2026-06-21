import { useEffect, useMemo, useState } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable,
  BusyIndicator, Button, ObjectStatus, MessageStrip,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { useAlertStore, type Alert } from '@/store/alertStore';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

type AlertCategory = 'critical' | 'warning' | 'info' | 'resolved';

const CATEGORY_LABEL: Record<AlertCategory, string> = {
  critical: 'Critică',
  warning: 'Avertizare',
  info: 'Informativă',
  resolved: 'Rezolvată',
};

const CATEGORY_STATE: Record<AlertCategory, 'None' | 'Positive' | 'Critical' | 'Negative' | 'Information'> = {
  critical: 'Negative',
  warning: 'Critical',
  info: 'Information',
  resolved: 'Positive',
};

const STRIP_DESIGN: Record<AlertCategory, 'Negative' | 'Critical' | 'Information' | 'Positive'> = {
  critical: 'Negative',
  warning: 'Critical',
  info: 'Information',
  resolved: 'Positive',
};

function getCategory(alert: Alert): AlertCategory {
  const s = (alert.severity || '').toLowerCase();
  const t = (alert.alert_type || '').toLowerCase();
  if (s === 'critical' || s === 'error' || t === 'critical' || t === 'error') return 'critical';
  if (s === 'warning' || t === 'warning' || t === 'deadline') return 'warning';
  if (s === 'resolved' || t === 'resolved' || alert.acknowledged) return 'resolved';
  return 'info';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ro-RO');
}

interface AlertRow extends Alert {
  category: AlertCategory;
}

export default function FioriAlerts({ user }: { user: User }) {
  const alerts = useAlertStore(s => s.alerts);
  const loading = useAlertStore(s => s.loading);
  const generateAndFetch = useAlertStore(s => s.generateAndFetch);
  const acknowledgeAlert = useAlertStore(s => s.acknowledgeAlert);
  const [ackingId, setAckingId] = useState<number | null>(null);

  useEffect(() => { void generateAndFetch(); }, [generateAndFetch]);

  const rows = useMemo<AlertRow[]>(
    () => alerts.map(a => ({ ...a, category: getCategory(a) })),
    [alerts],
  );

  const counts = useMemo(() => {
    const c: Record<AlertCategory, number> = { critical: 0, warning: 0, info: 0, resolved: 0 };
    rows.forEach(r => { c[r.category]++; });
    return c;
  }, [rows]);

  const strips = useMemo(
    () => (['critical', 'warning', 'info', 'resolved'] as AlertCategory[])
      .filter(cat => counts[cat] > 0),
    [counts],
  );

  const handleAck = async (alertId: number) => {
    setAckingId(alertId);
    try {
      await acknowledgeAlert(alertId, user.id);
    } finally {
      setAckingId(null);
    }
  };

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Titlu', accessor: 'title', minWidth: 220 },
    { Header: 'Mesaj', accessor: 'message', minWidth: 260 },
    {
      Header: 'Severitate', accessor: 'category', width: 150,
      Cell: ({ value }: AnalyticalTableCellInstance) => {
        const v = value as AlertCategory;
        return <ObjectStatus state={CATEGORY_STATE[v]}>{CATEGORY_LABEL[v]}</ObjectStatus>;
      },
    },
    {
      Header: 'Tip', accessor: 'alert_type', width: 140,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value as string) || '—',
    },
    {
      Header: 'Dată', accessor: 'created_at', width: 180,
      Cell: ({ value }: AnalyticalTableCellInstance) => fmtDate(value as string),
    },
    {
      Header: 'Status', accessor: 'acknowledged', width: 150,
      Cell: ({ value }: AnalyticalTableCellInstance) => (
        <ObjectStatus state={(value as boolean) ? statusState('completed') : statusState('open')}>
          {(value as boolean) ? 'Confirmată' : 'Activă'}
        </ObjectStatus>
      ),
    },
    {
      Header: 'Acțiune', accessor: 'id', width: 140,
      Cell: ({ value, row }: AnalyticalTableCellInstance) =>
        (row.original as AlertRow).acknowledged ? (
          <span style={{ color: 'var(--sapContent_LabelColor)' }}>—</span>
        ) : (
          <Button
            design="Transparent"
            disabled={ackingId === (value as number)}
            onClick={() => void handleAck(value as number)}
          >
            Confirmă
          </Button>
        ),
    },
  ], [ackingId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Alerte</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button design="Transparent" onClick={() => void generateAndFetch()}>Reîmprospătează</Button>
          <span style={{ marginLeft: 'auto', color: 'var(--sapContent_LabelColor)', fontSize: '0.875rem' }}>
            {user.full_name}
          </span>
        </div>

        {!loading && strips.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {strips.map(cat => (
              <MessageStrip key={cat} design={STRIP_DESIGN[cat]} hideCloseButton>
                {CATEGORY_LABEL[cat]}: {counts[cat]} {counts[cat] === 1 ? 'alertă' : 'alerte'}
              </MessageStrip>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={rows}
            columns={columns}
            filterable
            sortable
            visibleRows={15}
            noDataText="Fără date"
          />
        )}
      </div>
    </DynamicPage>
  );
}
