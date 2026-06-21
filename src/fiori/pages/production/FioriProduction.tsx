import { useEffect, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Button, AnalyticalTable,
  ObjectStatus, BusyIndicator, ProgressIndicator,
} from '@ui5/webcomponents-react';
import type { AnalyticalTablePropTypes } from '@ui5/webcomponents-react';
import { useProjectStore } from '@/store/projectStore';
import { statusState } from '@/fiori/lib/statusState';
import { deriveStatusFromStageId } from '@/store/projectStore';
import type { User } from '@/core/types';

interface ProductionRow {
  id: number;
  name: string;
  client_name: string;
  stage: string;
  stageOrder: number;
  progress: number;
  priority: string;
  status: string;
  estimated_value: number;
}

// "progres" = how far through the pipeline this project's current stage sits.
// Derived purely from the real board ordering (stage.order_index over the max).
function stageProgress(orderIndex: number, maxOrder: number): number {
  if (maxOrder <= 0) return 0;
  return Math.round((orderIndex / maxOrder) * 100);
}

export default function FioriProduction({ user }: { user: User }) {
  const columns = useProjectStore(s => s.productionBoard);
  const loadingBoard = useProjectStore(s => s.loadingBoard);
  const boardLoaded = useProjectStore(s => s.boardLoaded);
  const fetchProductionBoard = useProjectStore(s => s.fetchProductionBoard);

  useEffect(() => {
    void fetchProductionBoard();
  }, [fetchProductionBoard]);

  const maxOrder = useMemo(
    () => columns.reduce((m, c) => Math.max(m, c.stage.order_index), 0),
    [columns],
  );

  const rows = useMemo<ProductionRow[]>(() => {
    const out: ProductionRow[] = [];
    for (const col of columns) {
      for (const p of col.projects) {
        out.push({
          id: p.id,
          name: p.name,
          client_name: p.client_name || '—',
          stage: col.stage.name,
          stageOrder: col.stage.order_index,
          progress: stageProgress(col.stage.order_index, maxOrder),
          priority: p.priority || '—',
          status: deriveStatusFromStageId(col.stage.id, 'în producție'),
          estimated_value: p.estimated_value,
        });
      }
    }
    return out;
  }, [columns, maxOrder]);

  const columnsDef = useMemo<AnalyticalTablePropTypes['columns']>(() => [
    { Header: 'Proiect', accessor: 'name', minWidth: 200 },
    { Header: 'Client', accessor: 'client_name', minWidth: 160 },
    { Header: 'Etapă', accessor: 'stage', minWidth: 180 },
    {
      Header: 'Progres',
      accessor: 'progress',
      width: 160,
      Cell: ({ value }) => {
        const pct = Number(value) || 0;
        return <ProgressIndicator value={pct} displayValue={`${pct}%`} style={{ width: '100%' }} />;
      },
    },
    { Header: 'Prioritate', accessor: 'priority', width: 120 },
    {
      Header: 'Valoare estimată',
      accessor: 'estimated_value',
      width: 150,
      Cell: ({ value }) => {
        const v = Number(value) || 0;
        return v > 0 ? `${v.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} lei` : '—';
      },
    },
    {
      Header: 'Status',
      accessor: 'status',
      width: 150,
      Cell: ({ value }) => <ObjectStatus state={statusState(String(value))}>{String(value)}</ObjectStatus>,
    },
  ], []);

  const loading = loadingBoard && !boardLoaded;

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          actionsBar={
            <Button
              slot="actionsBar"
              design="Emphasized"
              disabled={loadingBoard}
              onClick={() => { void fetchProductionBoard(true); }}
            >
              Reîmprospătează
            </Button>
          }
        >
          <Title slot="heading" level="H3">Producție</Title>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={rows}
            columns={columnsDef}
            filterable
            sortable
            visibleRows={15}
            noDataText={user ? 'Niciun proiect în producție' : 'Fără date'}
          />
        )}
      </div>
    </DynamicPage>
  );
}
