

import { useState, useEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { FileText, Plus, Save, History, Edit2, Loader2, ScrollText, Download, Upload, Paperclip, Trash2 } from '@/icons';
import { downloadContractAttachments, downloadOneContractAttachment } from '@/lib/downloadPdf';
import { cn } from '@/lib/cn';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { useProjectStore } from '@/store/projectStore';
import { useClientStore } from '@/store/clientStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from '@/store/toastStore';
import { contractStatus } from '@/lib/statusTokens';
import { useMoney } from '@/store/settingsStore';

import { PageChrome, DashboardLayout, Panel, PANEL_HEAD } from '@/app-ui';
import Card, { CardBody } from '@/redesign/ui/Card';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import FilterBar from '@/redesign/ui/FilterBar';
import StatusBadge, { statusBorderClass } from '@/redesign/ui/StatusBadge';
import { MetricValue, SectionHeader, EmptyState } from '@/redesign/ui';
import { confirmDialog } from '@/redesign/ui/ConfirmDialog';
import FormModal from '@/redesign/ui/FormModal';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Eroare la citirea fișierului'));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(base64Len: number): string {
  if (!base64Len) return '—';
  const bytes = Math.round(base64Len * 0.75);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const MAX_FILE_BYTES = 35 * 1024 * 1024;

interface ContractSection { id: number; title: string; content: string; order_index: number; required: boolean; }
interface Contract {
  id: number; project_id: number; project_name: string; contract_code: string; title: string;
  client_id: number; client_name: string; site_location: string | null; delivered_product: string | null;
  sale_price: number; execution_term: string | null; pif_term: string | null;
  status: string; revision: number; observations: string | null;
  created_at: string; updated_at: string; sections: ContractSection[];
}
interface ContractAttachment {
  id: number; filename: string | null; mime: string | null;
  size: number; created_by_name: string | null; created_at: string;
}

const CONTRACT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'active',  label: 'Activ' },
  { value: 'amended', label: 'Amendat' },
  { value: 'closed',  label: 'Închis' },
];

