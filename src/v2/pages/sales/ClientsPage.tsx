import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from '@/icons';
import { toast } from 'sonner';
import type { Client } from '@/core/types';
import { useClientStore } from '@/store/clientStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';

const EMPTY = { name: '', contact_person: '', email: '', phone: '', cui: '', city: '' };

export default function ClientsPage() {
  const clients = useClientStore((s) => s.clients);
  const loading = useClientStore((s) => s.loading);
  const fetchClients = useClientStore((s) => s.fetchClients);
  const createClient = useClientStore((s) => s.createClient);
  const updateClient = useClientStore((s) => s.updateClient);
  const deleteClient = useClientStore((s) => s.deleteClient);

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { void fetchClients(); }, [fetchClients]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((c) =>
      [c.name, c.contact_person, c.email, c.phone, c.cui].some((v) => (v || '').toLowerCase().includes(needle)),
    );
  }, [clients, q]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      name: c.name || '',
      contact_person: c.contact_person || '',
      email: c.email || '',
      phone: c.phone || '',
      cui: c.cui || '',
      city: c.city || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Numele este obligatoriu'); return; }
    try {
      if (editing) await updateClient(editing.id, form);
      else await createClient(form);
      toast.success(editing ? 'Client actualizat' : 'Client creat');
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const remove = async (c: Client) => {
    const ok = await confirmDialog({ title: 'Șterge client', body: c.name, danger: true });
    if (!ok) return;
    try {
      await deleteClient(c.id);
      toast.success('Client șters');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Clienți"
        description="Baza de clienți și contacte"
        actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Client nou</Button>}
      />
      <PageBody>
        <PageToolbar>
          <PageSearch placeholder="Caută clienți…" value={q} onChange={(e) => setQ(e.target.value)} />
        </PageToolbar>
        <AsyncContent loading={loading && clients.length === 0} error={null} empty={filtered.length === 0} emptyMessage="Niciun client.">
          <DataTableCard>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.contact_person || '—'}</TableCell>
                  <TableCell>{c.email || '—'}</TableCell>
                  <TableCell>{c.phone || '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); void remove(c); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </DataTableCard>
        </AsyncContent>
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editează client' : 'Client nou'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {(['name', 'contact_person', 'email', 'phone', 'cui', 'city'] as const).map((k) => (
              <div key={k} className="grid gap-1.5">
                <Label>{k === 'name' ? 'Nume' : k === 'contact_person' ? 'Persoană contact' : k === 'cui' ? 'CUI' : k === 'city' ? 'Oraș' : k.charAt(0).toUpperCase() + k.slice(1)}</Label>
                <Input value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
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
