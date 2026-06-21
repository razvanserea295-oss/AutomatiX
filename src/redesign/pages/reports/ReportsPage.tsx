



























import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, Save, Trash2, Plus, Loader2, X, Bookmark, Table, SlidersHorizontal } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { toast } from '@/store/toastStore';

import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import SectionHeader from '@/redesign/ui/SectionHeader';
import { EmptyState } from '@/redesign/ui';

interface ColumnDef { field: string; label: string; type: 'string' | 'number' | 'date' | 'currency'; }
interface SourceDef { name: string; label: string; columns: ColumnDef[]; filterable_fields: string[]; }
interface Filter { field: string; op: string; value: any; value2?: any; }
interface Report { source: string; columns: ColumnDef[]; rows: any[]; total_rows: number; totals?: Record<string, number>; }
interface Preset { id: number; name: string; source: string; config: any; is_shared: boolean; }

const OP_LABELS: Record<string, string> = {
  eq: '=', neq: '≠', contains: 'conține', gt: '>', gte: '≥', lt: '<', lte: '≤', between: 'între',
};

export default function ReportsPage({ user: _user }: { user: User | null }) {
  const [sources, setSources] = useState<SourceDef[]>([]);
  const [sourceName, setSourceName] = useState('projects');
  const [columns, setColumns] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [report, setReport] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    apiCommand<SourceDef[]>('get_report_sources').then(s => {
      setSources(s);
      const def = s.find(x => x.name === sourceName);
      if (def) setColumns(new Set(def.columns.map(c => c.field)));
    });
    refreshPresets();
  }, []);

  const refreshPresets = useCallback(() => {
    apiCommand<Preset[]>('list_report_presets').then(setPresets).catch(() => setPresets([]));
  }, []);

  const source = sources.find(s => s.name === sourceName);

  const switchSource = (name: string) => {
    setSourceName(name);
    setReport(null);
    setFilters([]);
    const def = sources.find(s => s.name === name);
    if (def) setColumns(new Set(def.columns.map(c => c.field)));
  };

  const run = async () => {
    setRunning(true);
    try {
      const r = await apiCommand<Report>('run_report', {
        config: {
          source: sourceName,
          columns: Array.from(columns),
          filters,
          sort: sortField ? { field: sortField, dir: sortDir } : undefined,
          limit: 1000,
        },
      });
      setReport(r);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
    finally { setRunning(false); }
  };

  const exportExcel = async () => {
    if (!report) return;
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([
        report.columns.map(c => c.label),
        ...report.rows.map(r => report.columns.map(c => r[c.field] ?? '')),
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Raport');
      XLSX.writeFile(wb, `raport-${sourceName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Export Excel descarcat');
    } catch (err) { toast.error('Eroare export'); }
  };

  const savePreset = async () => {
    if (!presetName.trim()) { toast.error('Denumire preset obligatorie'); return; }
    try {
      await apiCommand('save_report_preset', {
        request: {
          name: presetName.trim(), source: sourceName,
          config: {
            source: sourceName, columns: Array.from(columns), filters,
            sort: sortField ? { field: sortField, dir: sortDir } : undefined,
          },
        },
      });
      toast.success('Preset salvat');
      setPresetName('');
      refreshPresets();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const loadPreset = (p: Preset) => {
    setSourceName(p.source);
    setColumns(new Set(p.config.columns || []));
    setFilters(p.config.filters || []);
    if (p.config.sort) { setSortField(p.config.sort.field); setSortDir(p.config.sort.dir); }
  };

  const deletePreset = async (id: number) => {
    try {
      await apiCommand('delete_report_preset', { id });
      refreshPresets();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  return (
    <Page fit>
      <Page.Body maxWidth="full" padding="comfortable" fit>

        {

}
        <div className="enter-up shrink-0 pb-4 border-b border-line/60" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0">
              {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <h1 className="text-pm-2xl font-semibold text-content-primary truncate leading-tight">Generator rapoarte</h1>
              </div>
            </div>

            {}
            <label className="flex items-center gap-2">
              <span className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Sursă</span>
              <select
                value={sourceName}
                onChange={e => switchSource(e.target.value)}
                className="min-w-44 h-9 px-3 text-pm-sm rounded-xl border border-line/70 bg-surface-secondary/40 text-content-primary transition-smooth duration-150 hover:border-line focus-visible:outline-none focus-visible:border-accent/50 focus-visible:shadow-[var(--ring-soft)]"
              >
                {sources.map(s => <option key={s.name} value={s.name}>{s.label}</option>)}
              </select>
            </label>

            <div className="flex items-center gap-2 ml-auto">
              {report && (
                <Button size="sm" variant="outline" onClick={exportExcel}>
                  <Download className="h-3.5 w-3.5" /> Export Excel
                </Button>
              )}
              <Button size="sm" onClick={run} disabled={running}>
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />} Ruleaza raportul
              </Button>
            </div>
          </div>
        </div>

        {

}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0 enter-up" style={{ animationDelay: '160ms' }}>

          {}
          <Card padding="none" className="xl:col-span-7 flex flex-col min-h-0 overflow-hidden">
            {!report ? (
              <EmptyState
                icon={Table}
                title="Niciun raport rulat"
                description="Configurează coloanele, filtrele și sortarea în panoul din dreapta, apoi apasă „Ruleaza raportul”."
              />
            ) : (
              <div key={`${sourceName}-${report.total_rows}`} className="flex flex-col h-full enter-fade">
                {}
                <div className="flex items-center justify-between px-5 py-3 bg-surface-secondary border-b border-line/70">
                  <h2 className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
                    Rezultate — {report.total_rows} {report.total_rows === 1 ? 'înregistrare' : 'înregistrări'}
                  </h2>
                  <Button size="sm" variant="outline" onClick={exportExcel}><Download className="h-3 w-3" /> Export Excel</Button>
                </div>

                {}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-surface-secondary shadow-[inset_0_-1px_0_var(--color-border)]">
                      <tr>
                        {report.columns.map(c => (
                          <th key={c.field} className="text-left px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody key={`${sourceName}-${report.total_rows}`} className="stagger-in">
                      {report.rows.map((r, idx) => (
                        <tr key={idx} className="border-b border-line hover:bg-surface-tertiary/40 bg-surface-secondary transition-smooth">
                          {report.columns.map(c => (
                            <td key={c.field}
                              title={c.type === 'currency' || c.type === 'number' ? undefined : (r[c.field] != null ? String(r[c.field]) : undefined)}
                              className={`px-3 py-2 ${c.type === 'currency' || c.type === 'number' ? 'text-right tabular-nums' : ''}`}>
                              {c.type === 'currency' && r[c.field] != null
                                ? Number(r[c.field]).toFixed(2)
                                : (r[c.field] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {report.totals && Object.keys(report.totals).length > 0 && (
                      <tfoot>
                        <tr key={`${sourceName}-${report.total_rows}`} className="border-t-2 border-line bg-surface-tertiary/60 font-semibold enter-up" style={{ animationDelay: '220ms' }}>
                          {report.columns.map(c => (
                            <td key={c.field} className={`px-3 py-2 ${c.type === 'currency' || c.type === 'number' ? 'text-right tabular-nums' : ''}`}>
                              {(c.type === 'currency' || c.type === 'number') && report.totals?.[c.field] != null
                                ? Number(report.totals[c.field]).toFixed(2) + (c.type === 'currency' ? ' RON' : '')
                                : (c === report.columns[0] ? 'TOTAL' : '')}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </Card>

          {}
          <Card padding="none" className="xl:col-span-5 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-line/70">
              <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-pm-md font-semibold text-content-primary leading-tight truncate">Configurare raport</p>
                <p className="text-pm-2xs text-content-muted truncate">{source?.label ?? '—'}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {}
              {source && (
                <div className="p-4 border-b border-line">
                  <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Coloane</label>
                  <div className="space-y-0 border border-line bg-surface-primary rounded-lg max-h-60 overflow-y-auto">
                    {source.columns.map(c => (
                      <label key={c.field} className="flex items-center gap-2 text-xs cursor-pointer transition-smooth duration-150 hover:bg-surface-tertiary/40 px-2 py-2 border-b border-line last:border-b-0">
                        <input type="checkbox" checked={columns.has(c.field)} className="h-3.5 w-3.5 shrink-0 accent-[var(--color-accent)] cursor-pointer" onChange={e => {
                          setColumns(prev => {
                            const n = new Set(prev);
                            if (e.target.checked) n.add(c.field); else n.delete(c.field);
                            return n;
                          });
                        }} />
                        <span className="text-content-primary truncate min-w-0">{c.label}</span>
                        <span className="text-pm-2xs text-content-muted ml-auto shrink-0">{c.type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {}
              {source && (
                <div className="p-4 border-b border-line">
                  <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Filtre</label>
                  <div className="space-y-2">
                    {filters.map((f, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <select value={f.field} onChange={e => setFilters(prev => prev.map((x, i) => i === idx ? { ...x, field: e.target.value } : x))}
                          className="col-span-5 min-w-0 text-xs px-2 py-1.5 rounded-xl border border-line/70 bg-surface-secondary/40 text-content-primary transition-smooth duration-150 hover:border-line focus-visible:outline-none focus-visible:border-accent/50 focus-visible:shadow-[var(--ring-soft)]">
                          {source.filterable_fields.map(field => {
                            const col = source.columns.find(c => c.field === field);
                            return <option key={field} value={field}>{col?.label || field}</option>;
                          })}
                        </select>
                        <select value={f.op} onChange={e => setFilters(prev => prev.map((x, i) => i === idx ? { ...x, op: e.target.value } : x))}
                          className="col-span-2 min-w-0 text-xs px-2 py-1.5 rounded-xl border border-line/70 bg-surface-secondary/40 text-content-primary transition-smooth duration-150 hover:border-line focus-visible:outline-none focus-visible:border-accent/50 focus-visible:shadow-[var(--ring-soft)]">
                          {Object.entries(OP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <input value={f.value || ''} onChange={e => setFilters(prev => prev.map((x, i) => i === idx ? { ...x, value: e.target.value } : x))}
                          className="col-span-4 min-w-0 text-xs px-2 py-1.5 rounded-xl border border-line/70 bg-surface-secondary/40 text-content-primary transition-smooth duration-150 hover:border-line focus-visible:outline-none focus-visible:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" placeholder="valoare" />
                        <IconButton size="sm" intent="danger" aria-label="Elimină filtru" title="Elimină filtru"
                          onClick={() => setFilters(prev => prev.filter((_, i) => i !== idx))} className="col-span-1 justify-self-center">
                          <X />
                        </IconButton>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => setFilters(prev => [...prev, { field: source.filterable_fields[0] || '', op: 'eq', value: '' }])}>
                      <Plus className="h-3 w-3" /> Adaugă filtru
                    </Button>
                  </div>
                </div>
              )}

              {}
              {source && (
                <div className="p-4 border-b border-line">
                  <label className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">Sortare</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={sortField} onChange={e => setSortField(e.target.value)}
                      className="col-span-2 min-w-0 text-xs px-2 py-1.5 rounded-xl border border-line/70 bg-surface-secondary/40 text-content-primary transition-smooth duration-150 hover:border-line focus-visible:outline-none focus-visible:border-accent/50 focus-visible:shadow-[var(--ring-soft)]">
                      <option value="">— fără —</option>
                      {source.columns.map(c => <option key={c.field} value={c.field}>{c.label}</option>)}
                    </select>
                    <select value={sortDir} onChange={e => setSortDir(e.target.value as any)}
                      className="min-w-0 text-xs px-2 py-1.5 rounded-xl border border-line/70 bg-surface-secondary/40 text-content-primary transition-smooth duration-150 hover:border-line focus-visible:outline-none focus-visible:border-accent/50 focus-visible:shadow-[var(--ring-soft)]">
                      <option value="asc">↑</option>
                      <option value="desc">↓</option>
                    </select>
                  </div>
                </div>
              )}

              {}
              <div className="p-4">
                <Button size="sm" onClick={run} disabled={running} block>
                  {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3 w-3" />} Ruleaza raportul
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {
}
        <Card padding="md" className="shrink-0 enter-up" style={{ animationDelay: '240ms' }}>
          <SectionHeader
            eyebrow="Presete"
            title="Configurări salvate"
            icon={Bookmark}
            meta="Salvează combinația curentă de coloane, filtre și sortare pentru reutilizare."
            actions={
              <div className="flex items-center gap-2">
                <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Nume preset"
                  className="text-pm-sm h-8 px-3 w-44 rounded-xl border border-line/70 bg-surface-secondary/40 text-content-primary transition-smooth duration-150 hover:border-line focus-visible:outline-none focus-visible:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
                <Button size="sm" variant="outline" onClick={savePreset}>
                  <Save className="h-3.5 w-3.5" /> Salvează
                </Button>
              </div>
            }
          />
          {presets.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="Niciun preset salvat"
              description="Dă un nume configurării curente și apasă „Salvează” pentru a o regăsi rapid."
            />
          ) : (
            <div key={presets.length} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 stagger-in">
              {presets.map(p => (
                <div key={p.id} className="group flex items-center gap-2 text-xs bg-surface-primary border border-line rounded-lg px-3 py-2 transition-smooth duration-150 hover:border-line/80 hover:shadow-[var(--elevation-1)] hover-wiggle">
                  <button onClick={() => loadPreset(p)} title={p.name} className="flex-1 min-w-0 rounded-lg text-left text-content-primary truncate font-medium transition-smooth duration-150 hover:text-accent focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">{p.name}</button>
                  <span className="text-pm-2xs text-content-muted shrink-0">{p.source}</span>
                  <IconButton size="sm" intent="danger" aria-label="Șterge preset" title="Șterge preset"
                    onClick={() => deletePreset(p.id)}
                    className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Trash2 />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </Card>

      </Page.Body>
    </Page>
  );
}
