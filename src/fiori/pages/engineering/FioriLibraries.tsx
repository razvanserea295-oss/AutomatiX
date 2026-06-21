import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable,
  SegmentedButton, SegmentedButtonItem, Button, BusyIndicator, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// Field shapes mirror the SaaS page src/redesign/pages/libraries/LibrariesPage.tsx
interface StdPart {
  id: number;
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  supplier_name: string | null;
  lead_time_days: number | null;
  unit: string;
  unit_cost: number;
}
interface CustPart {
  id: number;
  code: string;
  name: string;
  category: string;
  originating_project_name: string | null;
  promoted_to_standard_id: number | null;
}

type Tab = 'standard' | 'custom';

function money(v: number | null | undefined): string {
  if (!v || v <= 0) return '—';
  return v.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON';
}

export default function FioriLibraries({ user }: { user: User }) {
  void user;
  const [tab, setTab] = useState<Tab>('standard');
  const [stdParts, setStdParts] = useState<StdPart[]>([]);
  const [custParts, setCustParts] = useState<CustPart[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<StdPart[]>('get_standard_parts').then(d => setStdParts(Array.isArray(d) ? d : [])).catch(() => setStdParts([])),
      apiCommand<CustPart[]>('get_custom_parts').then(d => setCustParts(Array.isArray(d) ? d : [])).catch(() => setCustParts([])),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const stdColumns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Cod', accessor: 'code', minWidth: 120 },
    { Header: 'Denumire', accessor: 'name', minWidth: 200 },
    { Header: 'Categorie', accessor: 'category', minWidth: 140 },
    { Header: 'UM', accessor: 'unit', width: 80, Cell: ({ value }) => (value as string) || '—' },
    {
      Header: 'Cost unitar', accessor: 'unit_cost', minWidth: 130,
      Cell: ({ value }) => money(value as number),
    },
    {
      Header: 'Lead time', accessor: 'lead_time_days', width: 110,
      Cell: ({ value }) => (value ? `${value as number} zile` : '—'),
    },
    {
      Header: 'Furnizor', accessor: 'supplier_name', minWidth: 160,
      Cell: ({ value }) => (value as string | null) || '—',
    },
  ], []);

  const custColumns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Cod', accessor: 'code', minWidth: 120 },
    { Header: 'Denumire', accessor: 'name', minWidth: 200 },
    { Header: 'Categorie', accessor: 'category', minWidth: 140 },
    {
      Header: 'Proiect sursă', accessor: 'originating_project_name', minWidth: 180,
      Cell: ({ value }) => (value as string | null) || '—',
    },
    {
      Header: 'Status', accessor: 'promoted_to_standard_id', minWidth: 130,
      Cell: ({ value }) => {
        const promoted = value as number | null;
        const label = promoted ? 'Promovat' : 'Custom';
        return <ObjectStatus state={statusState(promoted ? 'aprobat' : 'nou')}>{label}</ObjectStatus>;
      },
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          actionsBar={
            <>
              <SegmentedButton
                onSelectionChange={(e) => {
                  const sel = e.detail.selectedItems?.[0]?.getAttribute('data-tab') as Tab | null;
                  if (sel) setTab(sel);
                }}
              >
                <SegmentedButtonItem data-tab="standard" selected={tab === 'standard'}>Piese standard</SegmentedButtonItem>
                <SegmentedButtonItem data-tab="custom" selected={tab === 'custom'}>Piese custom</SegmentedButtonItem>
              </SegmentedButton>
              <Button design="Transparent" onClick={load}>Reîmprospătează</Button>
            </>
          }
        >
          <Title slot="heading" level="H3">Biblioteci piese</Title>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : tab === 'standard' ? (
          <AnalyticalTable
            data={stdParts}
            columns={stdColumns}
            filterable
            sortable
            visibleRows={15}
            noDataText="Fără date"
          />
        ) : (
          <AnalyticalTable
            data={custParts}
            columns={custColumns}
            filterable
            sortable
            visibleRows={15}
            noDataText="Fără date"
          />
        )}
      </div>
    </DynamicPage>
  );
}
