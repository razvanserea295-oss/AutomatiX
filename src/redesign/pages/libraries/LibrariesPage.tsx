



































import { useState, useEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Plus, ArrowUpCircle, Library, Pencil, Trash2, Boxes, Layers } from 'lucide-react';
import LibrariesEnhancements from '@/pages/libraries/LibrariesEnhancements';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { useMoney } from '@/store/settingsStore';


import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import StatusBadge from '@/redesign/ui/StatusBadge';
import SectionHeader from '@/redesign/ui/SectionHeader';
import AnimatedTabs from '@/redesign/ui/AnimatedTabs';
import ListReport, { type ListColumn } from '@/redesign/ui/ListReport';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';

interface StdPart { id: number; code: string; name: string; category: string; subcategory: string | null; supplier_name: string | null; lead_time_days: number | null; unit: string; unit_cost: number; }
interface CustPart { id: number; code: string; name: string; category: string; originating_project_name: string | null; promoted_to_standard_id: number | null; }

type Tab = 'standard' | 'custom';

export default function LibrariesPage({ user: _user }: { user: User | null }) {
  const money = useMoney();
  const [tab, setTab] = useState<Tab>('standard');
  const [stdParts, setStdParts] = useState<StdPart[]>([]);
  const [custParts, setCustParts] = useState<CustPart[]>([]);
  const [loading, setLoading] = useState(true);
  
  
  const [flashId, setFlashId] = useState<number | null>(null);
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
    try {
      await apiCommand('promote_to_standard', { custom_id: id }); fetch();
      
      setFlashId(id);
      window.setTimeout(() => setFlashId(prev => (prev === id ? null : prev)), 1100);
    }
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
          <IconButton
            intent="primary"
            size="sm"
            onClick={() => openModal(p)}
            title="Editează piesa"
            aria-label="Editează piesa"
          >
            <Pencil aria-hidden />
          </IconButton>
          <IconButton
            intent="danger"
            size="sm"
            onClick={() => handleDeleteStd(p.id)}
            title="Șterge piesa"
            aria-label="Șterge piesa"
          >
            <Trash2 aria-hidden />
          </IconButton>
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
      key: 'status', header: 'Status', render: p => (
        <span
          className={
            'inline-flex rounded-full transition-shadow duration-500 motion-reduce:transition-none ' +
            (flashId === p.id ? 'anim-pop ring-2 ring-status-green/70 shadow-[0_0_0_4px_color-mix(in_srgb,var(--status-green)_28%,transparent)]' : '')
          }
        >
          {p.promoted_to_standard_id
            ? <StatusBadge tone="success" label="Promovat" size="xs" />
            : <StatusBadge tone="accent" label="Custom" size="xs" />}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Acțiuni', className: 'text-right', render: p => (
        <div className="flex items-center gap-1 justify-end">
          {!p.promoted_to_standard_id && (
            <IconButton
              intent="primary"
              size="sm"
              onClick={() => handlePromote(p.id)}
              title="Promoveaza la standard"
              aria-label="Promoveaza la standard"
            >
              <ArrowUpCircle aria-hidden />
            </IconButton>
          )}
          <IconButton
            intent="primary"
            size="sm"
            onClick={() => openModal(p)}
            title="Editează piesa"
            aria-label="Editează piesa"
          >
            <Pencil aria-hidden />
          </IconButton>
          <IconButton
            intent="danger"
            size="sm"
            onClick={() => handleDeleteCust(p.id)}
            title="Șterge piesa"
            aria-label="Șterge piesa"
          >
            <Trash2 aria-hidden />
          </IconButton>
        </div>
      ),
    },
  ];

  
  
  
  const switchTab = (id: Tab) => {
    startMorphTransition(() => flushSync(() => setTab(id)), { dir: 'forward' });
  };

  return (
    <Page fit>
      <Page.Body fit maxWidth="wide" padding="comfortable">

        {
}
        <header className="enter-up shrink-0 pb-3.5 border-b border-line/60 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <Library className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
              <h1 className="text-pm-2xl font-semibold text-content-primary truncate leading-tight">Biblioteci piese</h1>
              <p className="mt-0.5 text-pm-sm text-content-muted">
                Catalog reutilizabil — piese standard și custom, promovabile între proiecte
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <AnimatedTabs
              active={tab}
              onChange={(id) => switchTab(id as Tab)}
              tabs={[
                { id: 'standard', label: 'Piese standard' },
                { id: 'custom', label: 'Piese custom' },
              ]}
            />
            <Button size="md" onClick={() => openModal()}>
              <Plus className="h-4 w-4" /> Adaugă piesa
            </Button>
          </div>
        </header>

        {

}
        <div className="enter-up flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-5" style={{ animationDelay: '160ms' }}>

          {}
          <div className="xl:col-span-8 min-w-0 min-h-0 flex flex-col">
            <Card
              padding="lg"
              tone="elevated"
              vtName={vtName('lib-catalog', tab)}
              className="min-w-0 min-h-0 flex flex-col flex-1 !p-5"
            >
              <SectionHeader
                className="shrink-0 !mb-4"
                eyebrow="Catalog"
                title={tab === 'standard' ? 'Piese standard' : 'Piese custom'}
                icon={tab === 'standard' ? Boxes : Layers}
                meta={tab === 'standard'
                  ? `${stats.standard} piese reutilizabile în toate proiectele`
                  : `${stats.custom} piese specifice proiectului (${stats.promoted} promovate)`}
              />
              {




}
              <div key={tab} className="enter-up flex-1 min-h-0 overflow-hidden">
                {tab === 'standard' ? (
                  <ListReport<StdPart>
                    key="std"
                    embedded
                    headerless
                    title="Piese standard"
                    rows={stdParts}
                    columns={stdColumns}
                    rowKey={p => p.id}
                    loading={loading}
                    rowClassName={() => 'enter-up'}
                    searchKeys={['code', 'name', 'category', 'supplier_name']}
                    searchPlaceholder="Caută piesă standard..."
                    emptyMessage="Nicio piesă standard."
                  />
                ) : (
                  <ListReport<CustPart>
                    key="cust"
                    embedded
                    headerless
                    title="Piese custom"
                    rows={custParts}
                    columns={custColumns}
                    rowKey={p => p.id}
                    loading={loading}
                    rowClassName={() => 'enter-up'}
                    searchKeys={['code', 'name', 'category', 'originating_project_name']}
                    searchPlaceholder="Caută piesă custom..."
                    emptyMessage="Nicio piesă custom."
                  />
                )}
              </div>
            </Card>
          </div>

          {}
          <aside className="xl:col-span-4 min-w-0 min-h-0 overflow-y-auto">
            <LibrariesEnhancements items={[
              ...stdParts.map(p => ({ id: p.id, name: p.name, category: p.category, type: 'standard' })),
              ...custParts.map(p => ({ id: p.id + 100000, name: p.name, category: p.category, type: 'custom' })),
            ]} />
          </aside>
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
      </Page.Body>
    </Page>
  );
}

