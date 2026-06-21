import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable,
  ObjectStatus, Button, BusyIndicator,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// Mirrors the SaaS Achiziții → "Comenzi achizitie" tab
// (src/redesign/pages/procurement/ProcurementWorkspacePage.tsx, PurchaseOrdersTab),
// loaded through the same `get_purchase_orders` command the SaaS page uses.
interface PurchaseOrder {
  id: number;
  order_number: string;
  supplier_name: string;
  order_date: string;
  status: string;
  total: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'În așteptare',
  in_asteptare: 'În așteptare',
  completed: 'Finalizată',
  finalizata: 'Finalizată',
  livrata: 'Livrată',
  cancelled: 'Anulată',
  anulata: 'Anulată',
  anulat: 'Anulat',
};

function statusLabel(status: string): string {
  return STATUS_LABEL[(status || '').toLowerCase()] ?? status;
}

function formatMoney(value: number): string {
  return `${(value ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ro-RO');
}

export default function FioriPurchaseOrders(_props: { user: User }) {
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(() => {
    setLoading(true);
    apiCommand<PurchaseOrder[]>('get_purchase_orders')
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Nr. comandă', accessor: 'order_number', width: 170 },
    { Header: 'Furnizor', accessor: 'supplier_name', minWidth: 220 },
    {
      Header: 'Dată',
      accessor: 'order_date',
      width: 140,
      Cell: ({ value }: AnalyticalTableCellInstance) => <span>{formatDate(value as string | null)}</span>,
    },
    {
      Header: 'Status',
      accessor: 'status',
      width: 160,
      Cell: ({ value }: AnalyticalTableCellInstance) => (
        <ObjectStatus state={statusState(value as string)}>
          {statusLabel(value as string)}
        </ObjectStatus>
      ),
    },
    {
      Header: 'Valoare',
      accessor: 'total',
      width: 170,
      hAlign: 'End',
      Cell: ({ value }: AnalyticalTableCellInstance) => <span>{formatMoney(value as number)}</span>,
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          actionsBar={
            <Button slot="actionsBar" design="Transparent" icon="refresh" onClick={fetchAll}>
              Reîmprospătează
            </Button>
          }
        >
          <Title slot="heading" level="H3">Comenzi de aprovizionare</Title>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '20rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={rows}
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
