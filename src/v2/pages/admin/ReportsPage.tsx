import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Play } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { Page, PageHeader, PageBody, DataTableCard } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card } from '@/v2/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

interface ColumnDef { field: string; label: string }
interface SourceDef { name: string; label: string; columns: ColumnDef[]; filterable_fields: string[] }
interface Report { columns: ColumnDef[]; rows: Record<string, unknown>[]; total_rows: number }

export default function ReportsPage() {
  const [sources, setSources] = useState<SourceDef[]>([]);
  const [source, setSource] = useState('');
  const [columns, setColumns] = useState<Set<string>>(new Set());
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const def = useMemo(() => sources.find((s) => s.name === source), [sources, source]);

  useEffect(() => {
    apiCommand<SourceDef[]>('get_report_sources')
      .then((s) => {
        const list = Array.isArray(s) ? s : [];
        setSources(list);
        if (list[0]) {
          setSource(list[0].name);
          setColumns(new Set(list[0].columns.map((c) => c.field)));
          setFilterField(list[0].filterable_fields[0] ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const switchSource = (name: string) => {
    setSource(name);
    setReport(null);
    const d = sources.find((s) => s.name === name);
    if (d) {
      setColumns(new Set(d.columns.map((c) => c.field)));
      setFilterField(d.filterable_fields[0] ?? '');
      setFilterValue('');
    }
  };

  const toggleColumn = (field: string) => {
    setColumns((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const run = useCallback(async () => {
    if (!source || columns.size === 0) return;
    setRunning(true);
    try {
      const filters = filterField && filterValue.trim()
        ? [{ field: filterField, op: 'contains', value: filterValue.trim() }]
        : [];
      const r = await apiCommand<Report>('run_report', {
        config: { source, columns: Array.from(columns), filters, limit: 1000 },
      });
      setReport(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare raport');
    } finally {
      setRunning(false);
    }
  }, [source, columns, filterField, filterValue]);

  const exportExcel = async () => {
    if (!report) return;
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([
        report.columns.map((c) => c.label),
        ...report.rows.map((row) => report.columns.map((c) => row[c.field] ?? '')),
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Raport');
      XLSX.writeFile(wb, `raport-${source}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Export descărcat');
    } catch {
      toast.error('Eroare export');
    }
  };

  return (
    <Page fill>
      <PageHeader title="Rapoarte" description="Generator rapoarte configurabil" />

      <PageBody>
        <div className="grid min-h-0 flex-1 gap-[var(--density-gap-section)] lg:grid-cols-[240px_1fr]">
          <Card className="density-form h-fit space-y-[var(--density-gap-section)] p-[var(--density-card-p)] shadow-none">
          <div className="grid gap-1.5">
            <Label>Sursă date</Label>
            <select className="h-9 rounded-md border px-3 text-sm" value={source} onChange={(e) => switchSource(e.target.value)}>
              {sources.map((s) => <option key={s.name} value={s.name}>{s.label}</option>)}
            </select>
          </div>
          {def && def.filterable_fields.length > 0 && (
            <div className="grid gap-2">
              <Label>Filtru</Label>
              <select className="h-9 rounded-md border px-3 text-sm" value={filterField} onChange={(e) => setFilterField(e.target.value)}>
                {def.filterable_fields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <Input placeholder="conține…" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} />
            </div>
          )}
          {def && (
            <div className="space-y-1">
              <Label>Coloane</Label>
              {def.columns.map((c) => (
                <label key={c.field} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={columns.has(c.field)} onChange={() => toggleColumn(c.field)} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
          <Button className="w-full" disabled={running || !source} onClick={() => void run()}>
            <Play className="mr-2 h-4 w-4" />Rulează
          </Button>
        </Card>

          <AsyncContent loading={loading} error={null} empty={!report}>
            {report && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="density-toolbar flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => void exportExcel()}>
                    <Download className="mr-2 h-4 w-4" />Excel
                  </Button>
                </div>
                <DataTableCard>
                  <Table>
                  <TableHeader>
                    <TableRow>
                      {report.columns.map((c) => <TableHead key={c.field}>{c.label}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((row, i) => (
                      <TableRow key={i}>
                        {report.columns.map((c) => (
                          <TableCell key={c.field}>{String(row[c.field] ?? '—')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </DataTableCard>
                <p className="density-meta p-[var(--density-card-p)] text-muted-foreground">{report.total_rows} rânduri</p>
              </div>
            )}
          </AsyncContent>
        </div>
      </PageBody>
    </Page>
  );
}
