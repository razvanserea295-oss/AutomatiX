import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable,
  ObjectStatus, BusyIndicator, Button,
} from '@ui5/webcomponents-react';
import type {
  AnalyticalTableColumnDefinition,
  AnalyticalTableCellInstance,
} from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// Mirrors the Contract shape returned by the `get_contracts` command,
// the same source the SaaS ContractPage uses (src/redesign/pages/contract/ContractPage.tsx).
interface Contract {
  id: number;
  project_id: number;
  project_name: string;
  contract_code: string;
  title: string;
  client_id: number;
  client_name: string;
  site_location: string | null;
  delivered_product: string | null;
  sale_price: number;
  execution_term: string | null;
  pif_term: string | null;
  status: string;
  revision: number;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activ',
  amended: 'Amendat',
  closed: 'Închis',
};

function formatMoney(v: number | null | undefined): string {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

function formatDate(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ro-RO');
}

export default function FioriContracts({ user }: { user: User }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = useCallback(() => {
    setLoading(true);
    apiCommand<Contract[]>('get_contracts')
      .then(rows => setContracts(Array.isArray(rows) ? rows : []))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Număr', accessor: 'contract_code', width: 150 },
    { Header: 'Titlu', accessor: 'title', minWidth: 200 },
    { Header: 'Client', accessor: 'client_name', minWidth: 180 },
    {
      Header: 'Valoare',
      accessor: 'sale_price',
      width: 150,
      Cell: ({ value }: AnalyticalTableCellInstance) => formatMoney(value as number),
    },
    {
      Header: 'Dată semnare',
      accessor: 'created_at',
      width: 150,
      Cell: ({ value }: AnalyticalTableCellInstance) => formatDate(value as string),
    },
    {
      Header: 'Status',
      accessor: 'status',
      width: 140,
      Cell: ({ value }: AnalyticalTableCellInstance) => {
        const status = String(value ?? '');
        return (
          <ObjectStatus state={statusState(status)}>
            {STATUS_LABEL[status] ?? status}
          </ObjectStatus>
        );
      },
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          actionsBar={
            <Button slot="actionsBar" design="Transparent" onClick={fetchContracts}>
              Reîmprospătează
            </Button>
          }
        >
          <Title slot="heading" level="H3">Contracte</Title>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={contracts}
            columns={columns}
            filterable
            sortable
            visibleRows={15}
            noDataText="Fără date"
          />
        )}
      </div>
      <div style={{ display: 'none' }}>{user.username}</div>
    </DynamicPage>
  );
}
