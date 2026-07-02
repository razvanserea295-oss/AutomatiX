import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, MapPin, Clock, CheckCircle } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { formatDateRo } from '@/lib/format';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, PageKpis, DataTableCard } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Textarea } from '@/v2/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface Deplasare {
  id: number;
  destination: string;
  purpose: string;
  start_date: string;
  end_date?: string | null;
  status: string;
  notes?: string | null;
}

export default function DeplasariPage() {
  const [items, setItems] = useState<Deplasare[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    destination: '',
    purpose: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    notes: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<Deplasare[]>('get_deplasari')
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => ({
    total: items.length,
    planificate: items.filter((d) => d.status === 'planificat' || d.status === 'aprobat').length,
    in_curs: items.filter((d) => d.status === 'in_curs' || d.status === 'activ').length,
    finalizate: items.filter((d) => d.status === 'finalizat').length,
  }), [items]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((d) =>
      d.destination.toLowerCase().includes(q) || d.purpose.toLowerCase().includes(q),
    );
  }, [items, search]);

  const create = async () => {
    if (!form.destination.trim() || !form.purpose.trim() || !form.start_date) {
      toast.error('Destinație, scop și dată de start sunt obligatorii');
      return;
    }
    setSaving(true);
    try {
      await apiCommand('create_deplasare', {
        destination: form.destination.trim(),
        purpose: form.purpose.trim(),
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
      });
      toast.success('Deplasare înregistrată');
      setOpen(false);
      setForm({ destination: '', purpose: '', start_date: new Date().toISOString().slice(0, 10), end_date: '', notes: '' });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Deplasări"
        description="Planificare și monitorizare deplasări"
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Deplasare nouă</Button>}
      />

      <PageBody>
        <PageKpis>
          <KPICard label="Total" value={kpis.total} icon={<MapPin className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Planificate" value={kpis.planificate} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="În curs" value={kpis.in_curs} icon={<MapPin className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Finalizate" value={kpis.finalizate} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
        </PageKpis>

        <PageToolbar>
          <PageSearch
            placeholder="Caută destinație sau scop…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </PageToolbar>

        <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
          <DataTableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinație</TableHead>
                  <TableHead>Scop</TableHead>
                  <TableHead>Început</TableHead>
                  <TableHead>Sfârșit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody stagger>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.destination}</TableCell>
                    <TableCell>{d.purpose}</TableCell>
                    <TableCell>{formatDateRo(d.start_date)}</TableCell>
                    <TableCell>{d.end_date ? formatDateRo(d.end_date) : '—'}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </AsyncContent>
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deplasare nouă</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Destinație *</Label>
              <Input
                placeholder="ex. Cluj-Napoca"
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Scop *</Label>
              <Input
                placeholder="ex. Revizie instalație, Întâlnire client"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label>Dată start *</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Dată sfârșit</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Note</Label>
              <Textarea
                placeholder="Informații suplimentare…"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button onClick={() => void create()} disabled={saving}>
              {saving ? 'Se salvează…' : 'Salvează'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
