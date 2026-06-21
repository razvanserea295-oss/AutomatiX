import { useEffect, useMemo, type ComponentProps } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Button, AnalyticalTable,
  ObjectStatus, BusyIndicator,
} from '@ui5/webcomponents-react';
import type { CellInstance } from '@ui5/webcomponents-react/dist/components/AnalyticalTable/types/index.js';
import { useSalesStore, type SalesLead } from '@/store/salesStore';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

type Columns = ComponentProps<typeof AnalyticalTable>['columns'];

// Mirror the SaaS pipeline stage labels (src/redesign/pages/sales/SalesHubPage.tsx).
const STAGE_LABEL: Record<string, string> = {
  fara_contact: 'Fără contact',
  decizie_client: 'Decizie client',
  decizie_noastra: 'Decizie noastră',
  in_negocieri: 'În negocieri',
  convertit: 'Convertit',
};

function stageLabel(status: string): string {
  return STAGE_LABEL[status] ?? status;
}

function money(v: number | null | undefined): string {
  return (v ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' EUR';
}

export default function FioriSalesHub({ user }: { user: User }) {
  const leads = useSalesStore(s => s.leads);
  const loading = useSalesStore(s => s.loading);
  const fetchLeads = useSalesStore(s => s.fetchLeads);

  useEffect(() => { void fetchLeads(true); }, [fetchLeads]);

  const isManagerOrAdmin = ['admin', 'manager'].includes((user.role_name || '').toLowerCase());

  const columns = useMemo<Columns>(() => [
    {
      Header: 'Etapă',
      accessor: 'status',
      minWidth: 150,
      Cell: ({ value }: CellInstance) => (
        <ObjectStatus state={statusState(value as string)}>{stageLabel(value as string)}</ObjectStatus>
      ),
    },
    { Header: 'Client', accessor: 'client_name', minWidth: 180 },
    {
      Header: 'Produs / Interes',
      accessor: 'product_interest',
      minWidth: 180,
      Cell: ({ value }: CellInstance) => (value as string | null) || '—',
    },
    {
      Header: 'Valoare estimată',
      accessor: 'estimated_value',
      hAlign: 'End',
      width: 160,
      Cell: ({ value }: CellInstance) => money(value as number),
    },
    {
      Header: 'Responsabil',
      accessor: 'assigned_to_name',
      minWidth: 160,
      Cell: ({ row }: CellInstance) => {
        const lead = row.original as SalesLead;
        return lead.assigned_to_name || lead.created_by_name || '—';
      },
    },
    {
      Header: 'Locație',
      accessor: 'location',
      minWidth: 150,
      Cell: ({ value }: CellInstance) => (value as string | null) || '—',
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          actionsBar={
            <div slot="actionsBar" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Button design="Emphasized" onClick={() => void fetchLeads(true)}>Reîmprospătează</Button>
              {isManagerOrAdmin && (
                <Button design="Transparent">{`Total: ${leads.length}`}</Button>
              )}
            </div>
          }
        >
          <Title slot="heading" level="H3">Sales Hub</Title>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={leads}
            columns={columns}
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
