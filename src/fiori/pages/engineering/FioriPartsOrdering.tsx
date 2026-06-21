import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable, Button,
  ObjectStatus, BusyIndicator, MessageStrip,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// Mirrors the SaaS PiecesOrderingPage data shape (command: get_piece_orders).
type Status = 'requested' | 'ordered' | 'arrived' | 'installed' | 'cancelled';

interface OrderRow {
  id: number;
  piece_id: number;
  status: Status;
  supplier_code: string | null;
  quantity: number;
  notes: string | null;
  requested_by_name: string | null;
  requested_at: string;
  ordered_at: string | null;
  arrived_at: string | null;
  installed_at: string | null;
  piece_name: string;
  piece_category: string;
  source_file_name: string | null;
  project_id: number;
  project_name: string;
}

const STATUS_LABEL: Record<Status, string> = {
  requested: 'Cerut',
  ordered: 'Comandat',
  arrived: 'Sosit',
  installed: 'Montat',
  cancelled: 'Anulat',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ro-RO');
}

// react-table v7 cell renderer arg (loose shape the AnalyticalTable passes in).
interface CellArg { value: unknown }

export default function FioriPartsOrdering({ user }: { user: User }) {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = (user.role_name || '').toLowerCase() === 'admin';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiCommand<OrderRow[]>('get_piece_orders', {});
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setError('Nu pot încărca cererile de aprovizionare.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // "De comandat" — reperele care încă trebuie comandate (status cerut).
  const toOrder = useMemo(() => rows.filter(r => r.status === 'requested'), [rows]);

  const confirmOrder = useCallback(async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await apiCommand('update_piece_order_status', { id, status: 'ordered' });
      await refresh();
    } catch {
      setError('Confirmarea comenzii a eșuat.');
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Denumire', accessor: 'piece_name', minWidth: 200 },
    {
      Header: 'Cantitate', accessor: 'quantity', width: 110,
      Cell: (({ value }: CellArg) => (Number(value) || 0).toLocaleString('ro-RO')) as never,
    },
    {
      Header: 'Material', accessor: 'piece_category', minWidth: 140,
      Cell: (({ value }: CellArg) => (value as string) || '—') as never,
    },
    {
      Header: 'Furnizor', accessor: 'supplier_code', minWidth: 140,
      Cell: (({ value }: CellArg) => (value as string) || '—') as never,
    },
    {
      Header: 'Status', accessor: 'status', width: 130,
      Cell: (({ value }: CellArg) => {
        const s = value as Status;
        return <ObjectStatus state={statusState(s)}>{STATUS_LABEL[s] ?? s}</ObjectStatus>;
      }) as never,
    },
    { Header: 'Proiect', accessor: 'project_name', minWidth: 160 },
    {
      Header: 'Cerut la', accessor: 'requested_at', minWidth: 160,
      Cell: (({ value }: CellArg) => fmtDate((value as string) ?? null)) as never,
    },
    {
      Header: 'Cerut de', accessor: 'requested_by_name', minWidth: 140,
      Cell: (({ value }: CellArg) => (value as string) || '—') as never,
    },
    {
      Header: 'Acțiuni', accessor: 'id', width: 180, disableFilters: true, disableSortBy: true,
      Cell: (({ value }: CellArg) => {
        const id = value as number;
        return (
          <Button
            design="Emphasized"
            disabled={!isAdmin || busyId === id}
            onClick={() => void confirmOrder(id)}
          >
            Confirmă comandă
          </Button>
        );
      }) as never,
    },
  ], [isAdmin, busyId, confirmOrder]);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">De comandat</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button design="Transparent" onClick={() => void refresh()}>Actualizează</Button>
          <span style={{ marginLeft: 'auto', fontSize: '0.875rem', opacity: 0.7 }}>
            {toOrder.length} {toOrder.length === 1 ? 'reper de comandat' : 'repere de comandat'}
          </span>
        </div>

        {error && <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={toOrder}
            columns={columns}
            filterable
            sortable
            visibleRows={15}
            noDataText="Niciun reper de comandat"
          />
        )}
      </div>
    </DynamicPage>
  );
}
