import { useEffect, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Button, Card, CardHeader, Text,
} from '@ui5/webcomponents-react';
import Ui5ClassicControl from '@/fiori/classic/Ui5ClassicControl';
import { useDashboardStore } from '@/store/dashboardStore';
import type { SapGlobal } from '@/fiori/classic/ui5Loader';
import type { User } from '@/core/types';

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Real classic SAPUI5 VizFrame (sap.viz) — column chart bound to a JSONModel at /items.
function buildColumnChart(sap: SapGlobal, model: SapGlobal, dimName: string, measName: string): SapGlobal {
  const vizFrame = new sap.viz.ui5.controls.VizFrame({
    width: '100%', height: '300px', vizType: 'column', uiConfig: { applicationSet: 'fiori' },
  });
  const dataset = new sap.viz.ui5.data.FlattenedDataset({
    dimensions: [new sap.viz.ui5.data.DimensionDefinition({ name: dimName, value: '{label}' })],
    measures: [new sap.viz.ui5.data.MeasureDefinition({ name: measName, value: '{value}' })],
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
  vizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({ uid: 'valueAxis', type: 'Measure', values: [measName] }));
  vizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({ uid: 'categoryAxis', type: 'Dimension', values: [dimName] }));
  return vizFrame;
}

// Real classic SAPUI5 VizFrame (sap.viz) — pie chart bound to a JSONModel at /items.
function buildPieChart(sap: SapGlobal, model: SapGlobal, dimName: string, measName: string): SapGlobal {
  const vizFrame = new sap.viz.ui5.controls.VizFrame({
    width: '100%', height: '300px', vizType: 'pie', uiConfig: { applicationSet: 'fiori' },
  });
  const dataset = new sap.viz.ui5.data.FlattenedDataset({
    dimensions: [new sap.viz.ui5.data.DimensionDefinition({ name: dimName, value: '{label}' })],
    measures: [new sap.viz.ui5.data.MeasureDefinition({ name: measName, value: '{value}' })],
    data: { path: '/items' },
  });
  vizFrame.setDataset(dataset);
  if (model) vizFrame.setModel(model);
  vizFrame.setVizProperties({
    title: { visible: false },
    plotArea: { dataLabel: { visible: true } },
    legend: { visible: true },
  });
  vizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({ uid: 'size', type: 'Measure', values: [measName] }));
  vizFrame.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({ uid: 'color', type: 'Dimension', values: [dimName] }));
  return vizFrame;
}

export default function FioriReports({ user }: { user: User }) {
  const { dashboardData, salesStats, financeOverview, loading, refreshAll } = useDashboardStore();

  useEffect(() => { void refreshAll(); }, [refreshAll]);

  // Sales pipeline — mirrors SalesStats field names from dashboardStore.
  const pipelineData = useMemo(() => {
    const s = salesStats ?? {};
    return {
      items: [
        { label: 'Fără contact', value: num(s.fara_contact) },
        { label: 'Decizie client', value: num(s.decizie_client) },
        { label: 'Decizia noastră', value: num(s.decizie_noastra) },
        { label: 'În negociere', value: num(s.in_negocieri) },
        { label: 'Convertite', value: num(s.converted) },
      ],
    };
  }, [salesStats]);

  // Finance — mirrors FinanceOverview field names (falls back to dashboardData).
  const financeData = useMemo(() => {
    const f = financeOverview ?? {};
    return {
      items: [
        { label: 'Venituri', value: num(f.total_actual_revenue ?? dashboardData.revenue) },
        { label: 'Costuri', value: num(f.total_actual_cost ?? dashboardData.costs) },
        { label: 'Profit', value: num(f.total_actual_profit ?? dashboardData.profit) },
      ],
    };
  }, [financeOverview, dashboardData]);

  // Project distribution — mirrors DashboardData field names.
  const projectsData = useMemo(() => {
    const total = num(dashboardData.total_projects);
    const active = num(dashboardData.active_projects);
    const inProd = num(dashboardData.in_production);
    const rest = Math.max(0, total - active - inProd);
    return {
      items: [
        { label: 'Active', value: active },
        { label: 'În producție', value: inProd },
        { label: 'Altele', value: rest },
      ],
    };
  }, [dashboardData]);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle>
          <Title slot="heading" level="H3">Rapoarte</Title>
          <Button slot="actions" design="Emphasized" disabled={loading} onClick={() => void refreshAll()}>
            Reîmprospătează
          </Button>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Text>Rapoarte vizuale generate pentru {user.username ?? 'utilizator'}.</Text>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
          <Card header={<CardHeader titleText="Pipeline vânzări" subtitleText="VizFrame coloane · SAPUI5 clasic" />}>
            <Ui5ClassicControl
              height="320px"
              data={pipelineData}
              create={(sap, { model }) => buildColumnChart(sap, model, 'Etapă', 'Număr')}
            />
          </Card>

          <Card header={<CardHeader titleText="Sinteză financiară" subtitleText="VizFrame coloane · SAPUI5 clasic" />}>
            <Ui5ClassicControl
              height="320px"
              data={financeData}
              create={(sap, { model }) => buildColumnChart(sap, model, 'Categorie', 'Valoare (lei)')}
            />
          </Card>

          <Card header={<CardHeader titleText="Distribuție proiecte" subtitleText="VizFrame circular · SAPUI5 clasic" />}>
            <Ui5ClassicControl
              height="320px"
              data={projectsData}
              create={(sap, { model }) => buildPieChart(sap, model, 'Stare', 'Proiecte')}
            />
          </Card>
        </div>
      </div>
    </DynamicPage>
  );
}
