import { lazy, Suspense } from 'react';
import { RefreshCw, TrendingUp, FolderKanban, Bell, AlertTriangle, Loader2, Wallet } from '@/icons';
import type { User } from '@/core/types';
import Page from '@/redesign/ui/Page';
import Button from '@/redesign/ui/Button';
import EmptyState from '@/redesign/ui/EmptyState';
import DashboardBackground from '@/components/DashboardBackground';
import { useDeferredLoading } from '@/redesign/lib/loading';
import { DashboardPageSkeleton, RefetchDim } from '@/redesign/ui/loading';
import { PageChrome, DashboardLayout, Kpi } from '@/app-ui';
import { useDashboardPage } from './dashboard/useDashboardPage';
import AttentionFeed from './dashboard/AttentionFeed';
import CriticalStock from './dashboard/CriticalStock';
import ProjectsPipeline from './dashboard/ProjectsPipeline';
import ProjectsStatusChart from './dashboard/ProjectsStatusChart';
import { DASH_KPI_GRID } from './dashboard/density';
import type { NavigateFn } from './dashboard/types';

// recharts is heavy — keep the hero chart in its own chunk.
const RevenueChartWidget = lazy(() => import('@/components/RevenueChartWidget'));

interface DashboardPageProps {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
}

export default function DashboardPage({ user, onNavigate }: DashboardPageProps) {
  const nav = onNavigate as NavigateFn;
  const {
    loading, refreshing, can, money, fmtCount, summary,
    activeProjects, criticalStock, unackedAlerts, handoffs,
    attentionCount, handleRefresh,
    profit, marginPercent, costsKnown, dateLabel,
  } = useDashboardPage(user);

  const canFinance = can('finance');
  const canProjects = can('projects');
  const canWarehouse = can('warehouse') || can('materials');

  const { showSkeleton, showExtended, elapsedMs, isPending } = useDeferredLoading(loading);

  if (loading && (isPending || !showSkeleton)) {
    return <div className="ix-loading-reserve flex-1" role="status" aria-busy aria-label="Se încarcă dashboard-ul" />;
  }

  if (loading && showSkeleton) {
    return (
      <DashboardPageSkeleton showExtended={showExtended} elapsedMs={elapsedMs} label="Se încarcă dashboard-ul" />
    );
  }

  const chartFallback = (
    <div className="flex flex-1 items-center justify-center text-content-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );

  return (
    <>
      <DashboardBackground />
      <RefetchDim isFetching={refreshing} className="flex flex-1 flex-col min-h-0">
        <DashboardLayout
          chrome={(
            <PageChrome
              actions={(
                <div className="flex items-center gap-3">
                  <span className="hidden capitalize md:inline text-pm-2xs text-content-muted">{dateLabel}</span>
                  <Button variant="secondary" size="md" onClick={() => void handleRefresh()} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Reîmprospătează</span>
                  </Button>
                </div>
              )}
            />
          )}
          bodyClassName="!overflow-hidden"
          contentClassName="flex min-h-0 flex-1 flex-col gap-2 lg:gap-2.5"
        >
          {/* ── Hero chart: the dashboard's main focal point ───────────────── */}
          <section
            aria-label={canFinance ? 'Evoluție venituri' : 'Portofoliu proiecte'}
            className="dash-hero anim-fade-slide-in relative flex min-h-0 flex-[1.7] flex-col overflow-hidden rounded-2xl bg-transparent p-2 sm:p-3 lg:p-4"
          >
            {/* ambient accent glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{ background: 'radial-gradient(92% 72% at 100% 0%, var(--color-accent-muted), transparent 62%)' }}
            />
            <div className="relative flex min-h-0 flex-1 flex-col">
              {canFinance ? (
                <Suspense fallback={chartFallback}>
                  <RevenueChartWidget />
                </Suspense>
              ) : canProjects ? (
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <div className="min-w-0">
                    <h2 className="text-pm-xs font-bold uppercase tracking-[0.14em] text-content-muted">Portofoliu proiecte</h2>
                    <p className="mt-0.5 text-pm-2xs text-content-muted">Distribuție după status</p>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ProjectsStatusChart projects={activeProjects} variant="hero" />
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Wallet}
                  title="Grafic indisponibil"
                  description="Nu ai permisiunea necesară pentru graficul principal al tabloului de bord."
                  className="!min-h-[240px] border-0 bg-transparent"
                />
              )}
            </div>
          </section>

          {/* ── KPI cards: directly under the chart ───────────────────────── */}
          <div className="kpi-strip shrink-0 stagger-in">
            <Page.Kpis cols={4} className={DASH_KPI_GRID}>
              <Kpi
                label="Venituri" value={canFinance ? money(summary.revenue) : '—'} icon={TrendingUp} locked={!canFinance}
                hint={canFinance
                  ? (costsKnown && marginPercent != null
                      ? `Profit ${money(profit)} · marjă ${marginPercent.toFixed(1)}%`
                      : `Costuri ${money(summary.costs)}`)
                  : undefined}
              />
              <Kpi
                label="Proiecte active" value={canProjects ? fmtCount(summary.active_projects) : '—'} icon={FolderKanban} locked={!canProjects}
                hint={canProjects ? `din ${fmtCount(summary.total_projects)} · ${fmtCount(summary.in_production)} în producție` : undefined}
              />
              <Kpi
                label="Necesită atenție" value={attentionCount} icon={Bell} iconColor={attentionCount > 0 ? 'text-status-amber' : undefined}
                hint={attentionCount > 0 ? `${unackedAlerts.length} alerte · ${handoffs.length} predări` : 'nimic urgent'}
              />
              <Kpi
                label="Stoc critic" value={canWarehouse ? fmtCount(summary.low_stock_count) : '—'} icon={AlertTriangle} locked={!canWarehouse}
                iconColor={canWarehouse && summary.low_stock_count > 0 ? 'text-status-red' : undefined}
                hint={canWarehouse ? `din ${fmtCount(summary.total_materials)} materiale în stoc` : undefined}
              />
            </Page.Kpis>
          </div>

          {/* ── Supporting widgets ─────────────────────────────────────────── */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 stagger-in lg:grid-cols-3 lg:gap-2.5">
            <div className="flex min-h-0 flex-col dash-widget">
              <AttentionFeed alerts={unackedAlerts} handoffs={handoffs} attentionCount={attentionCount} onNavigate={nav} />
            </div>
            <div className="flex min-h-0 flex-col dash-widget">
              <ProjectsPipeline canProjects={canProjects} activeCount={summary.active_projects} totalCount={summary.total_projects} projects={activeProjects} onNavigate={nav} />
            </div>
            <div className="flex min-h-0 flex-col dash-widget">
              <CriticalStock canWarehouse={canWarehouse} materials={criticalStock} lowStockCount={summary.low_stock_count} onNavigate={nav} />
            </div>
          </div>
        </DashboardLayout>
      </RefetchDim>
    </>
  );
}
