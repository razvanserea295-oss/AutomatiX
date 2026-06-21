import { useEffect, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Button, AnalyticalTable,
  ObjectStatus, BusyIndicator,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { useMaterialStore } from '@/store/materialStore';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

interface MaterialRow {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  minimum_threshold: number;
  unit_cost: number;
  currency: string;
  status: string;
}

export default function FioriMaterials({ user }: { user: User }) {
  const materials = useMaterialStore(s => s.materials);
  const loading = useMaterialStore(s => s.loading);
  const loaded = useMaterialStore(s => s.loaded);
  const fetchMaterials = useMaterialStore(s => s.fetchMaterials);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  const rows = useMemo<MaterialRow[]>(() => materials.map(m => {
    const qty = m.quantity ?? m.stock ?? 0;
    const min = m.minimum_threshold ?? m.min_stock ?? 0;
    const epuizat = qty <= 0;
    const scazut = min > 0 && qty <= min;
    return {
      id: m.id,
      code: m.code || '—',
      name: m.name,
      unit: m.unit || '—',
      quantity: qty,
      minimum_threshold: min,
      unit_cost: m.unit_cost ?? 0,
      currency: m.currency || 'RON',
      status: epuizat ? 'Epuizat' : scazut ? 'Stoc scăzut' : 'În stoc',
    };
  }), [materials]);

  const columnsDef = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Cod', accessor: 'code', width: 140 },
    { Header: 'Denumire', accessor: 'name', minWidth: 240 },
    { Header: 'UM', accessor: 'unit', width: 90 },
    {
      Header: 'Stoc',
      accessor: 'quantity',
      width: 120,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value as number).toLocaleString('ro-RO'),
    },
    {
      Header: 'Prag minim',
      accessor: 'minimum_threshold',
      width: 130,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value as number).toLocaleString('ro-RO'),
    },
    {
      Header: 'Preț unitar',
      accessor: 'unit_cost',
      width: 150,
      Cell: ({ value, row }: AnalyticalTableCellInstance) =>
        `${(value as number).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${(row.original as MaterialRow).currency}`,
    },
    {
      Header: 'Status',
      accessor: 'status',
      width: 160,
      Cell: ({ value }: AnalyticalTableCellInstance) => {
        const v = value as string;
        return (
          <ObjectStatus
            state={
              v === 'Epuizat'
                ? statusState('epuizat')
                : v === 'Stoc scăzut'
                  ? 'Critical'
                  : statusState('in stoc')
            }
          >
            {v}
          </ObjectStatus>
        );
      },
    },
  ], []);

  const busy = loading && !loaded;

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          actionsBar={
            <Button
              slot="actionsBar"
              design="Emphasized"
              disabled={loading}
              onClick={() => { void fetchMaterials(true); }}
            >
              Reîmprospătează
            </Button>
          }
        >
          <Title slot="heading" level="H3">Inventar materiale</Title>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem' }}>
        {busy ? (
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
            noDataText={user ? 'Niciun material în inventar' : 'Fără date'}
          />
        )}
      </div>
    </DynamicPage>
  );
}
