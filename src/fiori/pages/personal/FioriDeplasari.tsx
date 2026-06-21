import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable, Button,
  BusyIndicator, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// Mirror of the SaaS `Deplasare` shape (src/redesign/pages/deplasari/DeplasariPage.tsx).
// Only the fields surfaced by this read-only Fiori view are typed here.
interface Deplasare {
  id: number;
  person_name: string;
  destination: string;
  reason: string | null;
  project_id: number | null;
  project_name: string | null;
  departure_date: string;
  return_date: string | null;
  status: string;
  additional_persons?: string[] | null;
}

// SaaS rule: an `in_deplasare` trip whose departure is still in the future
// is shown as "viitoare" rather than "in_deplasare".
function computeDisplayStatus(d: Deplasare): string {
  if (d.status !== 'in_deplasare') return d.status;
  const today = new Date().toISOString().split('T')[0];
  if (d.departure_date > today) return 'viitoare';
  return d.status;
}

// Human-readable Romanian label for each raw/derived status token.
const STATUS_LABEL: Record<string, string> = {
  viitoare: 'Viitoare',
  in_deplasare: 'În deplasare',
  intors: 'Întors',
  finalizat: 'Finalizat',
  anulat: 'Anulat',
};

function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s;
}

export default function FioriDeplasari(_props: { user: User }) {
  const [deplasari, setDeplasari] = useState<Deplasare[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    apiCommand<Deplasare[]>('get_deplasari')
      .then(d => setDeplasari(d || []))
      .catch(() => setDeplasari([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const dash = (v: unknown) => (v ? String(v) : '—');

  const rows = useMemo(() => deplasari.map(d => {
    const extra = d.additional_persons?.length ?? 0;
    return {
      ...d,
      // "Angajat" — principal person, with a +N marker when others tag along.
      employee: extra > 0 ? `${d.person_name} (+${extra})` : d.person_name,
      // "Perioadă" — departure → return (single date when no return is set).
      period: d.return_date ? `${d.departure_date} → ${d.return_date}` : d.departure_date,
      displayStatus: computeDisplayStatus(d),
    };
  }), [deplasari]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Angajat', accessor: 'employee', minWidth: 180 },
    { Header: 'Destinație', accessor: 'destination', minWidth: 160 },
    { Header: 'Perioadă', accessor: 'period', minWidth: 200 },
    { Header: 'Scop', accessor: 'reason', minWidth: 160, Cell: ({ value }) => dash(value) },
    { Header: 'Proiect', accessor: 'project_name', minWidth: 160, Cell: ({ value }) => dash(value) },
    {
      Header: 'Status', accessor: 'displayStatus', width: 150,
      Cell: ({ value }) => (
        <ObjectStatus state={statusState(String(value))}>{statusLabel(String(value))}</ObjectStatus>
      ),
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Deplasări</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button design="Transparent" onClick={() => fetch()}>
            Reîmprospătează
          </Button>
        </div>
        {loading && deplasari.length === 0 ? (
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
