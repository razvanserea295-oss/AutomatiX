import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface Supplier {
  id: number; name: string; email: string; phone: string; category: string;
}

const EMPTY = { name: '', email: '', phone: '', category: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<Supplier[]>('get_suppliers')
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return suppliers;
    return suppliers.filter((s) => [s.name, s.email, s.category].some((v) => (v || '').toLowerCase().includes(needle)));
  }, [suppliers, q]);

  const save = async () => {
    if (!form.name.trim()) { toast.error('Numele este obligatoriu'); return; }
    try {
      await apiCommand('create_supplier', form);
      toast.success('Furnizor adăugat');
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const remove = async (s: Supplier) => {
    const ok = await confirmDialog({ title: 'Șterge furnizor', body: s.name, danger: true });
    if (!ok) return;
    try {
      await apiCommand('delete_supplier', { id: s.id });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  return (
    <Page fill>
      <PageHeader title="Furnizori" actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Furnizor nou</Button>} />
      <PageBody>
        <PageToolbar>
          <PageSearch placeholder="Caută…" value={q} onChange={(e) => setQ(e.target.value)} />
        </PageToolbar>
        <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
          <DataTableCard>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.email || '—'}</TableCell>
                  <TableCell>{s.phone || '—'}</TableCell>
                  <TableCell>{s.category || '—'}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => void remove(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </DataTableCard>
        </AsyncContent>
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Furnizor nou</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Nume</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label>Categorie</Label><Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button onClick={() => void save()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
