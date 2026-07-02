import { Factory, FileText, Package, Target, TrendingUp } from '@/icons';
import type { SalesStats } from '@/store/dashboardStore';
import { Panel } from '@/app-ui';
import type { NavigateFn } from './types';
import { DASH_PANEL } from './density';

interface OperationalSnapshotProps {
  fmtCount: (n: number) => string;
  totalDocuments: number;
  totalMaterials: number;
  inProduction: number;
  lowStockCount: number;
  canWarehouse: boolean;
  canSales: boolean;
  salesStats: SalesStats | null;
  onNavigate: NavigateFn;
}

interface MetricCellProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'danger';
  onClick?: () => void;
}

function MetricCell({ label, value, hint, tone = 'default', onClick }: MetricCellProps) {
  const toneCls = tone === 'danger' ? 'text-status-red' : 'text-content-primary';
  const base = 'bg-surface-primary px-2.5 py-2 text-left';

  const inner = (
    <>
      <p className="truncate text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">{label}</p>
      <p className={`mt-0.5 truncate text-pm-md font-semibold tabular-nums leading-none ${toneCls}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-pm-2xs text-content-muted">{hint}</p>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} transition-colors hover:bg-surface-tertiary/40`}>
        {inner}
      </button>
    );
  }

  return <div className={base}>{inner}</div>;
}

export default function OperationalSnapshot({
  fmtCount,
  totalDocuments,
  totalMaterials,
  inProduction,
  lowStockCount,
  canWarehouse,
  canSales,
  salesStats,
  onNavigate,
}: OperationalSnapshotProps) {
  const staleLeads = salesStats?.stale_leads ?? 0;
  const inNegotiation = salesStats?.in_negocieri ?? 0;

  return (
    <Panel title="Operațional" subtitle="Producție · stoc · vânzări" fill scroll className={DASH_PANEL}>
      <div className="grid grid-cols-3 gap-px bg-line/40">
        <MetricCell
          label="Documente"
          value={fmtCount(totalDocuments)}
          hint="Financiar"
          onClick={() => onNavigate('documents')}
        />
        <MetricCell
          label="Materiale"
          value={fmtCount(totalMaterials)}
          hint="Inventar"
          onClick={() => onNavigate('materials')}
        />
        <MetricCell
          label="În producție"
          value={fmtCount(inProduction)}
          hint="Pe hală"
          onClick={() => onNavigate('production')}
        />
        <MetricCell
          label="Stoc critic"
          value={canWarehouse ? fmtCount(lowStockCount) : '—'}
          tone={lowStockCount > 0 ? 'danger' : 'default'}
          hint={canWarehouse ? 'Sub minim' : 'Fără acces'}
          onClick={canWarehouse ? () => onNavigate('warehouse') : undefined}
        />
        {canSales && (
          <>
            <MetricCell
              label="Negocieri"
              value={fmtCount(inNegotiation)}
              hint="Pipeline"
              onClick={() => onNavigate('sales-hub')}
            />
            <MetricCell
              label="Lead-uri"
              value={fmtCount(staleLeads)}
              tone={staleLeads > 0 ? 'danger' : 'default'}
              hint="Inactive 7+ zile"
              onClick={() => onNavigate('sales-hub')}
            />
          </>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-x-1.5 gap-y-0.5 border-t border-line/40 px-2 py-1.5">
        <button type="button" onClick={() => onNavigate('documents')} className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-pm-2xs font-medium text-content-muted transition-colors hover:bg-surface-tertiary/50 hover:text-accent">
          <FileText className="h-3 w-3" /> Documente
        </button>
        <button type="button" onClick={() => onNavigate('production')} className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-pm-2xs font-medium text-content-muted transition-colors hover:bg-surface-tertiary/50 hover:text-accent">
          <Factory className="h-3 w-3" /> Producție
        </button>
        <button type="button" onClick={() => onNavigate('warehouse')} className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-pm-2xs font-medium text-content-muted transition-colors hover:bg-surface-tertiary/50 hover:text-accent">
          <Package className="h-3 w-3" /> Depozit
        </button>
        {canSales && (
          <button type="button" onClick={() => onNavigate('sales-hub')} className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-pm-2xs font-medium text-content-muted transition-colors hover:bg-surface-tertiary/50 hover:text-accent">
            <Target className="h-3 w-3" /> Vânzări
          </button>
        )}
        <button type="button" onClick={() => onNavigate('reports')} className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-pm-2xs font-medium text-content-muted transition-colors hover:bg-surface-tertiary/50 hover:text-accent">
          <TrendingUp className="h-3 w-3" /> Rapoarte
        </button>
      </div>
    </Panel>
  );
}
