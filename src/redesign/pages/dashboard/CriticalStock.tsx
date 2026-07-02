import { AlertTriangle } from '@/icons';
import type { Material } from '@/store/materialStore';
import { Panel } from '@/app-ui';
import EmptyState from '@/redesign/ui/EmptyState';
import type { NavigateFn } from './types';
import { DASH_EMPTY, DASH_LIST_ROW, DASH_PANEL } from './density';

interface CriticalStockProps {
  canWarehouse: boolean;
  materials: Material[];
  lowStockCount: number;
  onNavigate: NavigateFn;
}

export default function CriticalStock({
  canWarehouse,
  materials,
  lowStockCount,
  onNavigate,
}: CriticalStockProps) {
  return (
    <Panel
      title="Stoc sub minim"
      subtitle={canWarehouse ? `${lowStockCount} materiale critice` : 'Fără acces la depozit'}
      fill
      scroll
      className={DASH_PANEL}
      actions={canWarehouse ? (
        <button
          type="button"
          onClick={() => onNavigate('warehouse')}
          className="text-pm-2xs font-semibold text-accent hover:underline"
        >
          Deschide depozitul
        </button>
      ) : undefined}
    >
      {!canWarehouse ? (
        <EmptyState
          icon={AlertTriangle}
          title="Fără acces la stocuri"
          description="Nu ai permisiune pentru inventarul din depozit."
          className={DASH_EMPTY}
        />
      ) : materials.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Niciun material sub minim"
          description="Pragurile minime sunt respectate pentru materialele urmărite."
          className={DASH_EMPTY}
        />
      ) : (
        <ul className="divide-y divide-line/40">
          {materials.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onNavigate('materials')}
                className={`${DASH_LIST_ROW} items-center justify-between`}
              >
                <span className="truncate text-pm-sm leading-snug text-content-primary">{m.name}</span>
                <span className="shrink-0 text-pm-sm tabular-nums leading-none">
                  <span className="font-semibold text-status-red">{m.stock}</span>
                  <span className="text-pm-2xs text-content-muted"> / {m.min_stock}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
