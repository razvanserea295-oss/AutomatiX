import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, BookOpen, CheckCircle, Clock } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useProjectStore } from '@/store/projectStore';
import { Page, PageHeader, PageBody, PageKpis, PageToolbar, PageSearch, DataTableCard } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Textarea } from '@/v2/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface Briefing {
  id: number; project_name: string; title: string; status: string; author_name?: string; content?: string;
}

export default function BriefingsPage() {
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  const [items, setItems] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ project_id: '', title: '', content: '' });

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<Briefing[]>('get_project_briefings')
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    void fetchProjects();
  }, [load, fetchProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((b) =>
      [b.project_name, b.title].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [items, search]);

  const kpis = useMemo(() => ({
    total: items.length,
    aprobate: items.filter((b) => b.status === 'approved' || b.status === 'aprobat').length,
    draft: items.filter((b) => b.status === 'draft').length,
  }), [items]);

  const create = async () => {
    if (!form.project_id || !form.title.trim()) {
      toast.error('Proiect și titlu sunt obligatorii');
      return;
    }
    try {
      await apiCommand('create_project_briefing', {
        project_id: Number(form.project_id),
        title: form.title.trim(),
        content: form.content.trim() || null,
      });
      toast.success('Briefing creat');
      setCreateOpen(false);
      setForm({ project_id: '', title: '', content: '' });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Briefing proiecte"
        description="Note și brief-uri de proiect"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Briefing nou</Button>}
      />
      <PageBody>
        <PageKpis>
          <KPICard label="Total" value={kpis.total} icon={<BookOpen className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Aprobate" value={kpis.aprobate} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Draft" value={kpis.draft} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
        </PageKpis>

        <PageToolbar>
          <PageSearch placeholder="Caută briefing-uri…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </PageToolbar>

        <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
          <DataTableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proiect</TableHead>
                  <TableHead>Titlu</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody stagger>
                {filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-muted-foreground">{b.project_name}</TableCell>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell className="text-muted-foreground">{b.author_name || '—'}</TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </AsyncContent>
      </PageBody>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Briefing nou</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Proiect *</Label>
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}>
                <option value="">Selectează…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Titlu *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Conținut</Label>
              <Textarea rows={4} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Anulează</Button>
            <Button onClick={() => void create()}>Creează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