export default function ContractPage({ user: _user }: { user: User | null }) {
  const money = useMoney();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const clients = useClientStore(s => s.clients);
  const fetchClientsStore = useClientStore(s => s.fetchClients);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [revisingContractId, setRevisingContractId] = useState<number | null>(null);
  
  const [attachments, setAttachments] = useState<ContractAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchContracts = useCallback(() => {
    setLoading(true);
    apiCommand<Contract[]>('get_contracts').then(setContracts).catch(() => setContracts([])).finally(() => setLoading(false));
  }, []);

  const loadAttachments = useCallback(async (contractId: number) => {
    try {
      const list = await apiCommand<ContractAttachment[]>('list_contract_attachments', { contract_id: contractId });
      setAttachments(list || []);
    } catch { setAttachments([]); }
  }, []);

  useEffect(() => {
    fetchContracts();
    void fetchProjects();
    void fetchClientsStore();
  }, [fetchContracts, fetchProjects, fetchClientsStore]);

  const uploadFilesToContract = async (contractId: number, files: File[]): Promise<number> => {
    let count = 0;
    for (const f of files) {
      if (!f || f.size === 0) continue;
      if (f.size > MAX_FILE_BYTES) { toast.error(`„${f.name}" depășește 35 MB și nu a fost încărcat`); continue; }
      const data = await fileToBase64(f);
      await apiCommand('add_contract_attachment', {
        contract_id: contractId, filename: f.name, mime: f.type || 'application/octet-stream', data,
      });
      count++;
    }
    return count;
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const files = (fd.getAll('contract_files') as unknown as File[]).filter(f => f instanceof File && f.size > 0);
    setUploading(true);
    try {
      const rawProject = fd.get('project_id');
      const c = await apiCommand<Contract>('create_contract', {
        project_id: rawProject ? Number(rawProject) : undefined,
        title: fd.get('title') as string,
        client_id: Number(fd.get('client_id')),
        delivered_product: fd.get('delivered_product') as string || null,
        sale_price: Number(fd.get('sale_price')) || 0,
        execution_term: fd.get('execution_term') as string || null,
      });
      if (files.length > 0) {
        const n = await uploadFilesToContract(c.id, files);
        if (n > 0) toast.success(`${n} fișier(e) încărcat(e)`);
      }
      setSelected(c);
      await loadAttachments(c.id);
      setShowCreate(false);
      toast.success('Contract creat');
      fetchContracts();
      void useDashboardStore.getState().invalidate();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la creare contract'); }
    finally { setUploading(false); }
  };

  const handleUploadMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected) return;
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    try {
      const n = await uploadFilesToContract(selected.id, files);
      if (n > 0) { toast.success(`${n} fișier(e) încărcat(e)`); await loadAttachments(selected.id); }
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la încărcare'); }
    finally { setUploading(false); }
  };

  const handleDeleteAttachment = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge fișierul?', body: 'Fișierul încărcat va fi eliminat din contract.', danger: true }))) return;
    try {
      await apiCommand('delete_contract_attachment', { id });
      toast.success('Fișier șters');
      if (selected) await loadAttachments(selected.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la ștergere'); }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await apiCommand<Contract>('update_contract', {
        id: selected.id,
        title: selected.title,
        site_location: selected.site_location,
        delivered_product: selected.delivered_product,
        sale_price: selected.sale_price,
        execution_term: selected.execution_term,
        pif_term: selected.pif_term,
        status: selected.status,
        observations: selected.observations,
        sections: selected.sections.map(s => ({ id: s.id, content: s.content })),
      });
      setSelected(updated);
      setEditing(false);
      toast.success('Contract salvat');
      fetchContracts();
      void useDashboardStore.getState().invalidate();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la salvare'); }
    finally { setSaving(false); }
  };

  const handleRevision = () => {
    if (!selected) return;
    setRevisingContractId(selected.id);
  };

  const submitRevision = async (data: Record<string, unknown>) => {
    if (revisingContractId == null) return;
    
    const notes = (data.notes as string | undefined)?.trim() || 'Revizuire fără observatii';
    const updated = await apiCommand<Contract>('create_contract_revision', { contract_id: revisingContractId, notes });
    setSelected(updated);
    setRevisingContractId(null);
    toast.success('Revizuire creata');
    fetchContracts();
    void useDashboardStore.getState().invalidate();
  };

  const visibleContracts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter(c => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.contract_code.toLowerCase().includes(q) ||
        (c.client_name || '').toLowerCase().includes(q) ||
        (c.project_name || '').toLowerCase().includes(q)
      );
    });
  }, [contracts, search, statusFilter]);

  const selectContract = (c: Contract) => {
    startMorphTransition(() => flushSync(() => {
      setSelected(c); setEditing(false); setAttachments([]); setShowCreate(false);
    }), { dir: 'forward' });
    apiCommand<Contract>('get_contract', { contract_id: c.id }).then(setSelected);
    void loadAttachments(c.id);
  };

  return (
    <>
      <DashboardLayout
        chrome={(
          <PageChrome
            actions={
              <Button size="md" onClick={() => startMorphTransition(() => flushSync(() => setShowCreate(true)), { dir: 'forward' })}>
                <Plus className="h-4 w-4" /> Contract nou
              </Button>
            }
            toolbar={(
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Caută cod, titlu, client sau proiect..."
            clearable
            onClearAll={() => { setSearch(''); setStatusFilter(''); }}
            filters={[{
              key: 'status',
              label: 'Toate statusurile',
              value: statusFilter,
              onChange: setStatusFilter,
              options: CONTRACT_STATUS_OPTIONS,
            }]}
          />
            )}
          />
        )}
        bodyClassName="relative"
        contentClassName="max-w-[var(--page-max-wide)] mx-auto"
      >
        <div className="page-content-grid stagger-in grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">

          <Panel
            fill
            scroll
            className="lg:col-span-4 min-h-0"
            title="Contracte"
            subtitle={`${visibleContracts.length}/${contracts.length}`}
            bodyClassName="p-0"
          >
            <div className="flex-1 min-h-0 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center pt-8">
                  <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
                </div>
              ) : visibleContracts.length === 0 ? (
                <EmptyState
                  icon={ScrollText}
                  title={contracts.length === 0 ? 'Niciun contract încă' : 'Niciun rezultat'}
                  description={contracts.length === 0
                    ? 'Creează primul contract pentru a urmări termeni, valori și revizii.'
                    : 'Niciun contract nu se potrivește filtrelor curente.'}
                />
              ) : (
                <div key={`${search}|${statusFilter}`} className="stagger-in">
                {visibleContracts.map(c => (
                <button key={c.id}
                  onClick={() => selectContract(c)}
                  style={{ viewTransitionName: selected?.id === c.id ? undefined : vtName('contract', c.id) }}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-line/60 hover:bg-surface-tertiary/30 transition-smooth duration-150 border-l-2',
                    'focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] active:scale-[0.99]',
                    selected?.id === c.id
                      ? 'border-l-accent bg-accent/5'
                      : statusBorderClass(contractStatus(c.status).tone),
                  )}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-pm-xs font-mono text-accent truncate">{c.contract_code}</span>
                    <StatusBadge {...contractStatus(c.status)} size="xs" />
                  </div>
                  <p className="text-pm-sm font-medium text-content-primary truncate mt-0.5">{c.title}</p>
                  <p className="text-pm-xs text-content-muted truncate">{c.client_name} — {c.project_name}</p>
                </button>
              ))}
                </div>
              )}
            </div>
          </Panel>

          <div
            key={showCreate ? 'create' : selected ? `c${selected.id}` : 'empty'}
            className="lg:col-span-8 min-w-0 min-h-0 overflow-y-auto"
          >
            {!selected && !showCreate ? (
              <Card>
                <EmptyState
                  icon={FileText}
                  title="Selectează un contract"
                  description="Alege un contract din listă pentru a vedea detaliile, termenii și documentele încărcate."
                />
              </Card>
            ) : showCreate ? (
              
              <Card>
                <div className={`flex items-center gap-3 ${PANEL_HEAD}`}>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-muted text-accent shrink-0">
                    <Plus className="h-4 w-4" />
                  </span>
                  <h2 className="text-pm-md font-semibold text-content-primary flex-1 min-w-0 truncate">Contract nou</h2>
                </div>
                <CardBody>
                  <form onSubmit={handleCreate} className="space-y-4 max-w-2xl">
                    <div>
                      <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Titlu *</label>
                      <input name="title" required
                        className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary placeholder:text-content-muted transition-smooth duration-150 focus-visible:outline-none focus-visible:border-accent/60 focus-visible:shadow-[var(--ring-soft)]"
                        placeholder="Titlu contract" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Proiect</label>
                        <select name="project_id"
                          className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary transition-smooth duration-150 focus-visible:outline-none focus-visible:border-accent/60 focus-visible:shadow-[var(--ring-soft)]">
                          <option value="">➕ Creează proiect automat (din titlu)</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <p className="text-pm-2xs text-content-muted mt-1">Lasă gol și se creează automat un proiect pentru acest contract.</p>
                      </div>
                      <div>
                        <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Client *</label>
                        <select name="client_id" required
                          className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary transition-smooth duration-150 focus-visible:outline-none focus-visible:border-accent/60 focus-visible:shadow-[var(--ring-soft)]">
                          <option value="">Selectează...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Produs livrat</label>
                      <input name="delivered_product"
                        className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary placeholder:text-content-muted transition-smooth duration-150 focus-visible:outline-none focus-visible:border-accent/60 focus-visible:shadow-[var(--ring-soft)]"
                        placeholder="ex: Statie betoane automatiX M60" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Preț vânzare (lei)</label>
                        <input name="sale_price" type="number" step="0.01"
                          className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary tabular-nums transition-smooth duration-150 focus-visible:outline-none focus-visible:border-accent/60 focus-visible:shadow-[var(--ring-soft)]" />
                      </div>
                      <div>
                        <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Termen executie</label>
                        <input name="execution_term"
                          className="w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-xs text-content-primary placeholder:text-content-muted transition-smooth duration-150 focus-visible:outline-none focus-visible:border-accent/60 focus-visible:shadow-[var(--ring-soft)]"
                          placeholder="ex: 90 zile" />
                      </div>
                    </div>
                    <div>
                      <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Contract (fișier) — orice format</label>
                      <input name="contract_files" type="file" multiple
                        className="w-full text-pm-xs text-content-secondary file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-lg file:bg-accent file:text-[var(--color-on-accent)] file:font-semibold file:cursor-pointer file:transition file:duration-150 hover:file:brightness-105 rounded-xl border border-line bg-surface-primary px-3 py-2 transition-smooth duration-150 focus-visible:outline-none focus-visible:border-accent/60 focus-visible:shadow-[var(--ring-soft)]" />
                      <p className="text-pm-2xs text-content-muted mt-1">Poți încărca unul sau mai multe fișiere (PDF, scan, DOCX etc.), max 35 MB/fișier. Le poți adăuga și după creare.</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} disabled={uploading}>Anulează</Button>
                      <Button size="sm" type="submit" disabled={uploading}>
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        {uploading ? 'Se creează...' : 'Creează contract'}
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            ) : selected && (
              <div className="space-y-4">
                <Panel padding="none" className="!p-0">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 px-6 py-5 vt-morph" style={{ viewTransitionName: vtName('contract', selected.id) }}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-pm-xs font-mono text-accent">{selected.contract_code}</span>
                        <StatusBadge {...contractStatus(selected.status)} size="xs" />
                        <span className="text-pm-2xs text-content-muted tabular-nums">Rev. {selected.revision}</span>
                      </div>
                      <h3 className="text-pm-lg font-semibold text-content-primary mt-1.5 truncate">{selected.title}</h3>
                      <p className="text-pm-xs text-content-muted mt-0.5">{selected.client_name} — {selected.project_name}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {!editing ? (
                        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                          <Edit2 className="h-3 w-3" /> Editează
                        </Button>
                      ) : (
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          {saving ? 'Se salvează...' : 'Salvează'}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={handleRevision}>
                        <History className="h-3 w-3" /> Revizuire
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => selected && downloadContractAttachments(selected.id)}>
                        <Download className="h-3 w-3" /> Descarcă contract
                      </Button>
                    </div>
                  </div>
                  <div className="border-t border-line/70 px-6 py-4 flex items-baseline gap-3">
                    <span className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Pret vanzare</span>
                    <MetricValue value={selected.sale_price || 0} size="regular" format={(n) => money(n, 'EUR')} />
                  </div>
                </Panel>

                <div key={`sub-${selected.id}`} className="stagger-in grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                  <Card>
                    <SectionHeader icon={FileText} title="Detalii contract" className="!mb-0 px-5 pt-4" />
                    <CardBody>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { label: 'Produs livrat', value: selected.delivered_product, key: 'delivered_product' },
                          { label: 'Pret vanzare', value: selected.sale_price?.toString(), key: 'sale_price' },
                          { label: 'Termen executie', value: selected.execution_term, key: 'execution_term' },
                          { label: 'Termen PIF', value: selected.pif_term, key: 'pif_term' },
                          { label: 'Locație', value: selected.site_location, key: 'site_location' },
                        ].map(f => (
                          <div key={f.key} className="rounded-xl border border-line/70 bg-surface-secondary/40 p-3">
                            <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">{f.label}</label>
                            {editing ? (
                              <input key="edit" value={f.value || ''} onChange={e => setSelected({...selected, [f.key]: f.key === 'sale_price' ? Number(e.target.value) : e.target.value} as Contract)}
                                className=" w-full rounded-lg border border-line bg-surface-primary px-2 py-1 text-pm-xs text-content-primary transition-smooth duration-150 focus-visible:outline-none focus-visible:border-accent/60 focus-visible:shadow-[var(--ring-soft)]" />
                            ) : (
                              <p key="read" className={` text-pm-xs text-content-primary ${f.key === 'sale_price' ? 'tabular-nums' : ''}`}>{f.value || '—'}</p>
                            )}
                          </div>
                        ))}
                        {editing && (
                          <div className=" rounded-xl border border-line/70 bg-surface-secondary/40 p-3">
                            <label className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-1.5 block">Status</label>
                            <select value={selected.status} onChange={e => setSelected({...selected, status: e.target.value})}
                              className="w-full rounded-lg border border-line bg-surface-primary px-2 py-1 text-pm-xs text-content-primary transition-smooth duration-150 focus-visible:outline-none focus-visible:border-accent/60 focus-visible:shadow-[var(--ring-soft)]">
                              {CONTRACT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>

                  {

}
                  <Card>
                    <div className={`flex items-center gap-3 ${PANEL_HEAD}`}>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-muted text-accent shrink-0">
                        <Paperclip className="h-4 w-4" />
                      </span>
                      <h2 className="text-pm-md font-semibold text-content-primary flex-1 min-w-0 truncate">Contract încărcat</h2>
                      <label className={cn(
                        'inline-flex items-center gap-1 shrink-0 rounded-lg px-1.5 py-1 -mr-1.5 text-pm-2xs font-semibold cursor-pointer transition-smooth duration-150',
                        'focus-within:outline-none focus-within:shadow-[var(--ring-soft)] active:scale-[0.98]',
                        uploading ? 'text-content-muted cursor-not-allowed' : 'text-accent hover:bg-accent/8',
                      )}>
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        {uploading ? 'Se încarcă...' : 'Încarcă fișier'}
                        <input type="file" multiple className="hidden" disabled={uploading} onChange={handleUploadMore} />
                      </label>
                    </div>
                    <CardBody>
                      {
}
                      <div key={`att-${selected.id}-${attachments.length}`} className="stagger-in space-y-2">
                        {attachments.length === 0 ? (
                          <EmptyState
                            icon={Paperclip}
                            title="Niciun fișier încărcat"
                            description={'Folosește „Încarcă fișier" pentru a adăuga contractul (orice format).'}
                          />
                        ) : attachments.map(a => (
                          <div key={a.id} className="group flex items-center gap-3 rounded-xl border border-line/70 bg-surface-secondary/40 px-3 py-2 hover:bg-surface-tertiary/40 transition-colors">
                            <FileText className="h-4 w-4 text-content-muted shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-pm-xs text-content-primary truncate" title={a.filename || 'fișier'}>{a.filename || 'fișier'}</p>
                              <p className="text-pm-2xs text-content-muted">{formatFileSize(a.size)}{a.created_by_name ? ` · ${a.created_by_name}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                              <IconButton intent="primary" size="sm" onClick={() => downloadOneContractAttachment(a.id)} aria-label="Descarcă fișierul" title="Descarcă fișierul">
                                <Download />
                              </IconButton>
                              <IconButton intent="danger" size="sm" onClick={() => handleDeleteAttachment(a.id)} aria-label="Șterge fișierul" title="Șterge fișierul">
                                <Trash2 />
                              </IconButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>

      <FormModal
        isOpen={revisingContractId !== null}
        onClose={() => setRevisingContractId(null)}
        title="Revizuire contract"
        fields={[{
          name: 'notes',
          label: 'Note revizuire',
          type: 'textarea',
          placeholder: 'Descrie modificarile (optional)',
        }]}
        onSubmit={submitRevision}
        submitLabel="Creează revizuire"
      />
    </>
  );
}
