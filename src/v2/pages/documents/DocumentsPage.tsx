import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Upload } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useProjectStore } from '@/store/projectStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { formatDateRo } from '@/lib/format';
import { Page, PageHeader, PageBody, PageToolbar, PageSearch, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface Document {
  id: number; title: string; category_name: string | null; project_name: string | null; created_at: string;
}
interface DocCategory { id: number; name: string }

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read error'));
    reader.readAsDataURL(file);
  });
}

export default function DocumentsPage() {
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  const [docs, setDocs] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', category_id: '', project_id: '' });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<Document[]>('get_documents'),
      apiCommand<DocCategory[]>('get_document_categories'),
    ])
      .then(([d, c]) => {
        setDocs(Array.isArray(d) ? d : []);
        setCategories(Array.isArray(c) ? c : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    void fetchProjects();
  }, [load, fetchProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) =>
      [d.title, d.category_name, d.project_name].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [docs, search]);

  const upload = async () => {
    if (!file || !form.category_id) {
      toast.error('Selectează fișier și categorie');
      return;
    }
    setUploading(true);
    try {
      const data = await fileToBase64(file);
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      await apiCommand('create_document', {
        name: form.name.trim() || file.name,
        category_id: Number(form.category_id),
        project_id: form.project_id ? Number(form.project_id) : null,
        file_path: file.name,
        file_type: ext,
        file_size: file.size,
        original_name: file.name,
        file_data: data,
        file_mime: file.type || 'application/octet-stream',
      });
      toast.success('Document încărcat');
      setOpen(false);
      setFile(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (doc: Document) => {
    const ok = await confirmDialog({ title: 'Șterge document', body: doc.title, danger: true });
    if (!ok) return;
    try {
      await apiCommand('delete_document', { document_id: doc.id });
      toast.success('Șters');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Documente"
        description="Repository documente per proiect"
        actions={<Button size="sm" onClick={() => setOpen(true)}><Upload className="mr-2 h-4 w-4" />Încarcă</Button>}
      />
      <PageBody>
        <PageToolbar>
          <PageSearch placeholder="Caută documente…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </PageToolbar>
        <AsyncContent loading={loading} error={null} empty={filtered.length === 0}>
          <DataTableCard>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titlu</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Proiect</TableHead>
                <TableHead>Creat</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell>{d.category_name || '—'}</TableCell>
                  <TableCell>{d.project_name || '—'}</TableCell>
                  <TableCell>{formatDateRo(d.created_at)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => void remove(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </DataTableCard>
        </AsyncContent>
      </PageBody>

      <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Încarcă document</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Titlu</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Opțional — implicit numele fișierului" /></div>
            <div className="grid gap-1.5">
              <Label>Categorie</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                <option value="">Selectează…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Proiect (opțional)</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}>
                <option value="">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>{file ? file.name : 'Alege fișier'}</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button disabled={uploading} onClick={() => void upload()}>{uploading ? 'Se încarcă…' : 'Salvează'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
