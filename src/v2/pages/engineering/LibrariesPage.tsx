import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiCommand } from '@/api/commands';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface Part { id: number; code: string; name: string; category: string }

export default function LibrariesPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<Part[]>('get_standard_parts')
      .then((d) => setParts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return parts;
    return parts.filter((p) => [p.code, p.name, p.category].some((v) => (v || '').toLowerCase().includes(needle)));
  }, [parts, q]);

  return (
    <Page fill>
      <PageHeader title="Biblioteci piese" description="Piese standard reutilizabile" />
      <PageBody>
        <PageToolbar>
          <PageSearch placeholder="Caută…" value={q} onChange={(e) => setQ(e.target.value)} />
        </PageToolbar>
        <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
          <DataTableCard>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cod</TableHead>
                <TableHead>Denumire</TableHead>
                <TableHead>Categorie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.code}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.category || '—'}</TableCell>
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
