import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pencil, Trash2, Loader2, Download, Printer, Plus, Package, Truck, Clock, CheckCircle2, X as XIcon } from 'lucide-react';
import { SupplierToolsBar } from '@/pages/procurement/ProcurementEnhancements';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { useDashboardStore } from '@/store/dashboardStore';
import { formatDateRo, formatCurrencyRon } from '@/lib/format';
import { toast } from '@/store/toastStore';
import { useFormModal } from '@/hooks/useFormModal';
import { useSort } from '@/hooks/useSort';
import { useColumnWidths } from '@/hooks/useColumnWidths';
import type { StatusTone } from '@/lib/statusTokens';


import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import KpiCard from '@/redesign/ui/KpiCard';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import StatusBadge from '@/redesign/ui/StatusBadge';
import EmptyState from '@/redesign/ui/EmptyState';
import Skeleton from '@/redesign/ui/Skeleton';
import { AnimatedTabs } from '@/redesign/ui';
import FormModal, { type FormField } from '@/redesign/ui/FormModal';
import { confirmDialog } from '@/redesign/ui/ConfirmDialog';
import SortableTh from '@/redesign/ui/SortableTh';
import ColResizeHandle from '@/redesign/ui/ColResizeHandle';
import TableFiller from '@/redesign/ui/TableFiller';





interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  cui: string | null;
  address: string | null;
  website: string | null;
  category: string | null;
  products: string | null;
  payment_terms: string | null;
  active: number;
}

const SUPPLIER_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'raw_materials', label: 'Materii prime' },
  { value: 'equipment',     label: 'Echipamente' },
  { value: 'services',      label: 'Servicii' },
  { value: 'logistics',     label: 'Logistică / transport' },
  { value: 'consumables',   label: 'Consumabile' },
  { value: 'other',         label: 'Altele' },
];

function categoryLabel(v: string | null): string {
  if (!v) return '—';
  return SUPPLIER_CATEGORIES.find(c => c.value === v)?.label ?? v;
}

interface PurchaseOrder {
  id: number;
  order_number: string;
  supplier_name: string;
  order_date: string;
  status: string;
  total: number;
}



type TabId = 'furnizori' | 'comenzi' | 'receptii';

interface ProcurementWorkspacePageProps {
  user: User | null;
  initialTab?: TabId;
}





const formatDate = formatDateRo;
const formatCurrency = formatCurrencyRon;

