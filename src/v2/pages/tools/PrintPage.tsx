import { useCallback, useEffect, useRef, useState } from 'react';
import { Printer, Upload } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/lib/access';
import { Page, PageHeader, PageBody, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card } from '@/v2/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface PrinterInfo { name: string; isDefault: boolean }
interface PrintJob {
  id: number; printer_name: string; filename: string; status: string; created_at: string;
}

const ALLOWED = new Set(['pdf', 'txt', 'png', 'jpg', 'jpeg']);

function ext(name: string): string {
  return (name.split('.').pop() || '').toLowerCase();
}

export default function PrintPage() {
  const isAdmin = normalizeRole(useAuthStore((s) => s.user?.role_name)) === 'admin';
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [file, setFile] = useState<{ name: string; mime: string; data: string } | null>(null);
  const [copies, setCopies] = useState('1');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<PrinterInfo[]>('list_printers').then((p) => {
        const list = Array.isArray(p) ? p : [];
        setPrinters(list);
        setSelected((prev) => prev || list.find((x) => x.isDefault)?.name || list[0]?.name || '');
      }),
      apiCommand<PrintJob[]>('list_print_jobs', { limit: 12 }).then((j) => setJobs(Array.isArray(j) ? j : [])),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!ALLOWED.has(ext(f.name))) {
      toast.error('Tip nepermis (PDF, text, PNG, JPG)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result || '').split(',')[1] || '';
      setFile({ name: f.name, mime: f.type || 'application/octet-stream', data: b64 });
    };
    reader.readAsDataURL(f);
  };

  const print = async () => {
    if (!file || !selected) {
      toast.error('Alege fișier și imprimantă');
      return;
    }
    setPrinting(true);
    try {
      await apiCommand('print_file', {
        filename: file.name, mime: file.mime, data: file.data,
        printer: selected, copies: Number(copies) || 1,
      });
      toast.success('Trimis la imprimantă');
      setFile(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Page fill>
      <PageHeader title="Print" description={isAdmin ? 'Imprimare server + administrare imprimante' : 'Trimite documente la imprimantele serverului'} />
      <PageBody>
        <div className="grid gap-[var(--density-gap-section)] lg:grid-cols-2">
          <Card className="shadow-none">
            <div className="density-form space-y-[var(--density-gap-section)] p-[var(--density-card-p)]">
            <div className="grid gap-2">
              <Label>Imprimantă</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {printers.map((p) => <option key={p.name} value={p.name}>{p.name}{p.isDefault ? ' (implicit)' : ''}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Copii</Label>
              <Input value={copies} onChange={(e) => setCopies(e.target.value)} />
            </div>
            <input ref={inputRef} type="file" className="hidden" accept=".pdf,.txt,.png,.jpg,.jpeg" onChange={(e) => pick(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />{file ? file.name : 'Alege fișier'}</Button>
            <Button disabled={printing || !file} onClick={() => void print()}><Printer className="mr-2 h-4 w-4" />Imprimă</Button>
            </div>
          </Card>
          <AsyncContent loading={loading} error={null} empty={jobs.length === 0} emptyMessage="Nicio lucrare recentă.">
            <DataTableCard>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fișier</TableHead>
                  <TableHead>Imprimantă</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>{j.filename}</TableCell>
                    <TableCell>{j.printer_name}</TableCell>
                    <TableCell><StatusBadge status={j.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </DataTableCard>
          </AsyncContent>
        </div>
      </PageBody>
    </Page>
  );
}
