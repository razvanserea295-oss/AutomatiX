import { useEffect, useMemo, useState } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Card, CardHeader,
  AnalyticalTable, Button, BusyIndicator, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import Ui5ClassicControl from '@/fiori/classic/Ui5ClassicControl';
import type { SapGlobal } from '@/fiori/classic/ui5Loader';
import type { User } from '@/core/types';

// Invoice shape mirrors the SaaS FinancePage `Invoice` interface + `get_invoices` command.
interface Invoice {
  id: number;
  invoice_number: string;
  project_name: string;
  client_name: string;
  status: string;
  currency: string;
  total: number;
  paid_amount: number;
  remaining: number;
  due_date: string;
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v: unknown, currency = 'RON'): string {
  return num(v).toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' ' + currency;
}

// Builds a real classic SAPUI5 VizFrame (sap.viz) grouped-column chart that compares
// estimated vs realised values for revenue / costs / profit, bound to /items.
function buildEstimatedVsActualChart(sap: SapGlobal, model: SapGlobal): SapGlobal {
  const vizFrame = new sap.viz.ui5.controls.VizFrame({
    width: '100%', height: '340px', vizType: 'column', uiConfig: { applicationSet: 'fiori' },
  });
  const dataset = new sap.viz.ui5.data.FlattenedDataset({
    dimensions: [new sap.viz.ui5.data.DimensionDefinition({ name: 'Indicator', value: '{indicator}' })],
    measures: [
      new sap.viz.ui5.data.MeasureDefinition({ name: 'Estimat', value: '{estimated}' }),
      new sap.viz.ui5.data.MeasureDefinition({ name: 'Realizat', value: '{actual}' }),
    ],
    data: { path: '/items' },
  });
  vizFrame.setDataset(dataset);
  if (model) vizFrame.setModel(model);
  vizFrame.setVizProperties({
    title: { visible: false },
    legend: { visible: true },
    plotArea: { dataLabel: { visible: true } },
    valueAxis: { title: { visible: false } },
    categoryAxis: { title: { visible: false } },
  });
  vizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
    uid: 'valueAxis', type: 'Measure', values: ['Estimat', 'Realizat'],
  }));
  vizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
    uid: 'categoryAxis', type: 'Dimension', values: ['Indicator'],
  }));
  return vizFrame;
}

export default function FioriFinance({ user }: { user: User }) {
  const financeOverview = useDashboardStore(s => s.financeOverview);
  const loading = useDashboardStore(s => s.loading);
  const fetchFinanceOverview = useDashboardStore(s => s.fetchFinanceOverview);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  const loadInvoices = useMemo(() => () => {
    setInvoicesLoading(true);
    apiCommand<Invoice[]>('get_invoices')
      .then(data => setInvoices(data || []))
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false));
  }, []);

  useEffect(() => {
    void fetchFinanceOverview();
    loadInvoices();
  }, [fetchFinanceOverview, loadInvoices]);

  const ov = financeOverview ?? {};

  const kpis = useMemo(() => [
    { label: 'Venituri realizate', value: money(ov.total_actual_revenue), sub: `Estimat ${money(ov.total_estimated_revenue)}` },
    { label: 'Costuri realizate', value: money(ov.total_actual_cost), sub: `Estimat ${money(ov.total_estimated_cost)}` },
    { label: 'Profit realizat', value: money(ov.total_actual_profit), sub: `Estimat ${money(ov.total_estimated_profit)}` },
    { label: 'Marja medie', value: `${num(ov.avg_margin_percent).toFixed(1)}%`, sub: 'profitabilitate' },
  ], [ov]);

  const chartData = useMemo(() => ({
    items: [
      { indicator: 'Venituri', estimated: num(ov.total_estimated_revenue), actual: num(ov.total_actual_revenue) },
      { indicator: 'Costuri', estimated: num(ov.total_estimated_cost), actual: num(ov.total_actual_cost) },
      { indicator: 'Profit', estimated: num(ov.total_estimated_profit), actual: num(ov.total_actual_profit) },
    ],
  }), [ov]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Nr. factură', accessor: 'invoice_number', minWidth: 140 },
    { Header: 'Proiect', accessor: 'project_name', minWidth: 180 },
    { Header: 'Client', accessor: 'client_name', minWidth: 160 },
    {
      Header: 'Total', accessor: 'total', width: 130, hAlign: 'End',
      Cell: ({ value, row }: AnalyticalTableCellInstance) => money(value, (row.original as Invoice).currency),
    },
    {
      Header: 'Plătit', accessor: 'paid_amount', width: 130, hAlign: 'End',
      Cell: ({ value, row }: AnalyticalTableCellInstance) => money(value, (row.original as Invoice).currency),
    },
    {
      Header: 'Restant', accessor: 'remaining', width: 130, hAlign: 'End',
      Cell: ({ value, row }: AnalyticalTableCellInstance) => money(value, (row.original as Invoice).currency),
    },
    {
      Header: 'Status', accessor: 'status', width: 130,
      Cell: ({ value }: AnalyticalTableCellInstance) => (
        <ObjectStatus state={statusState(String(value ?? ''))}>{String(value ?? '')}</ObjectStatus>
      ),
    },
    {
      Header: 'Scadență', accessor: 'due_date', width: 130,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value ? String(value) : '—'),
    },
  ], []);

  const overviewLoading = loading && !financeOverview;

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Financiar</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--sapContent_LabelColor)' }}>
            {`Salut, ${user.username}`}
          </span>
          <Button
            design="Transparent"
            onClick={() => { void fetchFinanceOverview(); loadInvoices(); }}
          >
            Reîmprospătează
          </Button>
        </div>

        {overviewLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {kpis.map(k => (
              <Card key={k.label} header={<CardHeader titleText={k.label} subtitleText={k.sub} />}>
                <div style={{ padding: '0.75rem 1rem 1rem', fontSize: '1.75rem', fontWeight: 700 }}>{k.value}</div>
              </Card>
            ))}
          </div>
        )}

        <Card header={<CardHeader titleText="Estimat vs. realizat" subtitleText="Venituri · costuri · profit — VizFrame · SAPUI5 clasic" />}>
          <Ui5ClassicControl
            height="360px"
            data={chartData}
            create={(sap, { model }) => buildEstimatedVsActualChart(sap, model)}
          />
        </Card>

        <Card header={<CardHeader titleText="Facturi" subtitleText={`${invoices.length} ${invoices.length === 1 ? 'factură' : 'facturi'}`} />}>
          {invoicesLoading && invoices.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <BusyIndicator active size="L" />
            </div>
          ) : (
            <AnalyticalTable
              data={invoices}
              columns={columns}
              filterable
              sortable
              visibleRows={15}
              noDataText="Fără date"
            />
          )}
        </Card>
      </div>
    </DynamicPage>
  );
}
