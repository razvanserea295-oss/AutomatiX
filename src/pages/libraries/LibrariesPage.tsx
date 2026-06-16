import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, ArrowUpCircle, Library, Pencil, Trash2, Boxes, Layers, Tags } from 'lucide-react';
import LibrariesEnhancements from '@/pages/libraries/LibrariesEnhancements';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue, AnimatedTabs } from '@/components/ui';
import ListReport, { type ListColumn } from '@/components/ui/ListReport';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { useMoney } from '@/store/settingsStore';

interface StdPart { id: number; code: string; name: string; category: string; subcategory: string | null; supplier_name: string | null; lead_time_days: number | null; unit: string; unit_cost: number; }
interface CustPart { id: number; code: string; name: string; category: string; originating_project_name: string | null; promoted_to_standard_id: number | null; }

type Tab = 'standard' | 'custom';

export default function LibrariesPage({ user: _user }: { user: User | null }) {
  const money = useMoney();
  const [tab, setTab] = useState<Tab>('standard');
  const [stdParts, setStdParts] = useState<StdPart[]>([]);
  const [custParts, setCustParts] = useState<CustPart[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, editingItem, isEditing, openModal, closeModal } = useFormModal();

  const fetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<StdPart[]>('get_standard_parts').then(setStdParts).catch(() => setStdParts([])),
      apiCommand<CustPart[]>('get_custom_parts').then(setCustParts).catch(() => setCustParts([])),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  
  const stats = useMemo(() => {
    const cats = new Set<string>();
    stdParts.forEach(p => p.category && cats.add(p.category.toLowerCase()));
    custParts.forEach(p => p.category && cats.add(p.category.toLowerCase()));
    return {
      standard: stdParts.length,
      custom: custParts.length,
      promoted: custParts.filter(p => p.promoted_to_standard_id).length,
      categories: cats.size,
    };
  }, [stdParts, custParts]);

  const stdFields: FormField[] = [
    { name: 'code', label: 'Cod piesa', type: 'text', required: true, placeholder: 'ex: HYD-CYL-001' },
    { name: 'name', label: 'Nume', type: 'text', required: true },
    { name: 'category', label: 'Categorie', type: 'text', required: true, placeholder: 'ex: Hidraulica' },
    { name: 'unit', label: 'UM', type: 'text', placeholder: 'buc' },
    { name: 'unit_cost', label: 'Cost unitar', type: 'number', placeholder: '0.00' },
    { name: 'lead_time_days', label: 'Lead time (zile)', type: 'number' },
  ];

  const custFields: FormField[] = [
    { name: 'code', label: 'Cod piesa', type: 'text', required: true },
    { name: 'name', label: 'Nume', type: 'text', required: true },
    { name: 'category', label: 'Categorie', type: 'text', required: true },
  ];

  const handleCreateStd = async (data: Record<string, unknown>) => {
    await apiCommand('create_standard_part', data); fetch();
  };
  const handleCreateCust = async (data: Record<string, unknown>) => {
    await apiCommand('create_custom_part', data); fetch();
  };
  const handlePromote = async (id: number) => {
    if (!(await confirmDialog({ title: 'Promoveaza piesa la standard?', body: 'Va deveni disponibila pentru toate proiectele.' }))) return;
    try { await apiCommand('promote_to_standard', { custom_id: id }); fetch(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const handleUpdateStd = async (data: Record<string, unknown>) => {
    await apiCommand('update_standard_part', { id: editingItem?.id, ...data }); fetch();
  };
  const handleDeleteStd = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge piesa standard?', body: 'Piesa va fi eliminată definitiv din bibliotecă.', danger: true }))) return;
    try { await apiCommand('delete_standard_part', { id }); toast.success('Piesă ștearsă'); fetch(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la ștergere'); }
  };
  const handleUpdateCust = async (data: Record<string, unknown>) => {
    await apiCommand('update_custom_part', { id: editingItem?.id, ...data }); fetch();
  };
  const handleDeleteCust = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge piesa custom?', body: 'Piesa va fi eliminată definitiv.', danger: true }))) return;
    try { await apiCommand('delete_custom_part', { id }); toast.success('Piesă ștearsă'); fetch(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la ștergere'); }
  };

  
  const stdColumns: ListColumn<StdPart>[] = [
    { key: 'code', header: 'Cod', sortKey: 'code', render: p => <span className="text-accent font-mono">{p.code}</span> },
    { key: 'name', header: 'Nume', sortKey: 'name', render: p => <span className="font-medium">{p.name}</span> },
    { key: 'category', header: 'Categorie', sortKey: 'category', render: p => p.category },
    { key: 'unit', header: 'UM', render: p => p.unit },
    { key: 'unit_cost', header: 'Cost', sortKey: 'unit_cost', className: 'text-right tabular-nums', render: p => p.unit_cost > 0 ? money(p.unit_cost, 'RON', 2) : '—' },
    { key: 'lead_time_days', header: 'Lead time', sortKey: 'lead_time_days', className: 'text-right tabular-nums', render: p => p.lead_time_days ? `${p.lead_time_days}z` : '—' },
    { key: 'supplier_name', header: 'Furnizor', render: p => p.supplier_name || '—' },
    {
      key: 'actions', header: 'Acțiuni', className: 'text-right',
      render: p => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => openModal(p)}
            title="Editează piesa"
            className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteStd(p.id)}
            title="Șterge piesa"
            className="p-1.5 text-content-muted hover:bg-status-red/10 hover:text-status-red transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  
  const custColumns: ListColumn<CustPart>[] = [
    { key: 'code', header: 'Cod', sortKey: 'code', render: p => <span className="text-accent font-mono">{p.code}</span> },
    { key: 'name', header: 'Nume', sortKey: 'name', render: p => <span className="font-medium">{p.name}</span> },
    { key: 'category', header: 'Categorie', sortKey: 'category', render: p => p.category },
    { key: 'originating_project_name', header: 'Proiect sursa', render: p => p.originating_project_name || '—' },
    {
      key: 'status', header: 'Status', render: p => p.promoted_to_standard_id
        ? <StatusBadge tone="success" label="Promovat" size="xs" />
        : <StatusBadge tone="accent" label="Custom" size="xs" />,
    },
    {
      key: 'actions', header: 'Acțiuni', className: 'text-right', render: p => (
        <div className="flex items-center gap-1 justify-end">
          {!p.promoted_to_standard_id && (
            <button
              onClick={() => handlePromote(p.id)}
              title="Promoveaza la standard"
              className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
            >
              <ArrowUpCircle className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => openModal(p)}
            title="Editează piesa"
            className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteCust(p.id)}
            title="Șterge piesa"
            className="p-1.5 text-content-muted hover:bg-status-red/10 hover:text-status-red transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Page className="mod-shell">
      {}
      <div className="px-5 pt-4 pb-8 space-y-4 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Proiectare"
          icon={Library}
          title="Biblioteci piese"
          subtitle="Catalog reutilizabil — piese standard și custom, promovabile între proiecte"
        />
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={Boxes}        label="Piese standard" value={stats.standard} />
          <KpiMini icon={Layers}       label="Piese custom"   value={stats.custom} />
          <KpiMini icon={ArrowUpCircle} label="Promovate"     value={stats.promoted} />
          <KpiMini icon={Tags}         label="Categorii"      value={stats.categories} />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="mx-5 mt-1 mb-3 glass-surface rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap enter-up">
          <AnimatedTabs
            active={tab}
            onChange={(id) => setTab(id as Tab)}
            tabs={[
              { id: 'standard', label: 'Piese standard' },
              { id: 'custom', label: 'Piese custom' },
            ]}
          />
          <Button size="sm" onClick={() => openModal()}>
            <Plus className="h-3.5 w-3.5" /> Adaugă piesa
          </Button>
        </div>

        {}
        <div className="flex-1 min-h-0 overflow-auto p-4">
          {tab === 'standard' ? (
            <ListReport<StdPart>
              embedded
              headerless
              title="Piese standard"
              rows={stdParts}
              columns={stdColumns}
              rowKey={p => p.id}
              loading={loading}
              searchKeys={['code', 'name', 'category', 'supplier_name']}
              searchPlaceholder="Caută piesă standard..."
              emptyMessage="Nicio piesa standard."
            />
          ) : (
            <ListReport<CustPart>
              embedded
              headerless
              title="Piese custom"
              rows={custParts}
              columns={custColumns}
              rowKey={p => p.id}
              loading={loading}
              searchKeys={['code', 'name', 'category', 'originating_project_name']}
              searchPlaceholder="Caută piesă custom..."
              emptyMessage="Nicio piesa custom."
            />
          )}

          <div className="mt-4">
            <LibrariesEnhancements items={[
              ...stdParts.map(p => ({ id: p.id, name: p.name, category: p.category, type: 'standard' })),
              ...custParts.map(p => ({ id: p.id + 100000, name: p.name, category: p.category, type: 'custom' })),
            ]} />
          </div>
        </div>
      </div>

      <FormModal isOpen={isOpen} onClose={closeModal}
        title={tab === 'standard'
          ? (isEditing ? 'Editează piesa standard' : 'Piesa standard noua')
          : (isEditing ? 'Editează piesa custom' : 'Piesa custom noua')}
        fields={tab === 'standard' ? stdFields : custFields}
        initialData={editingItem || {}}
        onSubmit={tab === 'standard'
          ? (isEditing ? handleUpdateStd : handleCreateStd)
          : (isEditing ? handleUpdateCust : handleCreateCust)}
        submitLabel={isEditing ? 'Actualizează' : 'Adaugă'} />
    </Page>
  );
}


function KpiMini({ icon: Icon, label, value, warn }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}
