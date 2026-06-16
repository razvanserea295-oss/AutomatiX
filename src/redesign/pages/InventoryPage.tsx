import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DynamicPage, DynamicPageTitle, DynamicPageHeader,
  Title, Label, Text, ObjectStatus, Toolbar, ToolbarButton,
  FilterBar, FilterGroupItem, Select, Option, Input,
  AnalyticalTable, Button, Dialog, Bar,
} from '@ui5/webcomponents-react';
import ButtonDesign from '@ui5/webcomponents/dist/types/ButtonDesign.js';
import ValueState from '@ui5/webcomponents-base/dist/types/ValueState.js';
import addIcon from '@ui5/webcomponents-icons/dist/add.js';
import editIcon from '@ui5/webcomponents-icons/dist/edit.js';
import deleteIcon from '@ui5/webcomponents-icons/dist/delete.js';
import historyIcon from '@ui5/webcomponents-icons/dist/history.js';

import type { User } from '@/core/types';
import { useMaterialStore, type Material } from '@/store/materialStore';
import { useSettingsStore, useMoney } from '@/store/settingsStore';
import { apiCommand } from '@/api/commands';
import { useViewerMode } from '@/hooks/useViewerMode';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';

// ── Stock-status helpers (preserved verbatim from the prior implementation) ──
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
function stockState(m: Material): { state: ValueState; label: string } {
  if (isOutOfStock(m)) return { state: ValueState.Negative, label: 'Epuizat' };
  if (isLowStock(m)) return { state: ValueState.Critical, label: 'Stoc redus' };
  return { state: ValueState.Positive, label: 'În stoc' };
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

function Kpi({ label, value, state }: { label: string; value: number | string; state?: ValueState }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '5rem' }}>
      <Label>{label}</Label>
      <Title level="H4" style={state && state !== ValueState.None ? { color: `var(--sapField_${state}Color, inherit)` } : undefined}>
        {String(value)}
      </Title>
    </div>
  );
}

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
  const eurRate = useSettingsStore(s => s.eurToRonRate);
  const loadSettings = useSettingsStore(s => s.load);
  const money = useMoney();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [histOpen, setHistOpen] = useState(false);
  const [consumptions, setConsumptions] = useState<any[]>([]);

  useEffect(() => {
    void fetchMaterials();
    void fetchLocations();
    void loadSettings();
    apiCommand<any[]>('get_material_consumptions')
      .then(d => setConsumptions(Array.isArray(d) ? d : []))
      .catch(() => setConsumptions([]));
  }, [fetchMaterials, fetchLocations, loadSettings]);

  const categories = useMemo(
    () => [...new Set(materials.map(m => m.category).filter(Boolean))].sort(),
    [materials],
  );

  const metrics = useMemo(() => {
    const lowStock = materials.filter(isLowStock).length;
    const outOfStock = materials.filter(isOutOfStock).length;
    const subPrag = materials.filter(m => minOf(m) > 0 && qtyOf(m) <= minOf(m) * 1.5).length;
    const totalValue = materials.reduce((acc, m) => {
      const v = qtyOf(m) * (m.unit_cost ?? 0);
      return acc + ((m.currency || 'RON').toUpperCase() === 'EUR' ? v * eurRate : v);
    }, 0);
    return { total: materials.length, lowStock, outOfStock, subPrag, totalValue };
  }, [materials, eurRate]);

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
    if (!(await confirmDialog({ title: 'Șterge materialul?', body: `„${m.name}" va fi eliminat. Acțiunea nu poate fi anulată.`, danger: true }))) return;
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

  const set = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const columns = useMemo<any[]>(() => [
    { Header: 'Denumire', accessor: 'name', Cell: ({ row }: any) => <Text>{row.original.name}</Text> },
    { Header: 'Categorie', accessor: 'category' },
    { Header: 'Unitate', accessor: 'unit', width: 90 },
    { Header: 'Cantitate', accessor: 'quantity', hAlign: 'End', width: 110, Cell: ({ row }: any) => qtyOf(row.original) },
    { Header: 'Prag minim', accessor: 'minimum_threshold', hAlign: 'End', width: 110, Cell: ({ row }: any) => minOf(row.original) },
    { Header: 'Furnizor', accessor: 'supplier_name' },
    {
      Header: 'Status', accessor: 'status', width: 130,
      Cell: ({ row }: any) => {
        const s = stockState(row.original);
        return <ObjectStatus state={s.state}>{s.label}</ObjectStatus>;
      },
    },
    {
      Header: 'Acțiuni', id: 'actions', disableSortBy: true, hAlign: 'End', width: 110,
      Cell: ({ row }: any) => (
        isViewer ? null : (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <Button design={ButtonDesign.Transparent} icon={editIcon} tooltip="Editează" onClick={() => openEdit(row.original)} />
            <Button design={ButtonDesign.Transparent} icon={deleteIcon} tooltip="Șterge" onClick={() => handleDelete(row.original)} />
          </div>
        )
      ),
    },
  ], [isViewer, openEdit, handleDelete]);

  const histColumns = useMemo<any[]>(() => [
    { Header: 'Data', accessor: 'date', Cell: ({ row }: any) => row.original.date ?? row.original.created_at ?? '—' },
    { Header: 'Material', accessor: 'material_name', Cell: ({ row }: any) => row.original.material_name ?? row.original.material ?? '—' },
    { Header: 'Proiect', accessor: 'project_name', Cell: ({ row }: any) => row.original.project_name ?? row.original.project ?? '—' },
    { Header: 'Cantitate', accessor: 'quantity', hAlign: 'End', Cell: ({ row }: any) => row.original.quantity ?? '—' },
    { Header: 'Utilizator', accessor: 'user_name', Cell: ({ row }: any) => row.original.user_name ?? row.original.user ?? '—' },
  ], []);

  return (
    <>
      <DynamicPage
        style={{ height: '100%' }}
        titleArea={
          <DynamicPageTitle
            heading={<Title>Inventar</Title>}
            subheading={<Text>Catalog de materiale, stocuri, valoare și consumuri</Text>}
            actionsBar={
              <Toolbar design="Transparent">
                <ToolbarButton icon={historyIcon} text="Istoric consumuri" onClick={() => setHistOpen(true)} />
                <ToolbarButton design={ButtonDesign.Emphasized} icon={addIcon} text="Adaugă material" onClick={openCreate} disabled={isViewer} />
              </Toolbar>
            }
          >
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <Kpi label="Total articole" value={metrics.total} />
              <Kpi label="Stoc redus" value={metrics.lowStock} state={metrics.lowStock > 0 ? ValueState.Critical : ValueState.None} />
              <Kpi label="Epuizat" value={metrics.outOfStock} state={metrics.outOfStock > 0 ? ValueState.Negative : ValueState.None} />
              <Kpi label="Sub prag" value={metrics.subPrag} state={metrics.subPrag > 0 ? ValueState.Critical : ValueState.None} />
              <Kpi label="Valoare inventar" value={money(Math.round(metrics.totalValue), 'RON')} />
            </div>
          </DynamicPageTitle>
        }
        headerArea={
          <DynamicPageHeader>
            <FilterBar hideToolbar>
              <FilterGroupItem label="Caută" filterKey="q">
                <Input placeholder="Denumire, categorie, furnizor…" value={search} onInput={(e) => setSearch((e.target as any).value ?? '')} />
              </FilterGroupItem>
              <FilterGroupItem label="Categorie" filterKey="category">
                <Select onChange={(e) => setFilterCategory(String(e.detail.selectedOption.dataset.value ?? ''))}>
                  <Option data-value="">Toate</Option>
                  {categories.map(c => <Option key={c} data-value={c}>{c}</Option>)}
                </Select>
              </FilterGroupItem>
              <FilterGroupItem label="Status" filterKey="status">
                <Select onChange={(e) => setFilterStatus(String(e.detail.selectedOption.dataset.value ?? ''))}>
                  <Option data-value="">Toate</Option>
                  <Option data-value="ok">În stoc</Option>
                  <Option data-value="low">Stoc redus</Option>
                  <Option data-value="out">Epuizat</Option>
                </Select>
              </FilterGroupItem>
            </FilterBar>
          </DynamicPageHeader>
        }
      >
        <AnalyticalTable
          columns={columns}
          data={data}
          loading={loading}
          visibleRowCountMode="Auto"
          minRows={1}
          noDataText="Niciun material găsit"
          filterable
          sortable
        />
      </DynamicPage>

      {/* Create / edit material */}
      <Dialog
        open={dialogOpen}
        headerText={editId != null ? 'Editează material' : 'Adaugă material'}
        onClose={() => setDialogOpen(false)}
        footer={
          <Bar
            design="Footer"
            endContent={
              <>
                <Button design={ButtonDesign.Emphasized} onClick={save}>Salvează</Button>
                <Button design={ButtonDesign.Transparent} onClick={() => setDialogOpen(false)}>Anulează</Button>
              </>
            }
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '24rem', padding: '0.5rem 0' }}>
          <div><Label required>Denumire</Label><Input style={{ width: '100%' }} value={form.name} onInput={(e) => set('name')((e.target as any).value)} /></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label required>Categorie</Label><Input style={{ width: '100%' }} value={form.category} onInput={(e) => set('category')((e.target as any).value)} /></div>
            <div style={{ flex: 1 }}><Label required>Unitate</Label><Input style={{ width: '100%' }} value={form.unit} onInput={(e) => set('unit')((e.target as any).value)} placeholder="buc, kg, m…" /></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label required>Cantitate</Label><Input type="Number" style={{ width: '100%' }} value={form.stock} onInput={(e) => set('stock')((e.target as any).value)} /></div>
            <div style={{ flex: 1 }}><Label required>Prag minim</Label><Input type="Number" style={{ width: '100%' }} value={form.min_stock} onInput={(e) => set('min_stock')((e.target as any).value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label required>Cost unitar</Label><Input type="Number" style={{ width: '100%' }} value={form.unit_cost} onInput={(e) => set('unit_cost')((e.target as any).value)} /></div>
            <div style={{ flex: 1 }}><Label>Monedă</Label>
              <Select style={{ width: '100%' }} onChange={(e) => set('currency')(String(e.detail.selectedOption.dataset.value ?? 'RON'))}>
                <Option data-value="RON" selected={form.currency === 'RON'}>RON</Option>
                <Option data-value="EUR" selected={form.currency === 'EUR'}>EUR</Option>
              </Select>
            </div>
          </div>
          <div><Label>Furnizor</Label><Input style={{ width: '100%' }} value={form.supplier} onInput={(e) => set('supplier')((e.target as any).value)} /></div>
          <div><Label>Locație</Label>
            {locations.length > 0 ? (
              <Select style={{ width: '100%' }} onChange={(e) => set('location')(String(e.detail.selectedOption.dataset.value ?? ''))}>
                <Option data-value="">—</Option>
                {locations.map(l => <Option key={l.id} data-value={l.name} selected={l.name === form.location}>{l.name} ({l.code})</Option>)}
              </Select>
            ) : (
              <Input style={{ width: '100%' }} value={form.location} onInput={(e) => set('location')((e.target as any).value)} placeholder="Locație depozit" />
            )}
          </div>
        </div>
      </Dialog>

      {/* Consumption history */}
      <Dialog
        open={histOpen}
        headerText="Istoric consumuri"
        onClose={() => setHistOpen(false)}
        footer={<Bar design="Footer" endContent={<Button design={ButtonDesign.Transparent} onClick={() => setHistOpen(false)}>Închide</Button>} />}
      >
        <div style={{ minWidth: '40rem', maxWidth: '52rem', height: '24rem' }}>
          <AnalyticalTable
            columns={histColumns}
            data={consumptions}
            visibleRowCountMode="Auto"
            minRows={1}
            noDataText="Niciun consum înregistrat"
          />
        </div>
      </Dialog>
    </>
  );
}
