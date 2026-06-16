import { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, XCircle, Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { useBulkSelection, BulkActionBar, type BulkAction } from '@/components/BulkSelection';
import { apiCommand } from '@/api/commands';
import { confirmDialog } from '@/components/ConfirmDialog';
import { ViewerBanner } from '@/components/ViewerBanner';
import { useViewerMode } from '@/hooks/useViewerMode';
import type { User } from '@/core/types';
import { useMaterialStore } from '@/store/materialStore';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import { toast } from '@/store/toastStore';
import { useSettingsStore, useMoney } from '@/store/settingsStore';
import StatusBadge from '@/components/ui/StatusBadge';
import { materialStatus } from '@/lib/statusTokens';
import { useSort } from '@/hooks/useSort';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import ListReport from '@/components/ui/ListReport';





import type { Material } from '@/store/materialStore';

function isLowStock(m: Material): boolean {
  const s = (m.status || '').toLowerCase();
  const qty = m.quantity ?? m.stock ?? 0;
  const min = m.minimum_threshold ?? m.min_stock ?? 0;
  return s === 'stoc redus' || s === 'stoc_redus' || s === 'low_stock' || (qty > 0 && qty <= min);
}

function isOutOfStock(m: Material): boolean {
  const s = (m.status || '').toLowerCase();
  const qty = m.quantity ?? m.stock ?? 0;
  return s === 'epuizat' || s === 'out_of_stock' || qty === 0;
}

export default function InventoryPage({ user: _user }: { user: User | null }) {
  
  
  
  
  const isViewer = useViewerMode('materials');
  const materials = useMaterialStore(s => s.materials);
  const locations = useMaterialStore(s => s.locations);
  const loading = useMaterialStore(s => s.loading);
  const fetchMaterials = useMaterialStore(s => s.fetchMaterials);
  const fetchLocations = useMaterialStore(s => s.fetchLocations);
  const createMaterialStore = useMaterialStore(s => s.createMaterial);
  const updateMaterialStore = useMaterialStore(s => s.updateMaterial);
  const deleteMaterialStore = useMaterialStore(s => s.deleteMaterial);
  const eurRate = useSettingsStore(s => s.eurToRonRate);
  const loadSettings = useSettingsStore(s => s.load);
  const money = useMoney();

  const { isOpen, editingItem, openModal, closeModal, isEditing } = useFormModal();
  
  
  
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [consumptionsLoading, setConsumptionsLoading] = useState(true);

  useEffect(() => {
    void fetchMaterials();
    void fetchLocations();
    void loadSettings();
    apiCommand<any[]>('get_material_consumptions')
      .then(d => setConsumptions(Array.isArray(d) ? d : []))
      .catch(() => setConsumptions([]))
      .finally(() => setConsumptionsLoading(false));
  }, [fetchMaterials, fetchLocations, loadSettings]);

  const locationOptions = useMemo(() =>
    locations.map(l => ({ value: l.name, label: `${l.name} (${l.code})` })), [locations]);

  const formFields: FormField[] = [
    
    
    
    { name: 'name', label: 'Denumire', type: 'text', required: true, placeholder: 'Denumire material' },
    { name: 'category', label: 'Categorie', type: 'text', required: true, placeholder: 'Categorie' },
    { name: 'unit', label: 'Unitate măsură', type: 'text', required: true, placeholder: 'buc, kg, m, etc.' },
    { name: 'stock', label: 'Cantitate', type: 'number', required: true, placeholder: '0' },
    { name: 'min_stock', label: 'Prag minim', type: 'number', required: true, placeholder: '0' },
    { name: 'unit_cost', label: 'Cost unitar', type: 'number', required: true, placeholder: '0.00' },
    { name: 'currency', label: 'Monedă', type: 'select', required: false, options: [{ value: 'RON', label: 'RON' }, { value: 'EUR', label: 'EUR' }] },
    { name: 'supplier', label: 'Furnizor', type: 'text', required: false, placeholder: 'Nume furnizor' },
    ...(locationOptions.length > 0
      ? [{ name: 'location', label: 'Locație', type: 'select' as const, required: false, options: locationOptions }]
      : [{ name: 'location', label: 'Locație', type: 'text' as const, required: false, placeholder: 'Locație depozit' }]),
  ];

  const handleSubmit = async (data: Record<string, any>) => {
    const payload = { ...data, status: 'In stoc' };
    if (isEditing) {
      await updateMaterialStore(editingItem.id, payload);
    } else {
      await createMaterialStore(payload);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge materialul?', body: 'Acțiunea nu poate fi anulată.', danger: true }))) return;
    try {
      await deleteMaterialStore(id);
      toast.success('Material sters cu succes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la ștergere');
    }
  };

  const metrics = useMemo(() => {
    const total = materials.length;
    const lowStock = materials.filter(isLowStock).length;
    const outOfStock = materials.filter(isOutOfStock).length;
    const pending = materials.filter((m) => {
      const s = (m.status || '').toLowerCase();
      return s === 'in asteptare' || s === 'in_asteptare' || s === 'pending';
    }).length;
    return { total, lowStock, outOfStock, pending };
  }, [materials]);


  type MaterialSortKey = 'name' | 'category' | 'unit' | 'quantity' | 'minimum_threshold' | 'supplier_name' | 'status';
  const { sorted: sortedMaterials } = useSort<Material, MaterialSortKey>(
    materials,
    (row, key) => {
      if (key === 'quantity') return row.quantity ?? row.stock ?? 0;
      if (key === 'minimum_threshold') return row.minimum_threshold ?? row.min_stock ?? 0;
      return (row[key as keyof Material] as string | number | null | undefined) ?? '';
    },
    { key: 'name', dir: 'asc' },
  );

  const bulk = useBulkSelection<Material>(sortedMaterials);

  const bulkActions: BulkAction<Material>[] = [
    {
      id: 'delete', label: 'Șterge', icon: <Trash2 className="h-3 w-3" />, danger: true,
      confirmMessage: 'Confirmi ștergerea?',
      run: async (items) => {
        let n = 0;
        for (const m of items) {
          try { await deleteMaterialStore(m.id); n++; } catch {  }
        }
        toast.success(`${n} materiale șterse`);
        return n;
      },
    },
  ];

  
  
  const totalValue = useMemo(() =>
    materials.reduce((s, m) => {
      const v = (m.quantity ?? m.stock ?? 0) * (m.unit_cost ?? 0);
      return s + ((m.currency || 'RON').toUpperCase() === 'EUR' ? v * eurRate : v);
    }, 0),
  [materials, eurRate]);

  const reorderSuggestions = useMemo(() =>
    materials.filter(m => {
      const min = m.minimum_threshold ?? m.min_stock ?? 0;
      const qty = m.quantity ?? m.stock ?? 0;
      return min > 0 && qty <= min * 1.5;
    }),
  [materials]);

  function getRowBorderClass(m: Material): string {
    if (isOutOfStock(m)) return 'border-l-2 border-l-status-red';
    if (isLowStock(m)) return 'border-l-2 border-l-status-amber';
    return '';
  }

  return (
    <Page className="mod-shell">
      <ViewerBanner page="materials" />
      <div className="mod-canvas">

        {}
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Depozit"
          icon={Package}
          title="Inventar"
          subtitle="Catalog de materiale, stocuri, valoare și consumuri"
          actions={!isViewer ? (
            <Button size="sm" onClick={() => openModal()}>
              <Plus className="h-3.5 w-3.5" /> Adaugă material
            </Button>
          ) : undefined}
        />

        {}
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={Package}       label="Total articole"   value={metrics.total} />
          <KpiMini icon={AlertTriangle} label="Stoc redus"       value={metrics.lowStock} warn={metrics.lowStock > 0} />
          <KpiMini icon={XCircle}       label="Stoc epuizat"     value={metrics.outOfStock} warn={metrics.outOfStock > 0} />
          <KpiMini icon={DollarSign}    label="Valoare inventar" value={Math.round(totalValue)} format={(n) => money(n, 'RON')} />
        </div>

        {}
        <GlassCard size="regular" className="enter-up !p-0 overflow-hidden" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">Materiale</span>
            <span className="text-pm-xs text-content-muted">
              {sortedMaterials.length} {sortedMaterials.length === 1 ? 'articol' : 'articole'}
            </span>
          </div>
          <div className="density-compact px-5 pb-5">
            <ListReport<Material>
          embedded
          headerless
          title="Inventar"
          rows={sortedMaterials}
          rowKey={m => m.id}
          loading={loading}
          searchKeys={['name', 'category', 'supplier_name']}
          searchPlaceholder="Caută material..."
          emptyMessage="Niciun material găsit."
          selection={isViewer ? undefined : {
            isSelected: bulk.isSelected,
            toggle: bulk.toggle,
            toggleAll: bulk.toggleAll,
            allSelected: bulk.allSelected,
            someSelected: bulk.someSelected,
          }}
          rowClassName={m => getRowBorderClass(m)}
          columns={[
            { key: 'name', header: 'Denumire', sortKey: 'name', render: m => <span className="font-medium truncate" title={m.name}>{m.name}</span> },
            { key: 'category', header: 'Categorie', sortKey: 'category', render: m => <span className="text-content-muted truncate" title={m.category ?? ''}>{m.category}</span> },
            { key: 'unit', header: 'Unitate', sortKey: 'unit', render: m => <span className="text-content-muted">{m.unit}</span> },
            { key: 'quantity', header: 'Cantitate', sortKey: 'quantity', className: 'text-right tabular-nums', render: m => m.quantity },
            { key: 'minimum_threshold', header: 'Prag minim', sortKey: 'minimum_threshold', className: 'text-right tabular-nums text-content-muted', render: m => m.minimum_threshold },
            { key: 'supplier_name', header: 'Furnizor', sortKey: 'supplier_name', render: m => <span className="text-content-muted truncate" title={m.supplier_name ?? ''}>{m.supplier_name}</span> },
            { key: 'status', header: 'Status', sortKey: 'status', render: m => <StatusBadge {...materialStatus(m.status)} size="xs" /> },
            ...(!isViewer ? [{
              key: 'actions', header: 'Acțiuni', className: 'text-right', render: (m: Material) => (
                <div className="flex items-center gap-1 justify-end opacity-70 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button type="button" onClick={(e) => { e.stopPropagation(); openModal(m); }}
                    className="p-1 hover:bg-surface-tertiary text-content-muted hover:text-accent transition-colors" aria-label={`Editează ${m.name}`}>
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                    className="p-1 hover:bg-surface-tertiary text-content-muted hover:text-status-red transition-colors" aria-label={`Șterge ${m.name}`}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ),
            }] : []),
          ]}
        />
          </div>
        </GlassCard>

        {}
        {reorderSuggestions.length > 0 && (
        <GlassCard size="regular" className="enter-up !p-4 border-status-amber/30 bg-status-amber/5" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center gap-2 text-pm-xs text-status-amber font-medium mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Comenzi sugerate — {reorderSuggestions.length} {reorderSuggestions.length === 1 ? 'material necesită reaprovizionare' : 'materiale necesită reaprovizionare'}
          </div>
          <div className="space-y-1.5">
            {reorderSuggestions.map(m => (
              <div key={m.id} className="flex items-center gap-4 text-xs">
                <span className="font-medium text-content-primary min-w-[140px]">{m.name}</span>
                <span className="text-content-muted">Stoc: <span className="tabular-nums text-content-primary">{m.quantity}</span></span>
                <span className="text-content-muted">Prag: <span className="tabular-nums text-content-primary">{m.minimum_threshold}</span></span>
                {m.supplier_name && <span className="text-content-muted">Furnizor: <span className="text-content-primary">{m.supplier_name}</span></span>}
              </div>
            ))}
          </div>
        </GlassCard>
        )}

        {}
        <GlassCard size="regular" className="enter-up !p-0 overflow-hidden" style={{ animationDelay: '300ms' }}>
        <div className="px-6 py-2.5 flex items-center justify-between">
          <span className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Istoric consumuri</span>
          <span className="text-pm-2xs text-content-muted">
            {consumptionsLoading ? 'se încarcă…' : `${consumptions.length} înregistrări`}
          </span>
        </div>
        <div className="border-t border-line overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                {['Data', 'Material', 'Proiect', 'Cantitate', 'Utilizator'].map(h => (
                  <th key={h} className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted border-b border-line bg-surface-secondary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {consumptionsLoading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-pm-xs text-content-muted">Se încarcă...</td></tr>
              ) : consumptions.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-pm-xs text-content-muted italic">Niciun consum înregistrat încă.</td></tr>
              ) : (
                consumptions.slice(0, 30).map((c, i) => (
                  <tr key={c.id ?? i} className="hover:bg-surface-tertiary/30 transition-colors">
                    <td className="px-3 py-2 text-xs text-content-muted border-b border-line whitespace-nowrap">{c.date ?? c.created_at ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-content-primary border-b border-line whitespace-nowrap">{c.material_name ?? c.material ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-content-muted border-b border-line whitespace-nowrap">{c.project_name ?? c.project ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-content-primary border-b border-line text-right tabular-nums">{c.quantity ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-content-muted border-b border-line whitespace-nowrap">{c.user_name ?? c.user ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </GlassCard>
      </div>

      <FormModal
        isOpen={isOpen}
        onClose={closeModal}
        title={isEditing ? 'Editează material' : 'Adaugă material'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingItem || {}}
        submitLabel={isEditing ? 'Actualizează' : 'Adaugă'}
      />

      {}
      {!isViewer && <BulkActionBar count={bulk.count} items={bulk.selected} actions={bulkActions} onClear={bulk.clear} />}
    </Page>
  );
}


function KpiMini({ icon: Icon, label, value, warn, format }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean; format?: (n: number) => string;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} format={format} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}
