import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable,
  BusyIndicator, Button, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type TicketStatus = 'open' | 'in_progress' | 'waiting_parts' | 'waiting_client' | 'resolved' | 'closed' | 'cancelled';

interface Ticket {
  id: number;
  ticket_number: string;
  severity: Severity;
  status: TicketStatus;
  title: string;
  assigned_user_name: string | null;
  created_at: string;
  is_overdue: boolean;
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Deschis',
  in_progress: 'În lucru',
  waiting_parts: 'Aștept piese',
  waiting_client: 'Aștept client',
  resolved: 'Rezolvat',
  closed: 'Închis',
  cancelled: 'Anulat',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critică',
  high: 'Ridicată',
  medium: 'Medie',
  low: 'Scăzută',
};

// Severity maps onto the same semantic colours via statusState's RO/EN tokens.
const SEVERITY_STATE: Record<Severity, 'None' | 'Positive' | 'Critical' | 'Negative' | 'Information'> = {
  critical: 'Negative',
  high: 'Critical',
  medium: 'Information',
  low: 'None',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ro-RO');
}

export default function FioriServiceTickets({ user }: { user: User }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyOpen, setOnlyOpen] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<Ticket[]>('list_service_tickets', onlyOpen ? { only_open: true } : {})
      .then(rows => setTickets(Array.isArray(rows) ? rows : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [onlyOpen]);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Număr', accessor: 'ticket_number', width: 140 },
    { Header: 'Subiect', accessor: 'title', minWidth: 220 },
    {
      Header: 'Prioritate', accessor: 'severity', width: 130,
      Cell: ({ value }: AnalyticalTableCellInstance) => {
        const v = value as Severity;
        return (
          <ObjectStatus state={SEVERITY_STATE[v] ?? 'None'}>
            {SEVERITY_LABEL[v] ?? v}
          </ObjectStatus>
        );
      },
    },
    {
      Header: 'Status', accessor: 'status', width: 150,
      Cell: ({ value, row }: AnalyticalTableCellInstance) => {
        const v = value as TicketStatus;
        return (row.original as Ticket).is_overdue ? (
          <ObjectStatus state="Negative">SLA depășit</ObjectStatus>
        ) : (
          <ObjectStatus state={statusState(v)}>{STATUS_LABEL[v] ?? v}</ObjectStatus>
        );
      },
    },
    {
      Header: 'Dată', accessor: 'created_at', width: 180,
      Cell: ({ value }: AnalyticalTableCellInstance) => fmtDate(value as string),
    },
    {
      Header: 'Responsabil', accessor: 'assigned_user_name', minWidth: 160,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value as string | null) || 'Neasignat',
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Tichete service</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button design={onlyOpen ? 'Emphasized' : 'Default'} onClick={() => setOnlyOpen(true)}>
            Deschise
          </Button>
          <Button design={onlyOpen ? 'Default' : 'Emphasized'} onClick={() => setOnlyOpen(false)}>
            Toate
          </Button>
          <Button design="Transparent" onClick={load}>Reîmprospătează</Button>
          <span style={{ marginLeft: 'auto', color: 'var(--sapContent_LabelColor)', fontSize: '0.875rem' }}>
            {user.full_name}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={tickets}
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
