import { lazy, Suspense } from 'react';
import { Loader2, Wallet } from '@/icons';
import { Panel } from '@/app-ui';
import EmptyState from '@/redesign/ui/EmptyState';
import { DASH_EMPTY, DASH_PANEL } from './density';
import { PANEL_LOADING } from '@/redesign/layout/constants';

const RevenueChartWidget = lazy(() => import('@/components/RevenueChartWidget'));

interface RevenuePanelProps {
  canFinance: boolean;
  costsKnown: boolean;
  displayCurrency: string;
  money: (n: number) => string;
  revenue: number;
  costs: number;
  marginPercent: number | null;
}

export default function RevenuePanel({
  canFinance,
  costsKnown,
  displayCurrency,
  money,
  revenue,
  costs,
  marginPercent,
}: RevenuePanelProps) {
  return (
    <Panel
      title="Evoluție venituri"
      subtitle={displayCurrency}
      fill
      className={DASH_PANEL}
      bodyClassName="!overflow-hidden flex min-h-0 flex-col"
    >
      {canFinance && (
        <div className="grid shrink-0 grid-cols-3 divide-x divide-line/60 border-b border-line/60 bg-surface-secondary/25">
          <div className="px-3 py-1.5">
            <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Venituri</p>
            <p className="mt-0.5 text-pm-sm font-semibold tabular-nums leading-none text-content-primary">{money(revenue)}</p>
          </div>
          <div className="px-3 py-1.5">
            <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Costuri</p>
            <p className="mt-0.5 text-pm-sm font-semibold tabular-nums leading-none text-content-primary">
              {costsKnown ? money(costs) : '—'}
            </p>
          </div>
          <div className="px-3 py-1.5">
            <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Marjă</p>
            <p className={`mt-0.5 text-pm-sm font-semibold tabular-nums leading-none ${marginPercent != null && marginPercent < 0 ? 'text-status-red' : 'text-content-primary'}`}>
              {marginPercent == null ? '—' : `${marginPercent.toFixed(1)}%`}
            </p>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col p-2 lg:p-2.5">
        {!canFinance ? (
          <EmptyState
            icon={Wallet}
            title="Date financiare restricționate"
            description="Nu ai permisiunea necesară pentru graficul de venituri și costuri."
            className={DASH_EMPTY}
          />
        ) : (
          <Suspense fallback={(
            <div className={`${PANEL_LOADING} min-h-[10rem] lg:min-h-0`}>
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}>
            <RevenueChartWidget />
          </Suspense>
        )}
      </div>
    </Panel>
  );
}
