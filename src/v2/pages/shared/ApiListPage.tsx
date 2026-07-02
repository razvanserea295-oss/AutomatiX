import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';
import { apiCommand } from '@/api/commands';
import { useAsync } from '@/v2/hooks/useAsync';
import { Page, PageHeader, PageToolbar, PageSearch, PageBody, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';

export type ColumnDef<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  searchValue?: (row: T) => string;
};

type Props<T extends Record<string, unknown>> = {
  title: string;
  description?: string;
  command: string;
  params?: Record<string, unknown>;
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  actions?: React.ReactNode;
};

export default function ApiListPage<T extends Record<string, unknown>>({
  title,
  description,
  command,
  params,
  columns,
  searchPlaceholder = 'Caută…',
  actions,
}: Props<T>) {
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useAsync(async () => {
    const rows = await apiCommand<T[]>(command, params);
    return Array.isArray(rows) ? rows : [];
  }, [command, JSON.stringify(params)]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((row) =>
      columns.some((c) => {
        const v = c.searchValue ? c.searchValue(row) : String(row[c.key] ?? '');
        return v.toLowerCase().includes(needle);
      }),
    );
  }, [data, q, columns]);

  return (
    <Page fill>
      <PageHeader title={title} description={description} actions={actions} />
      <PageBody>
        <PageToolbar>
          <PageSearch placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
        </PageToolbar>
        <AsyncContent loading={loading} error={error} empty={filtered.length === 0} onRetry={() => void reload()}>
          <DataTableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.key}>{c.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody stagger>
                {filtered.map((row, i) => (
                  <TableRow key={String(row.id ?? i)}>
                    {columns.map((c) => (
                      <TableCell key={c.key}>
                        {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                      </TableCell>
                    ))}
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
