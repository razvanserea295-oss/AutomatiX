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
import cycleIcon from '@ui5/webcomponents-icons/dist/synchronize.js';

import type { User } from '@/core/types';
import FioriBreadcrumbs from '@/redesign/shell/FioriBreadcrumbs';
import { useTableStore, TABLE_STATUSES, TABLE_ZONES, type RestaurantTable } from '@/store/tableStore';
import { useViewerMode } from '@/hooks/useViewerMode';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';

const STATUS_LABELS: Record<string, string> = { libera: 'Liberă', ocupata: 'Ocupată', rezervata: 'Rezervată' };
const STATUS_STATE: Record<string, ValueState> = {
  libera: ValueState.Positive, ocupata: ValueState.Negative, rezervata: ValueState.Critical,
};

type FormState = { label: string; zone: string; seats: number; status: string; notes: string };
const EMPTY_FORM: FormState = { label: '', zone: 'Salon', seats: 2, status: 'libera', notes: '' };

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '5rem' }}>
      <Label>{label}</Label>
      <Title level="H4">{String(value)}</Title>
    </div>
  );
}

export default function TablesPage({ user: _user }: { user: User | null }) {
  const isViewer = useViewerMode('tables');
  const items = useTableStore(s => s.items);
  const fetchItems = useTableStore(s => s.fetchItems);
  const createItem = useTableStore(s => s.createItem);
  const updateItem = useTableStore(s => s.updateItem);
  const deleteItem = useTableStore(s => s.deleteItem);
  const setStatus = useTableStore(s => s.setStatus);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterZone, setFilterZone] = useState<string>('');

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  const metrics = useMemo(() => {
    const free = items.filter(t => t.status === 'libera').length;
    const occupied = items.filter(t => t.status === 'ocupata').length;
    const seats = items.reduce((a, t) => a + (t.seats || 0), 0);
    return { total: items.length, free, occupied, seats };
  }, [items]);

  const data = useMemo(() => items.filter(t => !filterZone || t.zone === filterZone), [items, filterZone]);
  const zones = useMemo(() => Array.from(new Set([...TABLE_ZONES, ...items.map(t => t.zone)])), [items]);

  const openCreate = useCallback(() => { setEditId(null); setForm(EMPTY_FORM); setDialogOpen(true); }, []);
  const openEdit = useCallback((t: RestaurantTable) => {
    setEditId(t.id);
    setForm({ label: t.label, zone: t.zone, seats: t.seats, status: t.status, notes: t.notes ?? '' });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (t: RestaurantTable) => {
    if (!(await confirmDialog({ title: 'Șterge masa?', body: `„${t.label}" va fi eliminată din planul sălii.`, danger: true }))) return;
    try { await deleteItem(t.id); toast.success('Masă ștearsă'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  }, [deleteItem]);

  const cycleStatus = useCallback(async (t: RestaurantTable) => {
    const next = t.status === 'libera' ? 'ocupata' : t.status === 'ocupata' ? 'rezervata' : 'libera';
    try { await setStatus(t.id, next); } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  }, [setStatus]);

  const save = useCallback(async () => {
    try {
      const payload = { ...form, seats: Number(form.seats) || 2 };
      if (editId != null) await updateItem(editId, payload);
      else await createItem(payload);
      toast.success('Masă salvată');
      setDialogOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la salvare'); }
  }, [form, editId, createItem, updateItem]);

  const columns = useMemo<any[]>(() => [
    { Header: 'Cod', accessor: 'code', width: 110 },
    { Header: 'Masă', accessor: 'label' },
    { Header: 'Zonă', accessor: 'zone' },
    { Header: 'Locuri', accessor: 'seats', hAlign: 'End', width: 100 },
    {
      Header: 'Status', accessor: 'status',
      Cell: ({ row }: { row: { original: RestaurantTable } }) => (
        <ObjectStatus state={STATUS_STATE[row.original.status] ?? ValueState.None}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </ObjectStatus>
      ),
    },
    {
      Header: 'Acțiuni', id: 'actions', disableSortBy: true, hAlign: 'End', width: 150,
      Cell: ({ row }: { row: { original: RestaurantTable } }) => (
        isViewer ? null : (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <Button design={ButtonDesign.Transparent} icon={cycleIcon} tooltip="Schimbă status" onClick={() => cycleStatus(row.original)} />
            <Button design={ButtonDesign.Transparent} icon={editIcon} tooltip="Editează" onClick={() => openEdit(row.original)} />
            <Button design={ButtonDesign.Transparent} icon={deleteIcon} tooltip="Șterge" onClick={() => handleDelete(row.original)} />
          </div>
        )
      ),
    },
  ], [isViewer, cycleStatus, openEdit, handleDelete]);

  const set = (k: keyof FormState) => (v: string | number) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <DynamicPage
        style={{ height: '100%' }}
        titleArea={
          <DynamicPageTitle
            breadcrumbs={<FioriBreadcrumbs page="Mese" />}
            heading={<Title>Mese</Title>}
            subheading={<Text>Plan sală, zone, capacitate și status live</Text>}
            actionsBar={
              <Toolbar design="Transparent">
                <ToolbarButton design={ButtonDesign.Emphasized} icon={addIcon} text="Adaugă masă" onClick={openCreate} disabled={isViewer} />
              </Toolbar>
            }
          >
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <Kpi label="Total mese" value={metrics.total} />
              <Kpi label="Libere" value={metrics.free} />
              <Kpi label="Ocupate" value={metrics.occupied} />
              <Kpi label="Locuri total" value={metrics.seats} />
            </div>
          </DynamicPageTitle>
        }
        headerArea={
          <DynamicPageHeader>
            <FilterBar hideToolbar>
              <FilterGroupItem label="Zonă" filterKey="zone">
                <Select onChange={(e) => setFilterZone(String(e.detail.selectedOption.dataset.value ?? ''))}>
                  <Option data-value="">Toate</Option>
                  {zones.map(z => <Option key={z} data-value={z}>{z}</Option>)}
                </Select>
              </FilterGroupItem>
            </FilterBar>
          </DynamicPageHeader>
        }
      >
        <AnalyticalTable columns={columns} data={data} visibleRowCountMode="Auto" minRows={1} noDataText="Nicio masă definită" filterable sortable />
      </DynamicPage>

      <Dialog
        open={dialogOpen}
        headerText={editId != null ? 'Editează masa' : 'Adaugă masă'}
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
          <div><Label required>Denumire masă</Label><Input style={{ width: '100%' }} value={form.label} onInput={(e) => set('label')(e.target.value)} placeholder="ex. Masa 4" /></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label>Zonă</Label>
              <Select style={{ width: '100%' }} onChange={(e) => set('zone')(String(e.detail.selectedOption.dataset.value ?? 'Salon'))}>
                {TABLE_ZONES.map(z => <Option key={z} data-value={z} selected={z === form.zone}>{z}</Option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}><Label required>Locuri</Label><Input type="Number" style={{ width: '100%' }} value={String(form.seats)} onInput={(e) => set('seats')(Number(e.target.value) || 0)} /></div>
          </div>
          <div><Label>Status</Label>
            <Select style={{ width: '100%' }} onChange={(e) => set('status')(String(e.detail.selectedOption.dataset.value ?? 'libera'))}>
              {TABLE_STATUSES.map(s => <Option key={s} data-value={s} selected={s === form.status}>{STATUS_LABELS[s]}</Option>)}
            </Select>
          </div>
          <div><Label>Observații</Label><TextArea style={{ width: '100%' }} rows={3} value={form.notes} onInput={(e) => set('notes')(e.target.value)} /></div>
        </div>
      </Dialog>
    </>
  );
}
