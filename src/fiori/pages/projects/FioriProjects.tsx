import { useEffect, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Toolbar, ToolbarSpacer,
  Button, AnalyticalTable, BusyIndicator, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { useProjectStore } from '@/store/projectStore';
import { statusState } from '@/fiori/lib/statusState';
import type { User, Project } from '@/core/types';

// Formats a value as RON currency in Romanian locale; falls back to em dash.
function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 });
}

// Formats an ISO date string in Romanian locale; falls back to em dash.
function dateRo(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ro-RO');
}

export default function FioriProjects({ user }: { user: User }) {
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const loadingProjects = useProjectStore(s => s.loadingProjects);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Număr', accessor: 'id', width: 90 },
    { Header: 'Denumire', accessor: 'name', minWidth: 220 },
    {
      Header: 'Client',
      accessor: 'client_name',
      minWidth: 180,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value as string) || '—',
    },
    {
      Header: 'Status',
      accessor: 'status',
      width: 150,
      Cell: ({ value }: AnalyticalTableCellInstance) => {
        const status = value as string | undefined;
        return <ObjectStatus state={statusState(status)}>{status || '—'}</ObjectStatus>;
      },
    },
    {
      Header: 'Termen',
      accessor: 'deadline',
      width: 140,
      Cell: ({ value }: AnalyticalTableCellInstance) => dateRo(value as string | null | undefined),
    },
    {
      Header: 'Valoare',
      accessor: 'estimated_value',
      width: 150,
      hAlign: 'End',
      Cell: ({ row }: AnalyticalTableCellInstance) => {
        const project = row.original as Project;
        return money(project.estimated_value ?? project.budget);
      },
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          actionsBar={
            <Toolbar>
              <ToolbarSpacer />
              <Button
                design="Transparent"
                icon="refresh"
                onClick={() => void fetchProjects(true)}
              >
                Reîmprospătează
              </Button>
            </Toolbar>
          }
        >
          <Title slot="heading" level="H3">Proiecte</Title>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem' }}>
        {loadingProjects && projects.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '12rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={user ? projects : []}
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
