import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable,
  ObjectStatus, BusyIndicator, Button,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

type Mode = 'inbox' | 'sent' | 'all';
type Status =
  | 'draft' | 'sent' | 'acknowledged' | 'clarification_requested'
  | 'accepted' | 'rejected' | 'completed' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface Briefing {
  id: number;
  title: string;
  project_id: number | null;
  project_name: string | null;
  created_by_user_id: number;
  created_by_name: string;
  assigned_to_user_id: number;
  assigned_to_name: string;
  scope: string | null;
  technical_requirements: string | null;
  client_expectations: string | null;
  deadline: string | null;
  priority: Priority;
  status: Status;
  rejection_reason: string | null;
  completed_at: string | null;
  created_at: string;
  open_clarifications: number;
}

const STATUS_LABEL: Record<Status, string> = {
  draft: 'Ciornă',
  sent: 'Trimis',
  acknowledged: 'Văzut',
  clarification_requested: 'Clarificare',
  accepted: 'Acceptat',
  rejected: 'Refuzat',
  completed: 'Finalizat',
  cancelled: 'Anulat',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Scăzută', medium: 'Medie', high: 'Înaltă', critical: 'Critică',
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FioriBriefings({ user }: { user: User }) {
  const [mode, setMode] = useState<Mode>('inbox');
  const [rows, setRows] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role_name === 'admin';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await apiCommand<Briefing[]>('get_project_briefings', { mode });
      setRows(Array.isArray(items) ? items : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { void refresh(); }, [refresh]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Titlu', accessor: 'title', minWidth: 220 },
    {
      Header: 'Proiect', accessor: 'project_name', minWidth: 160,
      Cell: ({ value }) => (value as string | null) || '— Standalone —',
    },
    {
      Header: 'Autor', accessor: 'created_by_name', width: 160,
    },
    {
      Header: 'Destinatar', accessor: 'assigned_to_name', width: 160,
    },
    {
      Header: 'Prioritate', accessor: 'priority', width: 120,
      Cell: ({ value }) => {
        const p = value as Priority | undefined;
        return p ? PRIORITY_LABEL[p] ?? p : '—';
      },
    },
    {
      Header: 'Dată', accessor: 'created_at', width: 150,
      Cell: ({ value }) => formatDate((value as string | null) ?? null),
    },
    {
      Header: 'Deadline', accessor: 'deadline', width: 150,
      Cell: ({ value }) => formatDate((value as string | null) ?? null),
    },
    {
      Header: 'Status', accessor: 'status', width: 150,
      Cell: ({ value }) => {
        const s = value as Status | undefined;
        return <ObjectStatus state={statusState(s)}>{s ? STATUS_LABEL[s] ?? s : '—'}</ObjectStatus>;
      },
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Briefinguri proiectare</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button design={mode === 'inbox' ? 'Emphasized' : 'Default'} onClick={() => setMode('inbox')}>Primite</Button>
          <Button design={mode === 'sent' ? 'Emphasized' : 'Default'} onClick={() => setMode('sent')}>Trimise</Button>
          {isAdmin && (
            <Button design={mode === 'all' ? 'Emphasized' : 'Default'} onClick={() => setMode('all')}>Toate</Button>
          )}
          <span style={{ flex: 1 }} />
          <Button design="Transparent" onClick={() => void refresh()}>Reîmprospătează</Button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
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
