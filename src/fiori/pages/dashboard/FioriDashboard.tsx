import { useEffect, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Card, CardHeader,
} from '@ui5/webcomponents-react';
import Ui5ClassicControl from '../../classic/Ui5ClassicControl';
import { useDashboardStore } from '@/store/dashboardStore';
import type { SapGlobal } from '../../classic/ui5Loader';
import type { User } from '@/core/types';

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function money(v: unknown): string {
  return num(v).toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' lei';
}

// Builds a real classic SAPUI5 VizFrame (sap.viz) column chart bound to a JSONModel
// at /items. Data updates flow through the model, so the chart re-renders live.
function buildPipelineChart(sap: SapGlobal, model: SapGlobal): SapGlobal {
  const vizFrame = new sap.viz.ui5.controls.VizFrame({
    width: '100%', height: '320px', vizType: 'column', uiConfig: { applicationSet: 'fiori' },
  });
  const dataset = new sap.viz.ui5.data.FlattenedDataset({
    dimensions: [new sap.viz.ui5.data.DimensionDefinition({ name: 'Etapă', value: '{stage}' })],
    measures: [new sap.viz.ui5.data.MeasureDefinition({ name: 'Număr', value: '{count}' })],
    data: { path: '/items' },
  });
  vizFrame.setDataset(dataset);
  if (model) vizFrame.setModel(model);
  vizFrame.setVizProperties({
    title: { visible: false },
    legend: { visible: false },
    plotArea: { dataLabel: { visible: true } },
    valueAxis: { title: { visible: false } },
    categoryAxis: { title: { visible: false } },
  });
  vizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({ uid: 'valueAxis', type: 'Measure', values: ['Număr'] }));
  vizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({ uid: 'categoryAxis', type: 'Dimension', values: ['Etapă'] }));
  return vizFrame;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function FioriDashboard(_props: { user: User }) {
  const { dashboardData, salesStats, financeOverview, refreshAll } = useDashboardStore();

  useEffect(() => { void refreshAll(); }, [refreshAll]);

  const kpis = useMemo(() => [
    { label: 'Proiecte active', value: String(num(dashboardData.active_projects)), sub: `${num(dashboardData.total_projects)} total` },
    { label: 'În producție', value: String(num(dashboardData.in_production)), sub: 'comenzi curente' },
    { label: 'Stoc scăzut', value: String(num(dashboardData.low_stock_count)), sub: `${num(dashboardData.total_materials)} materiale` },
    { label: 'Alerte', value: String(num(dashboardData.pending_alerts)), sub: 'în așteptare' },
    { label: 'Venituri', value: money(financeOverview?.total_actual_revenue ?? dashboardData.revenue), sub: 'realizate' },
    { label: 'Profit', value: money(financeOverview?.total_actual_profit ?? dashboardData.profit), sub: 'realizat' },
  ], [dashboardData, financeOverview]);

  const pipelineData = useMemo(() => {
    const s = salesStats ?? {};
    return {
      items: [
        { stage: 'Fără contact', count: num(s.fara_contact) },
        { stage: 'Decizie client', count: num(s.decizie_client) },
        { stage: 'Decizia noastră', count: num(s.decizie_noastra) },
        { stage: 'În negociere', count: num(s.in_negocieri) },
        { stage: 'Convertite', count: num(s.converted) },
      ],
    };
  }, [salesStats]);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Dashboard</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {kpis.map(k => (
            <Card key={k.label} header={<CardHeader titleText={k.label} subtitleText={k.sub} />}>
              <div style={{ padding: '0.75rem 1rem 1rem', fontSize: '1.75rem', fontWeight: 700 }}>{k.value}</div>
            </Card>
          ))}
        </div>

        <Card header={<CardHeader titleText="Pipeline vânzări" subtitleText="VizFrame · SAPUI5 clasic" />}>
          <Ui5ClassicControl
            height="340px"
            data={pipelineData}
            create={(sap, { model }) => buildPipelineChart(sap, model)}
          />
        </Card>
      </div>
    </DynamicPage>
  );
}
