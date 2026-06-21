import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable,
  ObjectStatus, Button, BusyIndicator,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// Mirrors the SaaS QuotationsPage data shape (src/redesign/pages/sales/QuotationsPage.tsx),
// loaded through the same `list_quotations` command the SaaS page uses.
interface QuotationLine {
  id?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  total: number;
  order_index: number;
}
interface Quotation {
  id: number;
  quotation_number: string;
  client_name: string;
  title: string;
  currency: string;
  total: number;
  status: string;
  created_at: string;
  valid_until: string | null;
  lines: QuotationLine[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Ciornă',
  sent: 'Trimisă',
  viewed: 'Vizualizată',
  accepted: 'Acceptată',
  rejected: 'Refuzată',
  expired: 'Expirată',
  converted: 'Convertită',
};

function formatMoney(value: number, currency: string): string {
  return `${(value ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || 'RON'}`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ro-RO');
}

export default function FioriQuotations(_props: { user: User }) {
  const [rows, setRows] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(() => {
    setLoading(true);
    apiCommand<Quotation[]>('list_quotations')
      .then((qs) => setRows(Array.isArray(qs) ? qs : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Număr', accessor: 'quotation_number', width: 150 },
    { Header: 'Titlu', accessor: 'title', minWidth: 200 },
    { Header: 'Client', accessor: 'client_name', minWidth: 180 },
    {
      Header: 'Valoare',
      accessor: 'total',
      width: 160,
      hAlign: 'End',
      Cell: ({ row }: AnalyticalTableCellInstance) => {
        const q = row.original as Quotation;
        return <span>{formatMoney(q.total, q.currency)}</span>;
      },
    },
    {
      Header: 'Dată',
      accessor: 'created_at',
      width: 130,
      Cell: ({ value }: AnalyticalTableCellInstance) => (
        <span>{formatDate(value as string | null)}</span>
      ),
    },
    {
      Header: 'Status',
      accessor: 'status',
      width: 150,
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
            <Button slot="actionsBar" design="Transparent" icon="refresh" onClick={fetchAll}>
              Reîmprospătează
            </Button>
          }
        >
          <Title slot="heading" level="H3">Oferte comerciale</Title>
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
