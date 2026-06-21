import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Package, History, Plus,
  Pencil, Trash2, Search, X as XIcon, Loader2,
} from 'lucide-react';

import type { User } from '@/core/types';
import { cn } from '@/lib/cn';
import { useMaterialStore, type Material } from '@/store/materialStore';
import { useSettingsStore } from '@/store/settingsStore';
import { apiCommand } from '@/api/commands';
import { useViewerMode } from '@/hooks/useViewerMode';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';

import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import StatusBadge from '@/redesign/ui/StatusBadge';
import type { StatusTone } from '@/lib/statusTokens';
import { filterSearchInputCls, filterSearchIconCls, filterSelectCls } from '@/redesign/ui/filterControls';

// ── Stock-status helpers (preserved verbatim) ──
function qtyOf(m: Material): number { return m.quantity ?? m.stock ?? 0; }
function minOf(m: Material): number { return m.minimum_threshold ?? m.min_stock ?? 0; }
function isLowStock(m: Material): boolean {
  const s = (m.status || '').toLowerCase();
  return s === 'stoc redus' || s === 'stoc_redus' || s === 'low_stock' || (qtyOf(m) > 0 && qtyOf(m) <= minOf(m));
}
function isOutOfStock(m: Material): boolean {
  const s = (m.status || '').toLowerCase();
  return s === 'epuizat' || s === 'out_of_stock' || qtyOf(m) === 0;
}
function stockBadge(m: Material): { tone: StatusTone; label: string } {
  if (isOutOfStock(m)) return { tone: 'danger', label: 'Epuizat' };
  if (isLowStock(m)) return { tone: 'warning', label: 'Stoc redus' };
  return { tone: 'success', label: 'În stoc' };
}

type FormState = {
  name: string; category: string; unit: string;
  stock: string; min_stock: string; unit_cost: string;
  currency: string; supplier: string; location: string;
};
const EMPTY_FORM: FormState = {
  name: '', category: '', unit: '', stock: '0', min_stock: '0',
  unit_cost: '0', currency: 'RON', supplier: '', location: '',
};

interface ConsumptionRow { date?: string; created_at?: string; material_name?: string; material?: string; project_name?: string; project?: string; quantity?: number; user_name?: string; user?: string }
interface Col<T> { key: string; header: string; align?: 'end'; render?: (row: T) => React.ReactNode }

const inputCls = 'w-full h-9 rounded-xl border border-line/70 bg-surface-secondary/40 px-3 text-pm-sm text-content-primary transition-smooth duration-150 hover:border-content-muted/50 focus:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)] focus:shadow-[var(--ring-soft)]';
const labelCls = 'text-pm-2xs font-bold uppercase tracking-wide text-content-muted';

