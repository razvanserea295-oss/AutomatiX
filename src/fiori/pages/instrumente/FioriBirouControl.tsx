import { useEffect, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Card, CardHeader,
  Button, AnalyticalTable, BusyIndicator, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function money(v: unknown): string {
  return num(v).toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' lei';
}

interface SummaryRow {
  domeniu: string;
  indicator: string;
  valoare: string;
  status: string;
}

export default function FioriBirouControl({ user }: { user: User }) {
  const { dashboardData, financeOverview, salesStats, loading, refreshAll } = useDashboardStore();

  useEffect(() => { void refreshAll(); }, [refreshAll]);

  const lowStock = num(dashboardData.low_stock_count);
  const pendingAlerts = num(dashboardData.pending_alerts);
  const actualProfit = num(financeOverview?.total_actual_profit ?? dashboardData.profit);

  const kpis = useMemo(() => [
    {
      label: 'Proiecte active',
      value: String(num(dashboardData.active_projects)),
      sub: `${num(dashboardData.total_projects)} total`,
    },
    {
      label: 'În producție',
      value: String(num(dashboardData.in_production)),
      sub: 'comenzi curente',
    },
    {
      label: 'Alerte în așteptare',
      value: String(pendingAlerts),
      sub: `${lowStock} materiale stoc scăzut`,
    },
    {
      label: 'Profit realizat',
      value: money(financeOverview?.total_actual_profit ?? dashboardData.profit),
      sub: `venit ${money(financeOverview?.total_actual_revenue ?? dashboardData.revenue)}`,
    },
  ], [dashboardData, financeOverview, lowStock, pendingAlerts]);

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const s = salesStats ?? {};
    return [
      {
        domeniu: 'Proiecte',
        indicator: 'Proiecte active',
        valoare: String(num(dashboardData.active_projects)),
        status: 'activ',
      },
      {
        domeniu: 'Producție',
        indicator: 'Comenzi în producție',
        valoare: String(num(dashboardData.in_production)),
        status: num(dashboardData.in_production) > 0 ? 'in productie' : 'ok',
      },
      {
        domeniu: 'Stocuri',
        indicator: 'Materiale cu stoc scăzut',
        valoare: `${lowStock} / ${num(dashboardData.total_materials)}`,
        status: lowStock > 0 ? 'restanta' : 'ok',
      },
      {
        domeniu: 'Alerte',
        indicator: 'Alerte nerezolvate',
        valoare: String(pendingAlerts),
        status: pendingAlerts > 0 ? 'asteptare' : 'ok',
      },
      {
        domeniu: 'Vânzări',
        indicator: 'Lead-uri în pipeline',
        valoare: String(num(s.total_leads)),
        status: num(s.stale_leads) > 0 ? 'asteptare' : 'activ',
      },
      {
        domeniu: 'Vânzări',
        indicator: 'Valoare pipeline',
        valoare: money(s.pipeline_value),
        status: 'in negociere',
      },
      {
        domeniu: 'Financiar',
        indicator: 'Profit realizat',
        valoare: money(financeOverview?.total_actual_profit ?? dashboardData.profit),
        status: actualProfit >= 0 ? 'ok' : 'restanta',
      },
    ];
  }, [dashboardData, financeOverview, salesStats, lowStock, pendingAlerts, actualProfit]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Domeniu', accessor: 'domeniu', width: 160 },
    { Header: 'Indicator', accessor: 'indicator', minWidth: 220 },
    {
      Header: 'Valoare',
      accessor: 'valoare',
      width: 200,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value as string) || '—',
    },
    {
      Header: 'Status',
      accessor: 'status',
      width: 180,
      Cell: ({ value }: AnalyticalTableCellInstance) => {
        const status = (value as string) || '';
        return <ObjectStatus state={statusState(status)}>{status || '—'}</ObjectStatus>;
      },
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Birou de control</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>
            Supraveghere operațională · {user.username}
          </span>
          <Button design="Emphasized" onClick={() => { void refreshAll(); }}>
            Reîmprospătează
          </Button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {kpis.map(k => (
                <Card key={k.label} header={<CardHeader titleText={k.label} subtitleText={k.sub} />}>
                  <div style={{ padding: '0.75rem 1rem 1rem', fontSize: '1.75rem', fontWeight: 700 }}>{k.value}</div>
                </Card>
              ))}
            </div>

            <Card header={<CardHeader titleText="Rezumat operațional" subtitleText="Indicatori cheie pe domenii" />}>
              <AnalyticalTable
                data={summaryRows}
                columns={columns}
                filterable
                sortable
                visibleRows={15}
                noDataText="Fără date"
              />
            </Card>
          </>
        )}
      </div>
    </DynamicPage>
  );
}
