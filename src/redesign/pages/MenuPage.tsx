import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DynamicPage, DynamicPageTitle, DynamicPageHeader,
  Title, Label, Text, ObjectStatus, Toolbar, ToolbarButton,
  FilterBar, FilterGroupItem, Select, Option, Input, TextArea,
  AnalyticalTable, Button, Dialog, Bar,
} from '@ui5/webcomponents-react';
import ButtonDesign from '@ui5/webcomponents/dist/types/ButtonDesign.js';
import ValueState from '@ui5/webcomponents-base/dist/types/ValueState.js';
import addIcon from '@ui5/webcomponents-icons/dist/add.js';
import editIcon from '@ui5/webcomponents-icons/dist/edit.js';
import deleteIcon from '@ui5/webcomponents-icons/dist/delete.js';
import showIcon from '@ui5/webcomponents-icons/dist/show.js';
import hideIcon from '@ui5/webcomponents-icons/dist/hide.js';

import type { User } from '@/core/types';
import FioriBreadcrumbs from '@/redesign/shell/FioriBreadcrumbs';
import { useMenuStore, MENU_CATEGORIES, type MenuItem } from '@/store/menuStore';
import { useViewerMode } from '@/hooks/useViewerMode';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';

const CURRENCIES = ['RON', 'EUR'] as const;

type FormState = { name: string; category: string; price: number; currency: string; available: number; description: string };
const EMPTY_FORM: FormState = { name: '', category: 'Burgeri', price: 0, currency: 'RON', available: 1, description: '' };

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '5rem' }}>
      <Label>{label}</Label>
      <Title level="H4">{String(value)}</Title>
    </div>
  );
}

