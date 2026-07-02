import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useClientStore } from '@/store/clientStore';
import { formatDateRo } from '@/lib/format';
import { Page, PageHeader } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card } from '@/v2/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface Station {
  id: number;
  code: string;
  name: string;
  client_name: string;
  project_name: string | null;
  location: string | null;
  status: string;
  commissioning_date: string | null;
}

const EMPTY = { client_id: '', code: '', name: '', location: '', status: 'operational' };

export default function StationsPage() {
  const clients = useClientStore((s) => s.clients);
  const fetchClients = useClientStore((s) => s.fetchClients);

  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<Station[]>('get_all_stations')
      .then((d) => setStations(Array.isArray(d) ? d : []))
      .catch(() => setStations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    void fetchClients();
  }, [load, fetchClients]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return stations;
    return stations.filter((s) =>
      [s.code, s.name, s.client_name, s.project_name, s.location]
        .some((v) => (v || '').toLowerCase().includes(needle)),
    );
  }, [stations, q]);

  const create = async () => {
    if (!form.client_id || !form.code.trim() || !form.name.trim()) {
      toast.error('Client, cod și nume sunt obligatorii');
      return;
    }
    setSaving(true);
    try {
      await apiCommand('create_station', {
        client_id: Number(form.client_id),
        code: form.code.trim(),
        name: form.name.trim(),
        location: form.location.trim() || null,
        status: form.status,
      });
      toast.success('Stație creată');
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setSaving(false);
    }
  };

  const openStation = (id: number) => {
    window.location.hash = `/v2/stations/${id}`;
  };

  return (
    <Page fill>
      <PageHeader
        title="Stații instalate"
        description="Echipamente livrate la clienți"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Stație nouă
          </Button>
        }
      />

      <Input
        placeholder="Caută după cod, nume, client…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-4 max-w-sm"
      />

      <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
        <Card className="overflow-hidden shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cod</TableHead>
                <TableHead>Nume</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Proiect</TableHead>
                <TableHead>Locație</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Punere în funcțiune</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openStation(s.id)}
                >
                  <TableCell className="font-medium">{s.code}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.client_name}</TableCell>
                  <TableCell>{s.project_name || '—'}</TableCell>
                  <TableCell>{s.location || '—'}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell>{s.commissioning_date ? formatDateRo(s.commissioning_date) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </AsyncContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stație nouă</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Client</Label>
              <select
                className="h-9 rounded-md border px-3 text-sm"
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
              >
                <option value="">Selectează…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Cod</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Nume</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Locație</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button disabled={saving} onClick={() => void create()}>Creează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
