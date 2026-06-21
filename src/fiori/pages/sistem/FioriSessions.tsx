import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable, Button,
  BusyIndicator, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// Mirrors the SaaS page src/redesign/pages/auth/UserSessionsPage.tsx, which reads
// the same `list_active_sessions` command. Field names match the backend exactly.
interface ActiveSession {
  session_id: string;
  user_id: number;
  username: string;
  full_name: string | null;
  role_name: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function FioriSessions({ user }: { user: User }) {
  const isAdmin = (user.role_name || '').toLowerCase() === 'admin';

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCommand<ActiveSession[]>('list_active_sessions');
      setSessions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea sesiunilor');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    void fetchSessions();
  }, [fetchSessions, isAdmin]);

  const handleForceLogout = useCallback(async (row: ActiveSession) => {
    try {
      await apiCommand<{ revoked: number }>('force_logout_user', { user_id: row.user_id });
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la deconectarea forțată');
    }
  }, [fetchSessions]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    {
      Header: 'Utilizator', accessor: 'full_name', minWidth: 200,
      Cell: ({ row }) => {
        const s = row.original as ActiveSession;
        return s.full_name || s.username;
      },
    },
    {
      Header: 'Cont', accessor: 'username', minWidth: 140,
      Cell: ({ value }) => `@${String(value)}`,
    },
    {
      Header: 'Rol', accessor: 'role_name', width: 130,
      Cell: ({ value }) => (
        <ObjectStatus state={statusState(String(value || ''))}>
          {value ? String(value) : '—'}
        </ObjectStatus>
      ),
    },
    {
      Header: 'Adresă IP', accessor: 'ip_address', width: 150,
      Cell: ({ value }) => (value ? String(value) : '—'),
    },
    {
      Header: 'Conectat la', accessor: 'created_at', width: 170,
      Cell: ({ value }) => formatDateTime(value as string | null),
    },
    {
      Header: 'Expiră la', accessor: 'expires_at', width: 170,
      Cell: ({ value }) => formatDateTime(value as string | null),
    },
    {
      Header: 'Acțiuni', accessor: 'session_id', width: 160, disableFilters: true, disableSortBy: true,
      Cell: ({ row }) => (
        <Button
          design="Transparent"
          onClick={() => { void handleForceLogout(row.original as ActiveSession); }}
        >
          Deconectează
        </Button>
      ),
    },
  ], [handleForceLogout]);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Sesiuni active</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button design="Transparent" disabled={!isAdmin} onClick={() => { void fetchSessions(); }}>
            Reîmprospătează
          </Button>
        </div>

        {!isAdmin ? (
          <ObjectStatus state="Negative">
            Acces restricționat — doar administratorii pot vedea sesiunile active.
          </ObjectStatus>
        ) : error ? (
          <ObjectStatus state="Negative">{error}</ObjectStatus>
        ) : loading && sessions.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={sessions}
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