export default function MenuPage({ user: _user }: { user: User | null }) {
  const isViewer = useViewerMode('menu');
  const items = useMenuStore(s => s.items);
  const fetchItems = useMenuStore(s => s.fetchItems);
  const createItem = useMenuStore(s => s.createItem);
  const updateItem = useMenuStore(s => s.updateItem);
  const deleteItem = useMenuStore(s => s.deleteItem);
  const toggleAvailability = useMenuStore(s => s.toggleAvailability);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterCategory, setFilterCategory] = useState<string>('');

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  const metrics = useMemo(() => {
    const available = items.filter(m => m.available).length;
    const cats = new Set(items.map(m => m.category)).size;
    const avg = items.length ? Math.round(items.reduce((a, m) => a + (m.price || 0), 0) / items.length) : 0;
    return { total: items.length, available, cats, avg };
  }, [items]);

  const data = useMemo(() => items.filter(m => !filterCategory || m.category === filterCategory), [items, filterCategory]);

  const openCreate = useCallback(() => { setEditId(null); setForm(EMPTY_FORM); setDialogOpen(true); }, []);
  const openEdit = useCallback((m: MenuItem) => {
    setEditId(m.id);
    setForm({ name: m.name, category: m.category, price: m.price, currency: m.currency, available: m.available, description: m.description ?? '' });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (m: MenuItem) => {
    if (!(await confirmDialog({ title: 'Șterge produsul?', body: `„${m.name}" va fi eliminat din meniu.`, danger: true }))) return;
    try { await deleteItem(m.id); toast.success('Produs șters'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  }, [deleteItem]);

  const toggle = useCallback(async (m: MenuItem) => {
    try { await toggleAvailability(m.id, !m.available); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  }, [toggleAvailability]);

  const save = useCallback(async () => {
    try {
      const payload = { ...form, price: Number(form.price) || 0, available: Number(form.available) ? 1 : 0 };
      if (editId != null) await updateItem(editId, payload);
      else await createItem(payload);
      toast.success('Produs salvat');
      setDialogOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la salvare'); }
  }, [form, editId, createItem, updateItem]);

  const columns = useMemo<any[]>(() => [
    { Header: 'Cod', accessor: 'code', width: 110 },
    {
      Header: 'Produs', accessor: 'name',
      Cell: ({ row }: { row: { original: MenuItem } }) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text>{row.original.name}</Text>
          {row.original.description ? <Label>{row.original.description}</Label> : null}
        </div>
      ),
    },
    { Header: 'Categorie', accessor: 'category' },
    {
      Header: 'Preț', accessor: 'price', hAlign: 'End', width: 130,
      Cell: ({ row }: { row: { original: MenuItem } }) => `${Number(row.original.price).toLocaleString('ro-RO')} ${row.original.currency}`,
    },
    {
      Header: 'Disponibil', accessor: 'available',
      Cell: ({ row }: { row: { original: MenuItem } }) => (
        <ObjectStatus state={row.original.available ? ValueState.Positive : ValueState.None}>
          {row.original.available ? 'Disponibil' : 'Indisponibil'}
        </ObjectStatus>
      ),
    },
    {
      Header: 'Acțiuni', id: 'actions', disableSortBy: true, hAlign: 'End', width: 150,
      Cell: ({ row }: { row: { original: MenuItem } }) => (
        isViewer ? null : (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <Button design={ButtonDesign.Transparent} icon={row.original.available ? hideIcon : showIcon} tooltip={row.original.available ? 'Marchează indisponibil' : 'Marchează disponibil'} onClick={() => toggle(row.original)} />
            <Button design={ButtonDesign.Transparent} icon={editIcon} tooltip="Editează" onClick={() => openEdit(row.original)} />
            <Button design={ButtonDesign.Transparent} icon={deleteIcon} tooltip="Șterge" onClick={() => handleDelete(row.original)} />
          </div>
        )
      ),
    },
  ], [isViewer, toggle, openEdit, handleDelete]);

  const set = (k: keyof FormState) => (v: string | number) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <DynamicPage
        style={{ height: '100%' }}
        titleArea={
          <DynamicPageTitle
            breadcrumbs={<FioriBreadcrumbs page="Meniu" />}
            heading={<Title>Meniu</Title>}
            subheading={<Text>Produse, categorii, prețuri și disponibilitate</Text>}
            actionsBar={
              <Toolbar design="Transparent">
                <ToolbarButton design={ButtonDesign.Emphasized} icon={addIcon} text="Adaugă produs" onClick={openCreate} disabled={isViewer} />
              </Toolbar>
            }
          >
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <Kpi label="Total produse" value={metrics.total} />
              <Kpi label="Disponibile" value={metrics.available} />
              <Kpi label="Categorii" value={metrics.cats} />
              <Kpi label="Preț mediu" value={metrics.avg} />
            </div>
          </DynamicPageTitle>
        }
        headerArea={
          <DynamicPageHeader>
            <FilterBar hideToolbar>
              <FilterGroupItem label="Categorie" filterKey="category">
                <Select onChange={(e) => setFilterCategory(String(e.detail.selectedOption.dataset.value ?? ''))}>
                  <Option data-value="">Toate</Option>
                  {MENU_CATEGORIES.map(c => <Option key={c} data-value={c}>{c}</Option>)}
                </Select>
              </FilterGroupItem>
            </FilterBar>
          </DynamicPageHeader>
        }
      >
        <AnalyticalTable columns={columns} data={data} visibleRowCountMode="Auto" minRows={1} noDataText="Niciun produs în meniu" filterable sortable />
      </DynamicPage>

      <Dialog
        open={dialogOpen}
        headerText={editId != null ? 'Editează produsul' : 'Produs nou'}
        onClose={() => setDialogOpen(false)}
        footer={
          <Bar design="Footer" endContent={
            <>
              <Button design={ButtonDesign.Emphasized} onClick={save}>Salvează</Button>
              <Button design={ButtonDesign.Transparent} onClick={() => setDialogOpen(false)}>Anulează</Button>
            </>
          } />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '22rem', padding: '0.5rem 0' }}>
          <div><Label required>Denumire</Label><Input style={{ width: '100%' }} value={form.name} onInput={(e) => set('name')(e.target.value)} placeholder="ex. Cheeseburger" /></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label>Categorie</Label>
              <Select style={{ width: '100%' }} onChange={(e) => set('category')(String(e.detail.selectedOption.dataset.value ?? 'Burgeri'))}>
                {MENU_CATEGORIES.map(c => <Option key={c} data-value={c} selected={c === form.category}>{c}</Option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}><Label>Disponibil</Label>
              <Select style={{ width: '100%' }} onChange={(e) => set('available')(Number(e.detail.selectedOption.dataset.value ?? 1))}>
                <Option data-value="1" selected={!!form.available}>Disponibil</Option>
                <Option data-value="0" selected={!form.available}>Indisponibil</Option>
              </Select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label required>Preț</Label><Input type="Number" style={{ width: '100%' }} value={String(form.price)} onInput={(e) => set('price')(Number(e.target.value) || 0)} /></div>
            <div style={{ flex: 1 }}><Label>Monedă</Label>
              <Select style={{ width: '100%' }} onChange={(e) => set('currency')(String(e.detail.selectedOption.dataset.value ?? 'RON'))}>
                {CURRENCIES.map(c => <Option key={c} data-value={c} selected={c === form.currency}>{c}</Option>)}
              </Select>
            </div>
          </div>
          <div><Label>Descriere</Label><TextArea style={{ width: '100%' }} rows={3} value={form.description} onInput={(e) => set('description')(e.target.value)} /></div>
        </div>
      </Dialog>
    </>
  );
}
