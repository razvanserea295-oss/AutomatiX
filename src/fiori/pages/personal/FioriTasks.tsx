import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable,
  BusyIndicator, Button, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

type Priority = 'low' | 'normal' | 'high';
type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  assigned_by_name: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Deschis',
  in_progress: 'În lucru',
  done: 'Gata',
  cancelled: 'Anulat',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Scăzută',
  normal: 'Normală',
  high: 'Înaltă',
};

// Priority maps onto semantic colours: high = red, normal = blue, low = neutral.
const PRIORITY_STATE: Record<Priority, 'None' | 'Positive' | 'Critical' | 'Negative' | 'Information'> = {
  high: 'Negative',
  normal: 'Information',
  low: 'None',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ro-RO');
}

export default function FioriTasks({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<Task[]>('list_personal_tasks', { include_done: true })
      .then(rows => setTasks(Array.isArray(rows) ? rows : []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(
    () => (showDone ? tasks : tasks.filter(t => t.status !== 'done')),
    [tasks, showDone],
  );

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Titlu', accessor: 'title', minWidth: 240 },
    {
      Header: 'Prioritate', accessor: 'priority', width: 130,
      Cell: ({ value }: AnalyticalTableCellInstance) => {
        const v = value as Priority;
        return (
          <ObjectStatus state={PRIORITY_STATE[v] ?? 'None'}>
            {PRIORITY_LABEL[v] ?? v}
          </ObjectStatus>
        );
      },
    },
    {
      Header: 'Termen', accessor: 'due_date', width: 140,
      Cell: ({ value }: AnalyticalTableCellInstance) => fmtDate(value as string | null),
    },
    {
      Header: 'Status', accessor: 'status', width: 140,
      Cell: ({ value }: AnalyticalTableCellInstance) => {
        const v = value as TaskStatus;
        return <ObjectStatus state={statusState(v)}>{STATUS_LABEL[v] ?? v}</ObjectStatus>;
      },
    },
    {
      Header: 'Delegat de', accessor: 'assigned_by_name', minWidth: 160,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value as string | null) || '—',
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Task-urile mele</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button design={showDone ? 'Default' : 'Emphasized'} onClick={() => setShowDone(false)}>
            Active
          </Button>
          <Button design={showDone ? 'Emphasized' : 'Default'} onClick={() => setShowDone(true)}>
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
