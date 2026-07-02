import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Printer, Upload, UploadCloud, X, RefreshCw, Loader2, FileText, Image as ImageIcon,
  Settings2, Info,
} from '@/icons';
import type { User } from '@/core/types';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import Button from '@/redesign/ui/Button';
import StatusBadge from '@/redesign/ui/StatusBadge';
import type { StatusTone } from '@/lib/statusTokens';
import { PageChrome, DashboardLayout, Panel } from '@/app-ui';

interface PrinterInfo { name: string; isDefault: boolean }
interface PrintJob {
  id: number; printer_name: string; filename: string; mime: string;
  size_bytes: number; copies: number; status: string; error: string | null; created_at: string;
}
interface AdminPrinter { name: string; isDefault: boolean; allowed: boolean }
interface AdminConfig { enabled: boolean; platformSupported: boolean; printers: AdminPrinter[] }
interface PickedFile { name: string; mime: string; data: string; size: number }

const ACCEPT = '.pdf,.txt,.log,.csv,.md,.png,.jpg,.jpeg';
const ALLOWED_EXT = new Set(['pdf', 'txt', 'log', 'csv', 'md', 'png', 'jpg', 'jpeg']);
const MAX_BYTES = 25 * 1024 * 1024;

function extOf(name: string): string { return (name.split('.').pop() || '').toLowerCase(); }
function fmtSize(b: number): string {
  if (!b) return '—';
  const kb = b / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
function jobTone(status: string): { tone: StatusTone; label: string } {
  if (status === 'done') return { tone: 'success', label: 'Imprimat' };
  if (status === 'error') return { tone: 'danger', label: 'Eroare' };
  return { tone: 'neutral', label: 'În coadă' };
}
function FileGlyph({ name }: { name: string }) {
  const e = extOf(name);
  if (e === 'png' || e === 'jpg' || e === 'jpeg') return <ImageIcon className="h-4 w-4 shrink-0 text-content-muted" />;
  return <FileText className="h-4 w-4 shrink-0 text-content-muted" />;
}

export default function PrintPage({ user }: { user: User | null }) {
  const isAdmin = (user?.role_name || '').toLowerCase() === 'admin';

  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [copies, setCopies] = useState(1);
  const [pages, setPages] = useState('');
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [cfg, setCfg] = useState<AdminConfig | null>(null);
  const [savingCfg, setSavingCfg] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const loadPrinters = useCallback(async () => {
    setLoading(true);
    try {
      const list = (await apiCommand<PrinterInfo[]>('list_printers')) || [];
      setPrinters(list);
      setSelected(prev =>
        prev && list.some(p => p.name === prev) ? prev : (list.find(p => p.isDefault)?.name || list[0]?.name || ''),
      );
    } catch { setPrinters([]); }
    finally { setLoading(false); }
  }, []);

  const loadJobs = useCallback(async () => {
    try { setJobs((await apiCommand<PrintJob[]>('list_print_jobs', { limit: 12 })) || []); } catch { /* noop */ }
  }, []);

  const loadAdmin = useCallback(async () => {
    if (!isAdmin) return;
    try { setCfg(await apiCommand<AdminConfig>('admin_print_config_get')); } catch { /* noop */ }
  }, [isAdmin]);

  useEffect(() => { void loadPrinters(); void loadJobs(); void loadAdmin(); }, [loadPrinters, loadJobs, loadAdmin]);

  const pickFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (!ALLOWED_EXT.has(extOf(f.name))) { toast.error('Tip nepermis. Acceptate: PDF, text, imagini (PNG/JPG).'); return; }
    if (f.size > MAX_BYTES) { toast.error('Fișier prea mare (max 25 MB).'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result || '').split(',')[1] || '';
      setFile({ name: f.name, mime: f.type || 'application/octet-stream', data: b64, size: f.size });
    };
    reader.onerror = () => toast.error('Nu am putut citi fișierul.');
    reader.readAsDataURL(f);
  }, []);

  const isFileDrag = (e: React.DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');
  const onDragEnter = (e: React.DragEvent) => { if (!isFileDrag(e)) return; e.preventDefault(); dragDepth.current++; setDragOver(true); };
  const onDragOver = (e: React.DragEvent) => { if (!isFileDrag(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
  const onDragLeave = (e: React.DragEvent) => { if (!isFileDrag(e)) return; e.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragOver(false); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); dragDepth.current = 0; setDragOver(false); pickFile(e.dataTransfer.files?.[0]); };

  const doPrint = async () => {
    if (!file) { toast.error('Alege un fișier.'); return; }
    if (!selected) { toast.error('Alege o imprimantă.'); return; }
    setPrinting(true);
    try {
      await apiCommand('print_file', {
        filename: file.name, mime: file.mime, data: file.data,
        printer: selected, copies, pages: pages.trim() || undefined,
      });
      toast.success(`„${file.name}" trimis la ${selected}.`);
      setFile(null); setPages('');
      void loadJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Imprimarea a eșuat.');
    } finally { setPrinting(false); }
  };

  const saveAdmin = async (next: AdminConfig) => {
    setSavingCfg(true);
    try {
      await apiCommand('admin_print_config_set', {
        enabled: next.enabled,
        allowed: next.printers.filter(p => p.allowed).map(p => p.name),
      });
      setCfg(next);
      toast.success('Setări imprimare salvate.');
      void loadPrinters();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nu am putut salva.');
    } finally { setSavingCfg(false); }
  };
  const toggleAllowed = (name: string) => { if (cfg) void saveAdmin({ ...cfg, printers: cfg.printers.map(p => p.name === name ? { ...p, allowed: !p.allowed } : p) }); };
  const toggleEnabled = () => { if (cfg) void saveAdmin({ ...cfg, enabled: !cfg.enabled }); };

  const noPrinters = !loading && printers.length === 0;

  return (
    <DashboardLayout
        chrome={(
          <PageChrome
            actions={
              <>
                {isAdmin && (
                  <Button
                    size="md"
                    variant={showAdmin ? 'primary' : 'outline'}
                    onClick={() => setShowAdmin(s => !s)}
                  >
                    <Settings2 className="h-3.5 w-3.5" /> Administrare
                  </Button>
                )}
                <Button
                  size="md"
                  variant="outline"
                  onClick={() => { void loadPrinters(); void loadJobs(); void loadAdmin(); }}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Reîmprospătează
                </Button>
              </>
            }
          />
        )}
    >
      {isAdmin && showAdmin && (
        <Panel title="Administrare imprimante" subtitle="Aprobă imprimantele disponibile pe server" className="mb-0 shrink-0">
          <p className="mb-4 text-pm-xs text-content-muted">
            Aprobă imprimantele pe care utilizatorii le pot folosi. Doar imprimantele instalate în Windows pe acest server apar aici.
          </p>
          <label className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-surface-secondary/60 px-4 py-3">
            <input type="checkbox" checked={!!cfg?.enabled} onChange={toggleEnabled} disabled={savingCfg} className="h-4 w-4 accent-[var(--color-accent)]" />
            <span className="min-w-0">
              <span className="block text-pm-sm font-semibold text-content-primary">Imprimare activată</span>
              <span className="block text-pm-2xs text-content-muted">Dezactivat = nimeni nu poate imprima (kill-switch).</span>
            </span>
          </label>
          {cfg && cfg.printers.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl border-l-2 border-status-amber bg-status-amber/8 px-4 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-status-amber" />
              <p className="min-w-0 text-pm-xs text-content-secondary">
                Nicio imprimantă instalată pe server. Adaug-o întâi în Windows (Setări → Bluetooth & dispozitive → Imprimante → Adaugă, prin IP/hostname), apoi revino aici.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {cfg?.printers.map(p => (
                <li key={p.name}>
                  <label className="flex items-center gap-3 rounded-xl border border-line bg-surface-secondary/40 px-4 py-2.5 cursor-pointer hover:bg-surface-tertiary/50 transition-smooth duration-150">
                    <input type="checkbox" checked={p.allowed} onChange={() => toggleAllowed(p.name)} disabled={savingCfg} className="h-4 w-4 accent-[var(--color-accent)]" />
                    <Printer className="h-4 w-4 shrink-0 text-content-muted" />
                    <span className="min-w-0 flex-1 truncate text-pm-sm text-content-primary">{p.name}</span>
                    {p.isDefault && <StatusBadge tone="accent" label="Implicită" size="xs" />}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 flex-1 min-h-0">
        <div className="lg:col-span-2 min-h-0 flex flex-col">
          <Panel title="Trimite la imprimantă" subtitle="PDF, text sau imagini · max 25 MB" fill scroll className="flex-1 min-h-0">
                {noPrinters ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-tertiary text-content-muted">
                      <Printer className="h-6 w-6" />
                    </span>
                    <p className="text-pm-sm font-semibold text-content-primary">Nicio imprimantă disponibilă</p>
                    <p className="max-w-md text-pm-xs text-content-muted">
                      {isAdmin
                        ? 'Adaugă imprimanta în Windows pe server, apoi aprob-o din „Administrare".'
                        : 'Niciun administrator nu a aprobat încă o imprimantă. Contactează administratorul.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Printer */}
                    <label className="mb-1.5 block text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Imprimantă</label>
                    <select
                      value={selected}
                      onChange={e => setSelected(e.target.value)}
                      disabled={loading}
                      className="mb-5 h-10 w-full rounded-xl border border-line bg-surface-secondary px-3 text-pm-sm text-content-primary focus:border-accent focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
                    >
                      {printers.map(p => <option key={p.name} value={p.name}>{p.name}{p.isDefault ? '  (implicită)' : ''}</option>)}
                    </select>

                    {/* Dropzone / selected file */}
                    <label className="mb-1.5 block text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Fișier</label>
                    {file ? (
                      <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-surface-secondary/60 px-4 py-3">
                        <FileGlyph name={file.name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-pm-sm font-medium text-content-primary">{file.name}</span>
                          <span className="block text-pm-2xs text-content-muted tabular-nums">{fmtSize(file.size)}</span>
                        </span>
                        <button type="button" onClick={() => setFile(null)} aria-label="Elimină fișierul" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-smooth duration-150">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                        className={`mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-smooth duration-150 ${
                          dragOver ? 'border-accent bg-accent/10' : 'border-line bg-surface-secondary/40'
                        }`}
                      >
                        {dragOver ? <UploadCloud className="h-7 w-7 text-accent" /> : <Upload className="h-7 w-7 text-content-muted" />}
                        <p className="text-pm-sm font-medium text-content-primary">Trage un fișier aici</p>
                        <p className="text-pm-2xs text-content-muted">PDF, text sau imagine · max 25 MB</p>
                        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                        <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-secondary px-3 py-1.5 text-pm-xs font-semibold text-content-primary hover:bg-surface-tertiary transition-smooth duration-150 active:scale-[0.98]">
                          <Upload className="h-3.5 w-3.5" /> Alege fișier
                        </button>
                      </div>
                    )}

                    {/* Options */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Copii</label>
                        <input
                          type="number" min={1} max={50} value={copies}
                          onChange={e => setCopies(Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                          className="h-10 w-full rounded-xl border border-line bg-surface-secondary px-3 text-pm-sm text-content-primary tabular-nums focus:border-accent focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Pagini (opțional)</label>
                        <input
                          type="text" value={pages} placeholder="ex. 1-3, 5"
                          onChange={e => setPages(e.target.value)}
                          className="h-10 w-full rounded-xl border border-line bg-surface-secondary px-3 text-pm-sm text-content-primary focus:border-accent focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
                        />
                      </div>
                    </div>

                    <div className="mb-4 flex items-start gap-2 rounded-xl border-l-2 border-status-blue bg-status-blue/8 px-3 py-2">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-blue" />
                      <p className="min-w-0 text-pm-2xs text-content-secondary">Word/Excel: salvează-le ca PDF înainte de a le imprima.</p>
                    </div>

                    <button
                      type="button" onClick={doPrint} disabled={printing || !file || !selected}
                      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-accent text-pm-md font-semibold text-[var(--color-on-accent)] shadow-[var(--elevation-2)] transition-smooth duration-150 hover:bg-accent/95 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:shadow-[var(--ring-soft)]"
                    >
                      {printing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />}
                      {printing ? 'Se trimite…' : 'Imprimă'}
                    </button>
                  </>
                )}
          </Panel>
        </div>

        <div className="min-h-0 flex flex-col">
          <Panel title="Joburi recente" subtitle="Ultimele 12 lucrări trimise" fill scroll className="flex-1 min-h-0">
                {jobs.length === 0 ? (
                  <p className="py-6 text-center text-pm-xs text-content-muted">Niciun job încă.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {jobs.map(j => {
                      const t = jobTone(j.status);
                      return (
                        <li key={j.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-secondary/40 px-3 py-2">
                          <FileGlyph name={j.filename} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-pm-xs font-medium text-content-primary">{j.filename}</span>
                            <span className="block truncate text-pm-2xs text-content-muted">{j.printer_name}{j.copies > 1 ? ` · ${j.copies}×` : ''}</span>
                          </span>
                          <StatusBadge tone={t.tone} label={t.label} size="xs" />
                        </li>
                      );
                    })}
                  </ul>
                )}
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
}
