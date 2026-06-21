import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable, Button,
  BusyIndicator, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// Mirrors the SaaS admin page src/redesign/pages/auth/UsersPage.tsx:
// loads the user list via apiCommand('get_users') (backed by UserService.getAll,
// see electron/ipc/users.ts) and renders the core account fields.
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', user: 'Utilizator', viewer: 'Vizitator',
  marketer: 'Marketer', proiectant: 'Proiectant', contabil: 'Contabil', hala: 'Șef Hală',
};

export default function FioriUsers({ user }: { user: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = (user.role_name || '').toLowerCase() === 'admin';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const u = await apiCommand<User[]>('get_users');
      setUsers(Array.isArray(u) ? u : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const dash = (v: unknown) => (v ? String(v) : '—');

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Nume', accessor: 'full_name', minWidth: 200, Cell: ({ value, row }) => dash(value || (row.original as User).username) },
    { Header: 'Utilizator', accessor: 'username', minWidth: 150 },
    { Header: 'Funcție', accessor: 'job_title', minWidth: 170, Cell: ({ value }) => dash(value) },
    { Header: 'Email', accessor: 'email', minWidth: 200, Cell: ({ value }) => dash(value) },
    {
      Header: 'Rol', accessor: 'role_name', width: 140,
      Cell: ({ value }) => dash(value ? (ROLE_LABELS[String(value)] || String(value)) : null),
    },
    {
      Header: 'Activ', accessor: 'active', width: 120,
      Cell: ({ value }) => (
        <ObjectStatus state={statusState(value ? 'activ' : 'inactiv')}>
          {value ? 'Activ' : 'Inactiv'}
        </ObjectStatus>
      ),
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Utilizatori</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            design="Transparent"
            disabled={!isAdmin}
            onClick={() => { void fetchUsers(); }}
          >
            Reîmprospătează
          </Button>
        </div>
        {loading && users.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={users}
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
