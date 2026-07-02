import { useEffect, useMemo, useState } from 'react';
import { useMaterialStore } from '@/store/materialStore';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

export default function MaterialsPage() {
  const materials = useMaterialStore((s) => s.materials);
  const loading = useMaterialStore((s) => s.loading);
  const fetchMaterials = useMaterialStore((s) => s.fetchMaterials);
  const [q, setQ] = useState('');

  useEffect(() => { void fetchMaterials(); }, [fetchMaterials]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return materials;
    return materials.filter((m) => [m.code, m.name, m.category].some((v) => (v || '').toLowerCase().includes(needle)));
  }, [materials, q]);

  const lowStock = filtered.filter((m) => m.min_stock > 0 && m.stock <= m.min_stock).length;

  return (
    <Page fill>
      <PageHeader title="Inventar materiale" description={lowStock > 0 ? `${lowStock} sub stoc minim` : `${filtered.length} materiale`} />
      <PageBody>
        <PageToolbar>
          <PageSearch placeholder="Caută…" value={q} onChange={(e) => setQ(e.target.value)} />
        </PageToolbar>
        <AsyncContent loading={loading && materials.length === 0} error={null} empty={filtered.length === 0}>
          <DataTableCard>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cod</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Stoc</TableHead>
                <TableHead>UM</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.code}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.stock}</TableCell>
                  <TableCell>{m.unit}</TableCell>
                  <TableCell>
                    {m.min_stock > 0 && m.stock <= m.min_stock ? (
                      <StatusBadge status="stoc critic" />
                    ) : (
                      <StatusBadge status={m.status || 'ok'} />
                    )}
                  </TableCell>
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
