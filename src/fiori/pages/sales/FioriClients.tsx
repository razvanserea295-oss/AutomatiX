import { useEffect, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable, Button,
  BusyIndicator, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition } from '@ui5/webcomponents-react';
import { useClientStore } from '@/store/clientStore';
import { useProjectStore } from '@/store/projectStore';
import { statusState } from '@/fiori/lib/statusState';
import type { Client, User } from '@/core/types';

// The clients table carries fiscal/location columns (migr. 061 + base schema)
// that aren't on the lean base `Client` type. Mirror the SaaS page's extension.
type ClientRow = Client & {
  cui?: string;
  city?: string;
  county?: string;
};

// SaaS derives a client's status from its linked projects: a client with at
// least one non-finalised, non-cancelled project is "Activ", otherwise "Inactiv".
function isProjectActive(status: string): boolean {
  return status !== 'finalizat' && status !== 'anulat';
}

export default function FioriClients(_props: { user: User }) {
  const clients = useClientStore(s => s.clients) as ClientRow[];
  const loading = useClientStore(s => s.loading);
  const fetchClients = useClientStore(s => s.fetchClients);

  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);

  useEffect(() => {
    void fetchClients();
    void fetchProjects();
  }, [fetchClients, fetchProjects]);

  // Set of client ids that have at least one active project → "Activ".
  const activeClientIds = useMemo(() => {
    const ids = new Set<number>();
    projects.forEach(p => { if (isProjectActive(p.status)) ids.add(p.client_id); });
    return ids;
  }, [projects]);

  const rows = useMemo(() => clients.map(c => ({
    ...c,
    statusLabel: activeClientIds.has(c.id) ? 'Activ' : 'Inactiv',
  })), [clients, activeClientIds]);

  const dash = (v: unknown) => (v ? String(v) : '—');

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Denumire', accessor: 'name', minWidth: 200 },
    { Header: 'CUI', accessor: 'cui', width: 130, Cell: ({ value }) => dash(value) },
    { Header: 'Persoană contact', accessor: 'contact_person', minWidth: 160, Cell: ({ value }) => dash(value) },
    { Header: 'Email', accessor: 'email', minWidth: 180, Cell: ({ value }) => dash(value) },
    { Header: 'Telefon', accessor: 'phone', width: 140, Cell: ({ value }) => dash(value) },
    { Header: 'Oraș', accessor: 'city', minWidth: 130, Cell: ({ value }) => dash(value) },
    {
      Header: 'Status', accessor: 'statusLabel', width: 120,
      Cell: ({ value }) => (
        <ObjectStatus state={statusState(String(value))}>{String(value)}</ObjectStatus>
      ),
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Clienți</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            design="Transparent"
            onClick={() => { void fetchClients(true); void fetchProjects(true); }}
          >
            Reîmprospătează
          </Button>
        </div>
        {loading && clients.length === 0 ? (
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