export default function InventoryPage({ user: _user }: { user: User | null }) {
  const isViewer = useViewerMode('materials');
  const materials = useMaterialStore(s => s.materials);
  const locations = useMaterialStore(s => s.locations);
  const loading = useMaterialStore(s => s.loading);
  const fetchMaterials = useMaterialStore(s => s.fetchMaterials);
  const fetchLocations = useMaterialStore(s => s.fetchLocations);
  const createMaterial = useMaterialStore(s => s.createMaterial);
  const updateMaterial = useMaterialStore(s => s.updateMaterial);
  const deleteMaterial = useMaterialStore(s => s.deleteMaterial);
  const loadSettings = useSettingsStore(s => s.load);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [histOpen, setHistOpen] = useState(false);
  const [consumptions, setConsumptions] = useState<ConsumptionRow[]>([]);

  useEffect(() => {
    void fetchMaterials();
    void fetchLocations();
    void loadSettings();
    apiCommand<ConsumptionRow[]>('get_material_consumptions')
      .then(d => setConsumptions(Array.isArray(d) ? d : []))
      .catch(() => setConsumptions([]));
  }, [fetchMaterials, fetchLocations, loadSettings]);

  const categories = useMemo(
    () => [...new Set(materials.map(m => m.category).filter(Boolean))].sort() as string[],
    [materials],
  );

  const data = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter(m => {
      if (filterCategory && m.category !== filterCategory) return false;
      if (filterStatus === 'low' && !isLowStock(m)) return false;
      if (filterStatus === 'out' && !isOutOfStock(m)) return false;
      if (filterStatus === 'ok' && (isLowStock(m) || isOutOfStock(m))) return false;
      if (q && !(`${m.name} ${m.category} ${m.supplier_name}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [materials, search, filterCategory, filterStatus]);

  const openCreate = useCallback(() => { setEditId(null); setForm(EMPTY_FORM); setDialogOpen(true); }, []);
  const openEdit = useCallback((m: Material) => {
    setEditId(m.id);
    setForm({
      name: m.name, category: m.category ?? '', unit: m.unit ?? '',
      stock: String(qtyOf(m)), min_stock: String(minOf(m)), unit_cost: String(m.unit_cost ?? 0),
      currency: m.currency || 'RON', supplier: m.supplier_name ?? '', location: m.location ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (m: Material) => {
    if (!(await confirmDialog({ title: 'Șterge materialul?', body: `„${m.name}” va fi eliminat. Acțiunea nu poate fi anulată.`, danger: true }))) return;
    try { await deleteMaterial(m.id); toast.success('Material șters'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la ștergere'); }
  }, [deleteMaterial]);

  const save = useCallback(async () => {
    try {
      const payload = {
        name: form.name, category: form.category, unit: form.unit,
        stock: Number(form.stock) || 0, min_stock: Number(form.min_stock) || 0,
        unit_cost: Number(form.unit_cost) || 0, currency: form.currency,
        supplier: form.supplier, location: form.location, status: 'In stoc',
      };
      if (editId != null) await updateMaterial(editId, payload);
      else await createMaterial(payload);
      toast.success('Material salvat');
      setDialogOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la salvare'); }
  }, [form, editId, createMaterial, updateMaterial]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const columns: Col<Material>[] = [
    { key: 'name', header: 'Denumire', render: m => <span className="font-medium text-content-primary">{m.name}</span> },
    { key: 'category', header: 'Categorie', render: m => m.category || '—' },
    { key: 'unit', header: 'Unitate', render: m => m.unit || '—' },
    { key: 'quantity', header: 'Cantitate', align: 'end', render: m => qtyOf(m) },
    { key: 'min', header: 'Prag minim', align: 'end', render: m => minOf(m) },
    { key: 'supplier', header: 'Furnizor', render: m => m.supplier_name || '—' },
    { key: 'status', header: 'Status', render: m => { const s = stockBadge(m); return <StatusBadge tone={s.tone} label={s.label} size="xs" />; } },
    {
      key: 'actions', header: '', align: 'end', render: m => isViewer ? null : (
        <span className="inline-flex items-center gap-1 justify-end">
          <IconButton intent="primary" size="sm" title="Editează" onClick={() => openEdit(m)}><Pencil aria-hidden /></IconButton>
          <IconButton intent="danger" size="sm" title="Șterge" onClick={() => handleDelete(m)}><Trash2 aria-hidden /></IconButton>
        </span>
      ),
    },
  ];

  const histColumns: Col<ConsumptionRow>[] = [
    { key: 'date', header: 'Data', render: r => <span className="tabular-nums text-content-muted">{r.date ?? r.created_at ?? '—'}</span> },
    { key: 'material', header: 'Material', render: r => r.material_name ?? r.material ?? '—' },
    { key: 'project', header: 'Proiect', render: r => r.project_name ?? r.project ?? '—' },
    { key: 'quantity', header: 'Cantitate', align: 'end', render: r => r.quantity ?? '—' },
    { key: 'user', header: 'Utilizator', render: r => r.user_name ?? r.user ?? '—' },
  ];

  return (
    <Page fit>
      <Page.Body fit maxWidth="full" padding="flush" className="!gap-0 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 shrink-0 border-b border-line/60">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <Package className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-pm-lg font-semibold text-content-primary leading-tight truncate">Inventar</h1>
                <p className="mt-0.5 text-pm-sm text-content-muted">Catalog de materiale, stocuri, valoare și consumuri</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="md" onClick={() => setHistOpen(true)}><History className="h-4 w-4" /> Istoric consumuri</Button>
              {!isViewer && <Button size="md" onClick={openCreate}><Plus className="h-4 w-4" /> Adaugă material</Button>}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 pt-4 shrink-0 flex flex-wrap items-center gap-2">
          <div className="group relative grow max-w-sm">
            <Search className={filterSearchIconCls} aria-hidden />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Denumire, categorie, furnizor…" aria-label="Caută material" className={`${filterSearchInputCls} !w-full`} />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={filterSelectCls(filterCategory !== '')}>
            <option value="">Toate categoriile</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={filterSelectCls(filterStatus !== '')}>
            <option value="">Toate statusurile</option>
            <option value="ok">În stoc</option>
            <option value="low">Stoc redus</option>
            <option value="out">Epuizat</option>
          </select>
          <span className="ml-auto text-pm-2xs text-content-muted tabular-nums">{data.length} / {materials.length}</span>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
          <Card padding="none" className="min-w-0 overflow-hidden">
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center py-16 anim-fade-in"><Loader2 className="h-6 w-6 animate-spin text-content-muted" /></div>
            ) : (
              <DataTable columns={columns} rows={data} empty="Niciun material găsit" />
            )}
          </Card>
        </div>
      </Page.Body>

      {/* Create / edit material */}
      {dialogOpen && (
        <Modal title={editId != null ? 'Editează material' : 'Adaugă material'} onClose={() => setDialogOpen(false)}
          footer={<><Button variant="secondary" size="sm" onClick={() => setDialogOpen(false)}>Anulează</Button><Button size="sm" onClick={save}>Salvează</Button></>}>
          <Field label="Denumire" required>
            <input className={inputCls} value={form.name} onChange={set('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categorie" required><input className={inputCls} value={form.category} onChange={set('category')} /></Field>
            <Field label="Unitate" required><input className={inputCls} value={form.unit} onChange={set('unit')} placeholder="buc, kg, m…" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantitate" required><input type="number" className={inputCls} value={form.stock} onChange={set('stock')} /></Field>
            <Field label="Prag minim" required><input type="number" className={inputCls} value={form.min_stock} onChange={set('min_stock')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost unitar" required><input type="number" className={inputCls} value={form.unit_cost} onChange={set('unit_cost')} /></Field>
            <Field label="Monedă">
              <select className={inputCls} value={form.currency} onChange={set('currency')}>
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
              </select>
            </Field>
          </div>
          <Field label="Furnizor"><input className={inputCls} value={form.supplier} onChange={set('supplier')} /></Field>
          <Field label="Locație">
            {locations.length > 0 ? (
              <select className={inputCls} value={form.location} onChange={set('location')}>
                <option value="">—</option>
                {locations.map(l => <option key={l.id} value={l.name}>{l.name} ({l.code})</option>)}
              </select>
            ) : (
              <input className={inputCls} value={form.location} onChange={set('location')} placeholder="Locație depozit" />
            )}
          </Field>
        </Modal>
      )}

      {/* Consumption history */}
      {histOpen && (
        <Modal title="Istoric consumuri" onClose={() => setHistOpen(false)} wide
          footer={<Button variant="secondary" size="sm" onClick={() => setHistOpen(false)}>Închide</Button>}>
          <div className="max-h-[60vh] overflow-auto -mx-4">
            <DataTable columns={histColumns} rows={consumptions} empty="Niciun consum înregistrat" />
          </div>
        </Modal>
      )}
    </Page>
  );
}

// ── Reusable Tailwind table ──
function DataTable<T>({ columns, rows, empty }: { columns: Col<T>[]; rows: T[]; empty: string }) {
  if (rows.length === 0) return <div className="py-16 text-center text-pm-sm text-content-muted">{empty}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-tertiary/40">
            {columns.map(c => (
              <th key={c.key} className={cn('px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.08em] text-content-muted whitespace-nowrap border-b border-line', c.align === 'end' && 'text-right')}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line/50 last:border-b-0 hover:bg-surface-tertiary/30 transition-colors">
              {columns.map(c => (
                <td key={c.key} className={cn('px-3 py-2 text-pm-sm text-content-secondary whitespace-nowrap', c.align === 'end' && 'text-right tabular-nums')}>
                  {c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as React.ReactNode) ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-status-red"> *</span>}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 anim-fade-in" onClick={onClose}>
      <div className={cn('w-full max-h-[88vh] overflow-y-auto rounded-2xl border border-line bg-surface-primary shadow-[var(--elevation-4)] anim-scale-in', wide ? 'max-w-3xl' : 'max-w-lg')} onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line/70 bg-surface-primary px-4 py-3">
          <h3 className="text-pm-sm font-semibold text-content-primary truncate">{title}</h3>
          <button onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-muted transition-smooth duration-150 hover:bg-surface-tertiary hover:text-content-primary active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]" aria-label="Închide"><XIcon className="h-4 w-4" /></button>
        </header>
        <div className="p-4 space-y-3">{children}</div>
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-line/70 bg-surface-primary px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}
