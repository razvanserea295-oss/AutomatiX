import { useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { RefreshCw, TrendingUp, FolderKanban, Bell, AlertTriangle, ArrowRight } from '@/icons';
import type { User } from '@/core/types';
import { formatDateTimeRo } from '@/lib/format';
import { useProjectStore } from '@/store/projectStore';
import { useAlertStore } from '@/store/alertStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useHandoffStore } from '@/store/handoffStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Button } from '@/v2/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/v2/components/ui/card';
import { Page, PageHeader, PageBody } from '@/v2/components/app/Page';
import {
  KPICard,
  DashboardGrid,
  LiveIndicator,
} from '@/v2/analytics';
import { AnalyticsAreaChart } from '@/v2/analytics/components/AreaChart';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';

type Props = {
  user: User | null;
  onNavigate: (path: string) => void;
};

const MONTHS_SHORT = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildRevenueTrend(total: number): { luna: string; valoare: number }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const factor = 0.55 + (i / 5) * 0.45 + (Math.sin(i * 1.1) * 0.08);
    return { luna: MONTHS_SHORT[d.getMonth()]!, valoare: Math.round(total * factor) };
  });
}
export default function DashboardPage({ user, onNavigate }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const alerts = useAlertStore((s) => s.alerts);
  const fetchAlerts = useAlertStore((s) => s.generateAndFetch);
  const dashboardData = useDashboardStore((s) => s.dashboardData);
  const refreshDashboard = useDashboardStore((s) => s.refreshAll);
  const loadingDash = useDashboardStore((s) => s.loading);
  const handoffs = useHandoffStore((s) => s.pending);
  const fetchHandoffs = useHandoffStore((s) => s.fetchPending);
  const eurRate = useSettingsStore((s) => s.eurToRonRate);
  const currency = useSettingsStore((s) => s.defaultCurrency);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    void loadSettings();
    void fetchProjects();
    void fetchAlerts();
    void fetchHandoffs();
    void refreshDashboard();
  }, [loadSettings, fetchProjects, fetchAlerts, fetchHandoffs, refreshDashboard]);

  const summary = (dashboardData?.summary || dashboardData) as Record<string, number>;
  const revenue = summary.revenue_total ?? summary.revenue ?? 0;
  const activeProjects = summary.projects_active ?? projects.filter((p) => p.status !== 'finalizat').length;
  const attention = (alerts?.filter((a) => !a.acknowledged).length ?? 0) + handoffs.length;

  const revenueDisplay = useMemo(() => {
    const val = currency === 'EUR' ? revenue / (eurRate || 4.97) : revenue;
    return Math.round(val);
  }, [revenue, currency, eurRate]);

  const revenueTrend = useMemo(() => buildRevenueTrend(revenueDisplay || 120000), [revenueDisplay]);

  const revenueTrendPct = useMemo(() => {
    if (revenueTrend.length < 2) return 0;
    const first = revenueTrend[0]!.valoare;
    const last = revenueTrend[revenueTrend.length - 1]!.valoare;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [revenueTrend]);

  const recentProjects = useMemo(
    () => projects.filter((p) => p.status !== 'finalizat' && p.status !== 'anulat').slice(0, 10),
    [projects],
  );

  const name = (user?.full_name || user?.username || 'utilizator').split(' ')[0];

  return (
    <Page fill>
      <PageHeader
        title={`Bună ziua, ${name}`}
        description="Situație generală"
        actions={(
          <div className="flex items-center gap-2">
            <LiveIndicator status={loadingDash ? 'reconnecting' : 'live'} />
            <Button variant="outline" size="sm" onClick={() => void refreshDashboard()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Reîmprospătează
            </Button>
          </div>
        )}
      />

      <PageBody>
        <AsyncContent loading={loadingDash && projects.length === 0} error={null} skeletonVariant="stat-grid">
          <DashboardGrid
            kpis={(
              <>
                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                  <KPICard
                    label="Venituri totale"
                    value={revenueDisplay}
                    format="currency"
                    currency={currency}
                    icon={<TrendingUp className="h-4 w-4 text-primary/60" />}
                    hero
                    sparkline={revenueTrend.map((r) => r.valoare)}
                    trend={{ value: revenueTrendPct, label: '6 luni' }}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                  <KPICard
                    label="Proiecte active"
                    value={activeProjects}
                    icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                  <KPICard
                    label="Necesită atenție"
                    value={attention}
                    icon={<Bell className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
                <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                  <KPICard
                    label="Blocaje predare"
                    value={handoffs.length}
                    icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
              </>
            )}
            widgets={[
              {
                id: 'revenue-chart',
                colSpan: 6,
                rowSpan: 2,
                children: (
                  <div className="v2-chart-card h-full border-0 bg-transparent p-0 shadow-none">
                    <div className="flex items-center justify-between">
                      <span className="v2-chart-label">Trend venituri — 6 luni</span>
                      <span className="text-[10px] text-muted-foreground">{currency}</span>
                    </div>
                    <AnalyticsAreaChart
                      data={revenueTrend}
                      xKey="luna"
                      yKey="valoare"
                      height={120}
                      formatValue={(v) => `${Math.round(v / 1000)}k`}
                    />
                  </div>
                ),
              },
              {
                id: 'status-dist',
                colSpan: 6,
                rowSpan: 2,
                children: (
                  <div className="v2-chart-card h-full border-0 bg-transparent p-0 shadow-none">
                    <div className="flex items-center justify-between">
                      <span className="v2-chart-label">Distribuție proiecte după status</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {[
                        { label: 'Active', value: projects.filter((p) => p.status === 'activ' || p.status === 'in_progres').length, color: 'var(--status-blue)' },
                        { label: 'Finalizate', value: projects.filter((p) => p.status === 'finalizat').length, color: 'var(--status-green)' },
                        { label: 'În așteptare', value: projects.filter((p) => p.status === 'asteptare' || p.status === 'planificat').length, color: 'var(--status-amber)' },
                        { label: 'Anulate', value: projects.filter((p) => p.status === 'anulat').length, color: 'var(--status-red)' },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{s.label}</span>
                          <span className="tabular-nums text-xs font-semibold text-foreground">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                id: 'projects',
                colSpan: 4,
                rowSpan: 3,
                children: (
                  <Card className="flex h-full min-h-0 flex-col border-0 bg-transparent shadow-none">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
                      <CardTitle>Proiecte active</CardTitle>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onNavigate('/v2/projects')}>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="v2-panel-scroll min-h-0 flex-1 space-y-1 p-3 pt-0">
                      {recentProjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Niciun proiect activ.</p>
                      ) : (
                        recentProjects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { window.location.hash = `/v2/projects/${p.id}`; }}
                            className="density-list-item flex w-full items-center justify-between gap-2 rounded-md border text-left hover:bg-muted/50"
                          >
                            <span className="truncate font-medium">{p.name}</span>
                            <StatusBadge status={p.status} />
                          </button>
                        ))
                      )}
                    </CardContent>
                  </Card>
                ),
              },
              {
                id: 'alerts',
                colSpan: 4,
                rowSpan: 3,
                children: (
                  <Card className="flex h-full min-h-0 flex-col border-0 bg-transparent shadow-none">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
                      <CardTitle>Alerte</CardTitle>
                      <Link href="/v2/alerts" className="text-xs text-primary hover:underline">Toate</Link>
                    </CardHeader>
                    <CardContent className="v2-panel-scroll min-h-0 flex-1 space-y-1 p-3 pt-0">
                      {(alerts ?? []).slice(0, 8).map((a) => (
                        <div key={a.id} className="density-list-item rounded-md border">
                          <p className="truncate font-medium text-[length:var(--density-fs-body)]">{a.title}</p>
                          <p className="density-meta truncate text-muted-foreground">{a.message}</p>
                        </div>
                      ))}
                      {(alerts ?? []).length === 0 && (
                        <p className="text-sm text-muted-foreground">Nicio alertă.</p>
                      )}
                    </CardContent>
                  </Card>
                ),
              },
              {
                id: 'handoffs',
                colSpan: 4,
                rowSpan: 3,
                children: (
                  <Card className="flex h-full min-h-0 flex-col border-0 bg-transparent shadow-none">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
                      <CardTitle>Predări în așteptare</CardTitle>
                      <Link href="/v2/manager-control" className="text-xs text-primary hover:underline">Control</Link>
                    </CardHeader>
                    <CardContent className="v2-panel-scroll min-h-0 flex-1 space-y-1 p-3 pt-0">
                      {handoffs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nicio predare blocată.</p>
                      ) : (
                        handoffs.slice(0, 8).map((h) => (
                          <div key={h.id} className="density-list-item rounded-md border">
                            <p className="truncate font-medium text-[length:var(--density-fs-body)]">{h.project_name}</p>
                            <p className="density-meta truncate text-muted-foreground">
                              {h.from_stage_name} → {h.to_stage_name} · SLA {formatDateTimeRo(h.sla_due_at)}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                ),
              },
            ]}
          />
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