function exportSuppliersCSV(suppliers: Supplier[]) {
  const headers = 'Nume,Contact,Email,Telefon';
  const rows = suppliers.map(s =>
    `"${s.name}","${s.contact_person}","${s.email}","${s.phone}"`
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `furnizori_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function printSuppliers(suppliers: Supplier[]) {
  const html = `
    <html><head><title>Furnizori</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { font-size: 18px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
      th { background: #f0f0f0; font-weight: 600; }
    </style></head><body>
    <h1>Lista Furnizori</h1>
    <table>
      <thead><tr><th>Nume</th><th>Contact</th><th>Email</th><th>Telefon</th></tr></thead>
      <tbody>${suppliers.map(s => `<tr><td>${s.name}</td><td>${s.contact_person}</td><td>${s.email}</td><td>${s.phone}</td></tr>`).join('')}</tbody>
    </table></body></html>`;
  const win = window.open('', '_blank', 'width=800,height=600');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}

function exportOrdersCSV(orders: PurchaseOrder[]) {
  const headers = 'Nr. comanda,Furnizor,Data,Status,Total';
  const rows = orders.map(o =>
    `"${o.order_number}","${o.supplier_name}","${o.order_date}","${o.status}","${o.total}"`
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comenzi_achizitie_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}





function orderStatusTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s === 'livrata' || s === 'finalizata') return 'success';
  if (s === 'in_asteptare' || s === 'pending') return 'warning';
  if (s === 'anulata' || s === 'cancelled') return 'danger';
  return 'accent';
}





type SupplierSortKey = 'name' | 'category' | 'products' | 'contact_person' | 'email' | 'phone' | 'cui' | 'payment_terms';

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOpen, editingItem, isEditing, openModal, closeModal } = useFormModal();

  const { sorted: sortedSuppliers, sort, toggle } = useSort<Supplier, SupplierSortKey>(
    suppliers,
    (row, key) => key === 'category' ? categoryLabel(row.category) : (row[key] ?? ''),
    { key: 'name', dir: 'asc' },
  );

  const { widths, nudge } = useColumnWidths<SupplierSortKey | 'actions'>(
    'promix-cols-suppliers',
    {
      name:           220,
      category:       130,
      products:       240,
      contact_person: 150,
      email:          200,
      phone:          140,
      cui:            120,
      payment_terms:  140,
      actions:         88,
    },
  );

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCommand<Supplier[]>('get_suppliers');
      setSuppliers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la incarcarea furnizorilor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSuppliers(); }, [fetchSuppliers]);

  const fields: FormField[] = useMemo(() => [
    { name: 'name', label: 'Nume furnizor', type: 'text' as const, required: true, placeholder: 'SC Furnizor SRL' },
    { name: 'category', label: 'Categorie', type: 'select' as const,
      options: [{ value: '', label: '— Necategorizat —' }, ...SUPPLIER_CATEGORIES] },
    { name: 'products', label: 'Produse / servicii oferite', type: 'textarea' as const,
      placeholder: 'Ex: oțel S235, profile metalice, debitare laser…',
      hint: 'Listează ce furnizează — separat prin virgule sau pe rânduri noi' },
    { name: 'cui', label: 'CUI / CIF', type: 'cui' as const, placeholder: 'RO12345678' },
    { name: 'address', label: 'Adresă', type: 'text' as const, placeholder: 'Str. Industriilor 12, București' },
    { name: 'contact_person', label: 'Persoana de contact', type: 'text' as const, placeholder: 'Nume complet' },
    { name: 'email', label: 'Email', type: 'email' as const, placeholder: 'email@furnizor.ro' },
    { name: 'phone', label: 'Telefon', type: 'tel' as const, placeholder: '07xx xxx xxx' },
    { name: 'website', label: 'Website', type: 'text' as const, placeholder: 'https://furnizor.ro' },
    { name: 'payment_terms', label: 'Termeni plată', type: 'text' as const, placeholder: 'Ex: 30 zile, OP la livrare' },
    { name: 'notes', label: 'Note interne', type: 'textarea' as const,
      placeholder: 'Observații, condiții speciale, fiabilitate, etc.' },
  ], []);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (isEditing && editingItem) {
      await apiCommand('update_supplier', { id: editingItem.id, ...data });
    } else {
      await apiCommand('create_supplier', data);
    }
    await fetchSuppliers();
    void useDashboardStore.getState().invalidate();
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge furnizorul?', body: 'Furnizorii cu comenzi asociate nu pot fi șterși.', danger: true }))) return;
    try {
      await apiCommand('delete_supplier', { id });
      toast.success('Furnizor sters cu succes');
      await fetchSuppliers();
      void useDashboardStore.getState().invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la ștergere');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-5" aria-busy="true">
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Truck}
        title="Eroare la încărcarea furnizorilor"
        description={error}
        action={<Button variant="outline" size="sm" onClick={() => void fetchSuppliers()}>Reîncearcă</Button>}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {
}
      <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-line/70 flex-wrap">
        <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">
          {suppliers.length} furnizori
        </span>
        <div className="flex items-center gap-2">
          {suppliers.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => exportSuppliersCSV(suppliers)}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => printSuppliers(suppliers)}>
                <Printer className="h-3.5 w-3.5" /> Printeaza
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => openModal()}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> Adaugă furnizor
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="table-density w-full text-left table-fixed">
          <colgroup>
            <col style={{ width: widths.name + 'px' }} />
            <col style={{ width: widths.category + 'px' }} />
            <col style={{ width: widths.products + 'px' }} />
            <col style={{ width: widths.contact_person + 'px' }} />
            <col style={{ width: widths.email + 'px' }} />
            <col style={{ width: widths.phone + 'px' }} />
            <col style={{ width: widths.cui + 'px' }} />
            <col style={{ width: widths.payment_terms + 'px' }} />
            <col style={{ width: widths.actions + 'px' }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-surface-secondary shadow-[inset_0_-1px_0_var(--color-border)]">
            <tr>
              <SortableTh sortKey="name"           sort={sort} onSort={toggle} resizeHandle={<ColResizeHandle onResize={(d) => nudge('name',           d)} />}>Nume</SortableTh>
              <SortableTh sortKey="category"       sort={sort} onSort={toggle} resizeHandle={<ColResizeHandle onResize={(d) => nudge('category',       d)} />}>Categorie</SortableTh>
              <SortableTh sortKey="products"       sort={sort} onSort={toggle} resizeHandle={<ColResizeHandle onResize={(d) => nudge('products',       d)} />}>Produse</SortableTh>
              <SortableTh sortKey="contact_person" sort={sort} onSort={toggle} resizeHandle={<ColResizeHandle onResize={(d) => nudge('contact_person', d)} />}>Contact</SortableTh>
              <SortableTh sortKey="email"          sort={sort} onSort={toggle} resizeHandle={<ColResizeHandle onResize={(d) => nudge('email',          d)} />}>Email</SortableTh>
              <SortableTh sortKey="phone"          sort={sort} onSort={toggle} resizeHandle={<ColResizeHandle onResize={(d) => nudge('phone',          d)} />}>Telefon</SortableTh>
              <SortableTh sortKey="cui"            sort={sort} onSort={toggle} resizeHandle={<ColResizeHandle onResize={(d) => nudge('cui',            d)} />}>CUI</SortableTh>
              <SortableTh sortKey="payment_terms"  sort={sort} onSort={toggle} resizeHandle={<ColResizeHandle onResize={(d) => nudge('payment_terms',  d)} />}>Termeni</SortableTh>
              <th className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody key={`${sort.key}-${sort.dir}`} className="stagger-in">
            {sortedSuppliers.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-0">
                  <EmptyState
                    icon={Truck}
                    title="Nu există furnizori"
                    description="Adaugă primul furnizor pentru a putea genera comenzi de achiziție."
                    action={<Button size="sm" onClick={() => openModal()}><Plus className="h-3.5 w-3.5" /> Adaugă furnizor</Button>}
                  />
                </td>
              </tr>
            ) : (
              sortedSuppliers.map((s) => (
                <tr
                  key={s.id}
                  className="group border-b border-line last:border-b-0 hover:bg-surface-tertiary/30 transition-colors align-top"
                >
                  <td className="px-3 py-2.5 text-pm-sm font-medium text-content-primary">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate" title={s.name}>{s.name}</span>
                      {s.website && (
                        <a href={s.website} target="_blank" rel="noreferrer"
                           className="text-pm-2xs text-accent hover:underline shrink-0">↗</a>
                      )}
                    </div>
                    {s.notes && (
                      <p className="text-pm-2xs text-content-muted italic mt-0.5 line-clamp-2" title={s.notes}>{s.notes}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-pm-xs text-content-secondary truncate" title={categoryLabel(s.category)}>{categoryLabel(s.category)}</td>
                  <td className="px-3 py-2.5 text-pm-xs text-content-secondary">
                    <span className="line-clamp-2" title={s.products ?? ''}>{s.products ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-pm-xs text-content-secondary truncate" title={s.contact_person ?? ''}>{s.contact_person ?? '—'}</td>
                  <td className="px-3 py-2.5 text-pm-xs text-content-secondary truncate" title={s.email ?? ''}>{s.email ?? '—'}</td>
                  <td className="px-3 py-2.5 text-pm-xs text-content-secondary font-mono truncate" title={s.phone ?? ''}>{s.phone ?? '—'}</td>
                  <td className="px-3 py-2.5 text-pm-xs text-content-secondary font-mono truncate" title={s.cui ?? ''}>{s.cui ?? '—'}</td>
                  <td className="px-3 py-2.5 text-pm-xs text-content-secondary truncate" title={s.payment_terms ?? ''}>{s.payment_terms ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end opacity-70 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <IconButton intent="primary" onClick={() => openModal(s)} aria-label={`Editează ${s.name}`}>
                        <Pencil aria-hidden />
                      </IconButton>
                      <IconButton intent="danger" onClick={() => handleDelete(s.id)} aria-label={`Șterge ${s.name}`}>
                        <Trash2 aria-hidden />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
            <TableFiller cols={9} count={Math.max(0, 18 - sortedSuppliers.length)} />
          </tbody>
        </table>
      </div>

      <FormModal
        isOpen={isOpen}
        onClose={closeModal}
        title={isEditing ? 'Editează furnizor' : 'Furnizor nou'}
        fields={fields}
        initialData={editingItem ?? undefined}
        onSubmit={handleSubmit}
        submitLabel={isEditing ? 'Salvează' : 'Adaugă'}
      />
    </div>
  );
}





function PurchaseOrdersTab() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<{ id: number; code: string; name: string; unit: string }[]>([]);
  const [projectsList, setProjectsList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersData, suppliersData, materialsData, projectsData] = await Promise.all([
        apiCommand<PurchaseOrder[]>('get_purchase_orders'),
        apiCommand<Supplier[]>('get_suppliers'),
        apiCommand<{ id: number; code: string; name: string; unit: string }[]>('get_materials'),
        apiCommand<{ id: number; name: string }[]>('get_projects'),
      ]);
      setOrders(ordersData || []);
      setSuppliers(suppliersData || []);
      setMaterials(materialsData || []);
      setProjectsList(projectsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la incarcarea comenzilor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-5" aria-busy="true">
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Package}
        title="Eroare la încărcarea comenzilor"
        description={error}
        action={<Button variant="outline" size="sm" onClick={() => void fetchOrders()}>Reîncearcă</Button>}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-line/70 flex-wrap">
        <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">
          {orders.length} comenzi
        </span>
        <div className="flex items-center gap-2">
          {orders.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => exportOrdersCSV(orders)}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> Comanda noua
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-surface-secondary shadow-[inset_0_-1px_0_var(--color-border)]">
            <tr className="border-b border-line">
              <th className="px-5 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Nr. comanda</th>
              <th className="px-5 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Furnizor</th>
              <th className="px-5 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Data</th>
              <th className="px-5 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Status</th>
              <th className="px-5 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Total</th>
            </tr>
          </thead>
          <tbody key={orders.length} className="stagger-in">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-0">
                  <EmptyState
                    icon={Package}
                    title="Nu există comenzi de achizitie"
                    description="Creează prima comandă de achiziție pentru a aproviziona proiectele."
                    action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" /> Comanda noua</Button>}
                  />
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-line last:border-b-0 hover:bg-surface-tertiary/30 transition-colors"
                >
                  <td className="px-5 py-2.5 text-pm-sm font-medium text-content-primary font-mono">{o.order_number}</td>
                  <td className="px-5 py-2.5 text-pm-xs text-content-secondary">{o.supplier_name}</td>
                  <td className="px-5 py-2.5 text-pm-xs text-content-muted">{formatDate(o.order_date)}</td>
                  <td className="px-5 py-2.5">
                    <StatusBadge tone={orderStatusTone(o.status)} label={o.status} size="xs" />
                  </td>
                  <td className="px-5 py-2.5 text-pm-sm font-medium text-content-primary tabular-nums">{formatCurrency(o.total)}</td>
                </tr>
              ))
            )}
            <TableFiller cols={5} count={Math.max(0, 18 - orders.length)} />
          </tbody>
        </table>
      </div>

      {showCreate && (
        <PurchaseOrderCreateModal
          suppliers={suppliers}
          materials={materials}
          projects={projectsList}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); void fetchOrders(); void useDashboardStore.getState().invalidate(); }}
        />
      )}
    </div>
  );
}


function PurchaseOrderCreateModal({
  suppliers, materials, projects, onClose, onCreated,
}: {
  suppliers: Supplier[];
  materials: { id: number; code: string; name: string; unit: string }[];
  projects: { id: number; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [internalRef, setInternalRef] = useState('');
  const [lines, setLines] = useState<{ material_id: number | null; qty: number }[]>([{ material_id: null, qty: 1 }]);
  const [saving, setSaving] = useState(false);

  const addLine = () => setLines(prev => [...prev, { material_id: null, qty: 1 }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<{ material_id: number | null; qty: number }>) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const handleSubmit = async () => {
    if (!supplierId) { toast.error('Selectează furnizor'); return; }
    if (!projectId) { toast.error('Selectează proiect'); return; }
    const validLines = lines.filter(l => l.material_id != null && l.qty > 0);
    if (validLines.length === 0) { toast.error('Adaugă cel putin o linie cu material si cantitate'); return; }
    setSaving(true);
    try {
      await apiCommand('create_purchase_order', {
        supplier_id: supplierId,
        project_id: projectId,
        internal_ref: internalRef.trim() || null,
        lines: validLines.map(l => ({ material_id: l.material_id!, qty_ordered: l.qty })),
      });
      toast.success('Comanda creata');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la creare comanda');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full h-10 rounded-xl border border-line bg-surface-primary px-3.5 text-pm-sm text-content-primary placeholder:text-content-muted/70 transition-all duration-150 focus-visible:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)]';
  const labelCls = 'text-pm-xs font-semibold uppercase tracking-wider text-content-secondary mb-1.5 block';

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center surface-glass p-4 anim-fade-in" onClick={onClose}>
      <div className="bg-surface-elevated border border-line rounded-2xl shadow-[var(--elevation-4)] w-full max-w-2xl max-h-[85vh] overflow-y-auto anim-scale-in" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-line/70 flex items-center justify-between">
          <h3 className="text-pm-md font-semibold text-content-primary">Comanda noua de achizitie</h3>
          <IconButton onClick={onClose} aria-label="Închide"><XIcon aria-hidden /></IconButton>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Furnizor *</label>
              <select value={supplierId ?? ''} onChange={e => setSupplierId(e.target.value ? Number(e.target.value) : null)}
                className={`${inputCls} cursor-pointer`}>
                <option value="">Selectează...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Proiect *</label>
              <select value={projectId ?? ''} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : null)}
                className={`${inputCls} cursor-pointer`}>
                <option value="">Selectează...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Referinta interna</label>
            <input value={internalRef} onChange={e => setInternalRef(e.target.value)} placeholder="ex: PO-2026-001"
              className={inputCls} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-pm-xs font-semibold uppercase tracking-wider text-content-secondary">Articole *</label>
              <button type="button" onClick={addLine} className="text-pm-xs font-semibold text-accent hover:underline">+ Adaugă linie</button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={l.material_id ?? ''} onChange={e => updateLine(i, { material_id: e.target.value ? Number(e.target.value) : null })}
                    className={`${inputCls} flex-1 cursor-pointer`}>
                    <option value="">Selectează material...</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                  </select>
                  <input type="number" step="0.01" min="0.01" value={l.qty}
                    onChange={e => updateLine(i, { qty: Number(e.target.value) || 0 })}
                    className={`${inputCls} w-24 tabular-nums`} />
                  {lines.length > 1 && (
                    <IconButton intent="danger" onClick={() => removeLine(i)} aria-label="Elimină linia" title="Elimină linia">
                      <XIcon aria-hidden />
                    </IconButton>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-line/70 flex items-center justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>Anulează</Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? 'Se creeaza...' : 'Creeaza comanda'}
          </Button>
        </div>
      </div>
    </div>
  );
}





interface POLine {
  id: number;
  material_name: string;
  material_code: string;
  qty_ordered: number;
  qty_received: number;
  unit: string;
}

interface PODetail {
  id: number;
  order_number: string;
  supplier_name: string;
  order_date: string;
  status: string;
  lines: POLine[];
}




export function ReceptionsTab() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PODetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [receiving, setReceiving] = useState<Set<number>>(new Set());
  
  
  const [receivingLine, setReceivingLine] = useState<{ id: number; remaining: number } | null>(null);

  useEffect(() => { void loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await apiCommand<PurchaseOrder[]>('get_purchase_orders');
      setOrders(data);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }

  async function loadPODetail(id: number) {
    setLoadingDetail(true);
    try {
      const data = await apiCommand<PODetail>('get_purchase_order', { id });
      setSelectedPO(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare la încărcare detalii');
    }
    setLoadingDetail(false);
  }

  function handleReceiveLine(lineId: number, qtyOrdered: number, qtyAlreadyReceived: number) {
    const remaining = qtyOrdered - qtyAlreadyReceived;
    if (remaining <= 0) return;
    setReceivingLine({ id: lineId, remaining });
  }

  async function submitReceive(data: Record<string, unknown>) {
    if (!receivingLine) return;
    const qty = Number(data.qty);
    if (isNaN(qty) || qty <= 0) throw new Error('Cantitatea trebuie să fie mai mare ca zero');
    if (qty > receivingLine.remaining) throw new Error(`Maxim ${receivingLine.remaining}`);
    setReceiving(prev => new Set(prev).add(receivingLine.id));
    try {
      await apiCommand('receive_purchase_line', { request: { purchase_order_line_id: receivingLine.id, qty_received: qty } });
      toast.success(`Receptionat ${qty} bucati`);
      setReceivingLine(null);
      if (selectedPO) await loadPODetail(selectedPO.id);
      await loadOrders();
    } finally {
      setReceiving(prev => { const n = new Set(prev); n.delete(receivingLine.id); return n; });
    }
  }

  const pendingOrders = useMemo(() =>
    orders.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s !== 'completed' && s !== 'cancelled' && s !== 'anulat';
    }),
    [orders]
  );

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-5" aria-busy="true">
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
        <Skeleton height={36} rounded="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {}
      <div className="w-80 shrink-0 bg-surface-secondary border-r border-line overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-2.5 border-b border-line">
          <span className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">
            Comenzi in asteptare ({pendingOrders.length})
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {pendingOrders.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nicio comandă în așteptare"
              description="Comenzile deschise apar aici pentru recepție."
            />
          ) : (
            pendingOrders.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => loadPODetail(o.id)}
                className={`w-full text-left px-4 py-2.5 border-b border-line hover:bg-surface-tertiary/30 transition-colors ${
                  selectedPO?.id === o.id ? 'border-l-2 border-l-accent bg-accent/5' : ''
                }`}
              >
                <div className="text-pm-sm font-medium text-content-primary font-mono">{o.order_number}</div>
                <div className="text-pm-xs text-content-muted mt-0.5">{o.supplier_name}</div>
                <div className="text-pm-2xs text-content-muted tabular-nums mt-0.5">{formatDate(o.order_date)}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {}
      <div className="flex-1 min-h-0 overflow-y-auto bg-surface-primary">
        {!selectedPO ? (
          <div className="flex flex-1 items-center justify-center h-full">
            <EmptyState
              icon={Package}
              title="Nicio comandă selectată"
              description="Selectează o comandă din listă pentru a înregistra recepția."
            />
          </div>
        ) : loadingDetail ? (
          <div className="flex flex-1 items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
          </div>
        ) : (
          <div>
            {}
            <div className="bg-surface-secondary border-b border-line px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-pm-sm font-semibold text-content-primary font-mono">{selectedPO.order_number}</h3>
                  <p className="text-pm-xs text-content-muted mt-0.5">{selectedPO.supplier_name} &middot; {formatDate(selectedPO.order_date)}</p>
                </div>
                <StatusBadge tone={orderStatusTone(selectedPO.status)} label={selectedPO.status} size="xs" />
              </div>
            </div>

            {}
            <div className="bg-surface-secondary overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-4 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Material</th>
                    <th className="px-4 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted text-right">Comandat</th>
                    <th className="px-4 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted text-right">Receptionat</th>
                    <th className="px-4 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted text-right">Ramas</th>
                    <th className="px-4 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Acțiune</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedPO.lines?.length ? null : (
                    selectedPO.lines.map(line => {
                      const remaining = line.qty_ordered - line.qty_received;
                      const isComplete = remaining <= 0;
                      return (
                        <tr key={line.id} className={`border-b border-line ${isComplete ? 'opacity-50' : 'hover:bg-surface-tertiary/30'} transition-colors`}>
                          <td className="px-4 py-2.5">
                            <div className="text-pm-xs text-content-primary font-medium">{line.material_name}</div>
                            <div className="text-pm-2xs text-content-muted font-mono">{line.material_code}</div>
                            {line.qty_ordered > 0 && (
                              <div className="mt-1.5 h-1 w-full max-w-[180px] rounded-full bg-surface-tertiary overflow-hidden" aria-hidden>
                                <div
                                  className={`anim-bar-grow h-full rounded-full ${isComplete ? 'bg-status-green' : 'bg-status-amber'}`}
                                  style={{ width: `${Math.min(100, Math.round((line.qty_received / line.qty_ordered) * 100))}%` }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-pm-xs text-content-primary text-right tabular-nums">{line.qty_ordered} {line.unit}</td>
                          <td className="px-4 py-2.5 text-pm-xs text-right tabular-nums">
                            <span className={isComplete ? 'text-status-green' : 'text-status-amber'}>{line.qty_received}</span>
                          </td>
                          <td className="px-4 py-2.5 text-pm-xs text-right tabular-nums">
                            <span className={remaining > 0 ? 'text-content-primary font-semibold' : 'text-content-muted'}>{remaining}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            {!isComplete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReceiveLine(line.id, line.qty_ordered, line.qty_received)}
                                disabled={receiving.has(line.id)}
                              >
                                {receiving.has(line.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Receptioneaza'}
                              </Button>
                            )}
                            {isComplete && (
                              <StatusBadge tone="success" label="Complet" size="xs" />
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <FormModal
        isOpen={!!receivingLine}
        onClose={() => setReceivingLine(null)}
        title="Recepție cantitate"
        fields={[{
          name: 'qty',
          label: receivingLine ? `Cantitate receptionata (max ${receivingLine.remaining})` : 'Cantitate',
          type: 'number',
          required: true,
        }]}
        initialData={receivingLine ? { qty: receivingLine.remaining } : {}}
        onSubmit={submitReceive}
        submitLabel="Receptioneaza"
      />
    </div>
  );
}





const TABS: { id: TabId; label: string }[] = [
  { id: 'furnizori', label: 'Furnizori' },
  { id: 'comenzi', label: 'Comenzi achizitie' },
];

export default function ProcurementWorkspacePage({ initialTab = 'furnizori' }: ProcurementWorkspacePageProps) {
  
  
  
  const safeInitial: TabId = initialTab === 'receptii' ? 'furnizori' : initialTab;
  const [activeTab, setActiveTab] = useState<TabId>(safeInitial);

  useEffect(() => {
    if (initialTab && initialTab !== 'receptii') setActiveTab(initialTab);
  }, [initialTab]);

  
  
  
  
  const [kpi, setKpi] = useState({ suppliers: 0, orders: 0, pending: 0, done: 0 });
  const [toolSuppliers, setToolSuppliers] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    Promise.all([
      apiCommand<Supplier[]>('get_suppliers').catch(() => [] as Supplier[]),
      apiCommand<PurchaseOrder[]>('get_purchase_orders').catch(() => [] as PurchaseOrder[]),
    ]).then(([s, o]) => {
      const isOpen = (st: string) => {
        const x = (st || '').toLowerCase();
        return x !== 'completed' && x !== 'cancelled' && x !== 'anulata' && x !== 'anulat'
          && x !== 'finalizata' && x !== 'livrata';
      };
      const pending = o.filter(x => isOpen(x.status)).length;
      setKpi({ suppliers: s.length, orders: o.length, pending, done: o.length - pending });
      setToolSuppliers(s.map(x => ({ id: x.id, name: x.name })));
    }).catch(() => {  });
  }, []);

  return (
    <Page fit>
      <Page.Body fit maxWidth="wide" padding="comfortable">

        {



}
        <header
          className="enter-up shrink-0 pb-3.5 border-b border-line/60 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <Package className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
              <h1 className="text-pm-2xl font-semibold text-content-primary leading-tight truncate">Achiziții</h1>
              <p className="text-pm-sm text-content-muted">Furnizori, comenzi de achiziție și recepții pentru proiecte</p>
            </div>
          </div>
        </header>

        {
}
        <div className="enter-up shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4" style={{ animationDelay: '80ms' }}>
          <KpiCard icon={Truck}        iconColor="text-status-blue"  label="Furnizori"    value={kpi.suppliers.toLocaleString('ro-RO')} />
          <KpiCard icon={Package}      iconColor="text-accent"       label="Comenzi"      value={kpi.orders.toLocaleString('ro-RO')} />
          <KpiCard icon={Clock}        iconColor="text-status-amber" label="În așteptare" value={kpi.pending.toLocaleString('ro-RO')} hint={kpi.pending > 0 ? 'comenzi deschise' : undefined} />
          <KpiCard icon={CheckCircle2} iconColor="text-status-green" label="Finalizate"   value={kpi.done.toLocaleString('ro-RO')} />
        </div>

        {




}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5">

          {

}
          <aside className="enter-up lg:col-span-4 min-h-0 flex flex-col gap-5" style={{ animationDelay: '160ms' }}>
            <Card tone="default" className="flex flex-col min-h-0 overflow-hidden">
              <div className="shrink-0 flex items-center gap-2 px-5 pt-5 pb-1">
                <Truck className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">Unelte furnizori</span>
              </div>
              <div className="min-h-0 overflow-y-auto">
                <SupplierToolsBar suppliers={toolSuppliers} />
              </div>
            </Card>
          </aside>

          {

}
          <Card tone="default" className="enter-up lg:col-span-8 min-h-0 flex flex-col overflow-hidden" style={{ animationDelay: '200ms' }}>
            <div className="shrink-0 px-5 pt-5 pb-3 border-b border-line/40">
              <AnimatedTabs
                active={activeTab}
                onChange={(id) => setActiveTab(id as TabId)}
                tabs={TABS.map(t => ({ id: t.id, label: t.label }))}
              />
            </div>
            <div key={activeTab} className="enter-up density-compact flex-1 min-h-0 flex flex-col">
              {activeTab === 'furnizori' && <SuppliersTab />}
              {activeTab === 'comenzi' && <PurchaseOrdersTab />}
            </div>
          </Card>
        </div>
      </Page.Body>
    </Page>
  );
}
