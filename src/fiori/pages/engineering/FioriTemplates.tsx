import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable,
  BusyIndicator, ObjectStatus, Toolbar, ToolbarButton,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// Mirrors the SaaS source page (src/redesign/pages/FisaTemplatesPage.tsx):
// data shape, field names and the load command are identical.
interface Template {
  id: number;
  name: string;
  description: string | null;
  schema_json: string;
  column_weights_json?: string | null;
  created_by_user_id: number | null;
  created_by_name: string | null;
  is_default: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Minimal shape of the props the AnalyticalTable passes to a custom `Cell`.
interface CellProps {
  value: unknown;
  row: { original: Template };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function FioriTemplates({ user }: { user: User }) {
  const isAdmin = user?.role_name === 'admin';
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCommand<Template[]>('get_fisa_templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    {
      Header: 'Template',
      accessor: 'name',
      minWidth: 220,
    },
    {
      Header: 'Tip',
      accessor: 'is_default',
      width: 130,
      Cell: ({ row }: CellProps) => {
        const t = row.original;
        const label = t.is_default ? 'Implicit' : 'Standard';
        return <ObjectStatus state={t.is_default ? 'Information' : 'None'}>{label}</ObjectStatus>;
      },
    },
    {
      Header: 'Stare',
      accessor: 'active',
      width: 120,
      Cell: ({ row }: CellProps) => {
        const label = row.original.active ? 'Activ' : 'Inactiv';
        return <ObjectStatus state={statusState(label)}>{label}</ObjectStatus>;
      },
    },
    {
      Header: 'Descriere',
      accessor: 'description',
      minWidth: 240,
      Cell: ({ value }: CellProps) => <span>{(value as string | null) || '—'}</span>,
    },
    {
      Header: 'Autor',
      accessor: 'created_by_name',
      width: 180,
      Cell: ({ value }: CellProps) => <span>{(value as string | null) || '—'}</span>,
    },
    {
      Header: 'Dată creare',
      accessor: 'created_at',
      width: 170,
      Cell: ({ value }: CellProps) => <span>{formatDate(value as string | null)}</span>,
    },
  ] as AnalyticalTableColumnDefinition[], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          actionsBar={
            <Toolbar>
              <ToolbarButton
                design="Transparent"
                icon="refresh"
                text="Reîmprospătează"
                onClick={() => { void refresh(); }}
              />
            </Toolbar>
          }
        >
          <Title slot="heading" level="H3">Template-uri fișe</Title>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '12rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={templates}
            columns={columns}
            filterable
            sortable
            visibleRows={15}
            noDataText={isAdmin ? 'Niciun template configurat' : 'Fără date'}
          />
        )}
      </div>
    </DynamicPage>
  );
}
