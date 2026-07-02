import { lazy, Suspense } from 'react';
import { Loader2, Wallet } from '@/icons';
import type { Project } from '@/core/types';
import EmptyState from '@/redesign/ui/EmptyState';
import { DASH_EMPTY, DASH_HERO_BLEED, DASH_HERO_CHART_HEIGHT, DASH_HERO_SHELL } from './density';
import ProjectsStatusChart from './ProjectsStatusChart';
import { PANEL_LOADING } from '@/redesign/layout/constants';

const RevenueChartWidget = lazy(() => import('@/components/RevenueChartWidget'));

interface DashboardHeroChartProps {
  canFinance: boolean;
  canProjects: boolean;
  projects: Project[];
  displayCurrency: string;
}

export default function DashboardHeroChart({
  canFinance,
  canProjects,
  projects,
  displayCurrency,
}: DashboardHeroChartProps) {
  const showFinance = canFinance;
  const showProjects = !showFinance && canProjects;

  return (
    <section
      className={`${DASH_HERO_SHELL} ${DASH_HERO_BLEED} stagger-in`}
      aria-label={showFinance ? 'Evoluție venituri' : 'Distribuție proiecte'}
    >
      <div className="border-b border-line/30 pb-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-3 px-3 sm:px-4 lg:px-6">
          <div className="min-w-0">
            <h2 className="text-pm-xs font-bold uppercase tracking-[0.14em] text-content-muted">
              {showFinance ? 'Evoluție venituri' : 'Portofoliu proiecte'}
            </h2>
            <p className="mt-0.5 text-pm-2xs text-content-muted">
              {showFinance
                ? `Venit realizat și oferte active · ${displayCurrency}`
                : 'Distribuție după status'}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        {showFinance ? (
          <Suspense
            fallback={(
              <div className={`${PANEL_LOADING} ${DASH_HERO_CHART_HEIGHT} border-0 bg-transparent`}>
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          >
            <RevenueChartWidget />
          </Suspense>
        ) : showProjects ? (
          <div className="px-0">
            <ProjectsStatusChart projects={projects} variant="hero" />
          </div>
        ) : (
          <EmptyState
            icon={Wallet}
            title="Date indisponibile"
            description="Nu ai permisiunea necesară pentru graficul principal al tabloului de bord."
            className={`${DASH_EMPTY} !min-h-[240px] lg:!min-h-[320px] border-0 bg-transparent`}
          />
        )}
      </div>
    </section>
  );
}
