import { useCallback, useEffect, useState } from 'react';
import { apiCommand } from '@/api/commands';
import { formatDateTimeRo } from '@/lib/format';
import { Page, PageHeader, PageBody, PageKpis, DataTableCard } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface ActiveSession {
  id: number; username: string; display_name: string | null;
  ip_address: string | null; user_agent: string | null; last_seen_at: string;
}
interface Summary { total_active: number; unique_users: number; }

export default function UserSessionsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<ActiveSession[]>('list_active_sessions'),
      apiCommand<Summary>('get_sessions_summary'),
    ])
      .then(([s, sum]) => {
        setSessions(Array.isArray(s) ? s : []);
        setSummary(sum);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Page fill>
      <PageHeader title="Sesiuni active" description="Utilizatori conectați în acest moment" />
      <PageBody>
        <PageKpis className="max-w-md">
          <KPICard label="Sesiuni" value={summary?.total_active ?? sessions.length} />
          <KPICard label="Utilizatori unici" value={typeof summary?.unique_users === 'number' ? summary.unique_users : 0} />
        </PageKpis>
        <AsyncContent loading={loading} error={null} empty={sessions.length === 0}>
          <DataTableCard>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilizator</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Ultima activitate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.display_name || s.username}</TableCell>
                  <TableCell>{s.ip_address || '—'}</TableCell>
                  <TableCell>{formatDateTimeRo(s.last_seen_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </DataTableCard>
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
