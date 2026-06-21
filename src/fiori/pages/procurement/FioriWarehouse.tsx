import { useEffect, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Button, AnalyticalTable,
  ObjectStatus, BusyIndicator,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { useMaterialStore } from '@/store/materialStore';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

interface StockRow {
  id: number;
  name: string;
  code: string;
  category: string;
  unit: string;
  location: string;
  stock: number;
  min_stock: number;
  stockStatus: string;
}

export default function FioriWarehouse({ user }: { user: User }) {
  const materials = useMaterialStore(s => s.materials);
  const loading = useMaterialStore(s => s.loading);
  const loaded = useMaterialStore(s => s.loaded);
  const fetchMaterials = useMaterialStore(s => s.fetchMaterials);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  const rows = useMemo<StockRow[]>(() => materials.map(m => {
    const critic = m.stock <= m.min_stock && m.min_stock > 0;
    return {
      id: m.id,
      name: m.name,
      code: m.code,
      category: m.category || '—',
      unit: m.unit || '—',
      location: m.location || '—',
      stock: m.stock,
      min_stock: m.min_stock,
      stockStatus: critic ? 'Stoc critic' : 'OK',
    };
  }), [materials]);

  const columnsDef = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Material', accessor: 'name', minWidth: 220 },
    { Header: 'Cod', accessor: 'code', width: 140 },
    { Header: 'Categorie', accessor: 'category', minWidth: 150 },
    { Header: 'UM', accessor: 'unit', width: 90 },
    { Header: 'Locație', accessor: 'location', minWidth: 150 },
    {
      Header: 'Stoc curent',
      accessor: 'stock',
      width: 130,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value as number).toLocaleString('ro-RO'),
    },
    {
      Header: 'Stoc minim',
      accessor: 'min_stock',
      width: 130,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value as number).toLocaleString('ro-RO'),
    },
    {
      Header: 'Status stoc',
      accessor: 'stockStatus',
      width: 150,
      Cell: ({ value }: AnalyticalTableCellInstance) => {
        const v = value as string;
        return (
          <ObjectStatus state={v === 'OK' ? statusState('ok') : statusState('restanta')}>
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
          <Title slot="heading" level="H3">Depozit</Title>
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
            noDataText={user ? 'Niciun material în stoc' : 'Fără date'}
          />
        )}
      </div>
    </DynamicPage>
  );
}
