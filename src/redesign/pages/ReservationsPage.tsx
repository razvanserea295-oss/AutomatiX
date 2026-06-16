import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DynamicPage, DynamicPageTitle, DynamicPageHeader,
  Title, Label, Text, ObjectStatus, Toolbar, ToolbarButton,
  FilterBar, FilterGroupItem, Select, Option, DatePicker, Input, TextArea,
  AnalyticalTable, Button, Dialog, Bar,
} from '@ui5/webcomponents-react';
import ButtonDesign from '@ui5/webcomponents/dist/types/ButtonDesign.js';
import ValueState from '@ui5/webcomponents-base/dist/types/ValueState.js';
import addIcon from '@ui5/webcomponents-icons/dist/add.js';
import editIcon from '@ui5/webcomponents-icons/dist/edit.js';
import deleteIcon from '@ui5/webcomponents-icons/dist/delete.js';

import type { User } from '@/core/types';
import FioriBreadcrumbs from '@/redesign/shell/FioriBreadcrumbs';
import { useReservationStore, RESERVATION_STATUSES, type Reservation } from '@/store/reservationStore';
import { useViewerMode } from '@/hooks/useViewerMode';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';

const STATUS_LABELS: Record<string, string> = {
  noua: 'Nouă', confirmata: 'Confirmată', asezata: 'Așezată', finalizata: 'Finalizată', anulata: 'Anulată',
};
const STATUS_STATE: Record<string, ValueState> = {
  noua: ValueState.Critical,
  confirmata: ValueState.Information,
  asezata: ValueState.Positive,
  finalizata: ValueState.None,
  anulata: ValueState.Negative,
};

type FormState = {
  customer_name: string; phone: string; party_size: number;
  reservation_date: string; reservation_time: string;
  table_label: string; status: string; notes: string;
};
const EMPTY_FORM: FormState = {
  customer_name: '', phone: '', party_size: 2,
  reservation_date: '', reservation_time: '19:00',
  table_label: '', status: 'confirmata', notes: '',
};

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '5rem' }}>
      <Label>{label}</Label>
      <Title level="H4">{String(value)}</Title>
    </div>
  );
}

export default function ReservationsPage({ user: _user }: { user: User | null }) {
  const isViewer = useViewerMode('reservations');
  const items = useReservationStore(s => s.items);
  const fetchItems = useReservationStore(s => s.fetchItems);
  const createItem = useReservationStore(s => s.createItem);
  const updateItem = useReservationStore(s => s.updateItem);
  const deleteItem = useReservationStore(s => s.deleteItem);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  const today = new Date().toISOString().slice(0, 10);

  const metrics = useMemo(() => {
    const todays = items.filter(r => r.reservation_date === today && r.status !== 'anulata');
    const active = items.filter(r => r.status === 'confirmata' || r.status === 'asezata').length;
    const guests = todays.reduce((a, r) => a + (r.party_size || 0), 0);
    return { total: items.length, today: todays.length, active, guests };
  }, [items, today]);

  const filtered = useMemo(() => items.filter(r =>
    (!filterStatus || r.status === filterStatus) &&
    (!filterDate || r.reservation_date === filterDate),
  ), [items, filterStatus, filterDate]);
  const data = useMemo(() => filtered, [filtered]);

  const openCreate = useCallback(() => { setEditId(null); setForm({ ...EMPTY_FORM, reservation_date: today }); setDialogOpen(true); }, [today]);
  const openEdit = useCallback((r: Reservation) => {
    setEditId(r.id);
    setForm({
      customer_name: r.customer_name, phone: r.phone ?? '', party_size: r.party_size,
      reservation_date: r.reservation_date, reservation_time: r.reservation_time,
      table_label: r.table_label ?? '', status: r.status, notes: r.notes ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (r: Reservation) => {
    if (!(await confirmDialog({ title: 'Șterge rezervarea?', body: `Rezervarea „${r.customer_name}" va fi eliminată.`, danger: true }))) return;
    try { await deleteItem(r.id); toast.success('Rezervare ștearsă'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  }, [deleteItem]);

  const save = useCallback(async () => {
    try {
      const payload = { ...form, party_size: Number(form.party_size) || 2 };
      if (editId != null) await updateItem(editId, payload);
      else await createItem(payload);
      toast.success('Rezervare salvată');
      setDialogOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la salvare'); }
  }, [form, editId, createItem, updateItem]);

  const columns = useMemo<any[]>(() => [
    { Header: 'Cod', accessor: 'code', width: 110 },
    {
      Header: 'Client', accessor: 'customer_name',
      Cell: ({ row }: { row: { original: Reservation } }) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text>{row.original.customer_name}</Text>
          {row.original.phone ? <Label>{row.original.phone}</Label> : null}
        </div>
      ),
    },
    {
      Header: 'Data & ora', accessor: 'reservation_date',
      Cell: ({ row }: { row: { original: Reservation } }) => `${row.original.reservation_date} · ${row.original.reservation_time}`,
    },
    { Header: 'Pers.', accessor: 'party_size', hAlign: 'End', width: 90 },
    { Header: 'Masă', accessor: 'table_label' },
    {
      Header: 'Status', accessor: 'status',
      Cell: ({ row }: { row: { original: Reservation } }) => (
        <ObjectStatus state={STATUS_STATE[row.original.status] ?? ValueState.None}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </ObjectStatus>
      ),
    },
    {
      Header: 'Acțiuni', id: 'actions', disableSortBy: true, hAlign: 'End', width: 110,
      Cell: ({ row }: { row: { original: Reservation } }) => (
        isViewer ? null : (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <Button design={ButtonDesign.Transparent} icon={editIcon} tooltip="Editează" onClick={() => openEdit(row.original)} />
            <Button design={ButtonDesign.Transparent} icon={deleteIcon} tooltip="Șterge" onClick={() => handleDelete(row.original)} />
          </div>
        )
      ),
    },
  ], [isViewer, openEdit, handleDelete]);

  const set = (k: keyof FormState) => (v: string | number) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <DynamicPage
        style={{ height: '100%' }}
        titleArea={
          <DynamicPageTitle
            breadcrumbs={<FioriBreadcrumbs page="Rezervări" />}
            heading={<Title>Rezervări</Title>}
            subheading={<Text>Programări mese, clienți și capacitate pe zile</Text>}
            actionsBar={
              <Toolbar design="Transparent">
                <ToolbarButton design={ButtonDesign.Emphasized} icon={addIcon} text="Rezervare nouă" onClick={openCreate} disabled={isViewer} />
              </Toolbar>
            }
          >
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <Kpi label="Total" value={metrics.total} />
              <Kpi label="Azi" value={metrics.today} />
              <Kpi label="Active" value={metrics.active} />
              <Kpi label="Persoane azi" value={metrics.guests} />
            </div>
          </DynamicPageTitle>
        }
        headerArea={
          <DynamicPageHeader>
            <FilterBar hideToolbar>
              <FilterGroupItem label="Status" filterKey="status">
                <Select onChange={(e) => setFilterStatus(String(e.detail.selectedOption.dataset.value ?? ''))}>
                  <Option data-value="">Toate</Option>
                  {RESERVATION_STATUSES.map(s => <Option key={s} data-value={s}>{STATUS_LABELS[s]}</Option>)}
                </Select>
              </FilterGroupItem>
              <FilterGroupItem label="Data" filterKey="date">
                <DatePicker formatPattern="yyyy-MM-dd" value={filterDate} onChange={(e) => setFilterDate(e.detail.value ?? '')} />
              </FilterGroupItem>
            </FilterBar>
          </DynamicPageHeader>
        }
      >
        <AnalyticalTable
          columns={columns}
          data={data}
          visibleRowCountMode="Auto"
          minRows={1}
          noDataText="Nicio rezervare"
          filterable
          sortable
        />
      </DynamicPage>

      <Dialog
        open={dialogOpen}
        headerText={editId != null ? 'Editează rezervarea' : 'Rezervare nouă'}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '22rem', padding: '0.5rem 0' }}>
          <div><Label required>Nume client</Label><Input style={{ width: '100%' }} value={form.customer_name} onInput={(e) => set('customer_name')(e.target.value)} /></div>
          <div><Label>Telefon</Label><Input style={{ width: '100%' }} value={form.phone} onInput={(e) => set('phone')(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label required>Persoane</Label><Input type="Number" style={{ width: '100%' }} value={String(form.party_size)} onInput={(e) => set('party_size')(Number(e.target.value) || 0)} /></div>
            <div style={{ flex: 1 }}><Label>Masă</Label><Input style={{ width: '100%' }} value={form.table_label} onInput={(e) => set('table_label')(e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label required>Data</Label><DatePicker formatPattern="yyyy-MM-dd" style={{ width: '100%' }} value={form.reservation_date} onChange={(e) => set('reservation_date')(e.detail.value ?? '')} /></div>
            <div style={{ flex: 1 }}><Label>Ora</Label><Input style={{ width: '100%' }} value={form.reservation_time} onInput={(e) => set('reservation_time')(e.target.value)} placeholder="19:30" /></div>
          </div>
          <div><Label>Status</Label>
            <Select style={{ width: '100%' }} onChange={(e) => set('status')(String(e.detail.selectedOption.dataset.value ?? 'confirmata'))}>
              {RESERVATION_STATUSES.map(s => <Option key={s} data-value={s} selected={s === form.status}>{STATUS_LABELS[s]}</Option>)}
            </Select>
          </div>
          <div><Label>Observații</Label><TextArea style={{ width: '100%' }} rows={3} value={form.notes} onInput={(e) => set('notes')(e.target.value)} /></div>
        </div>
      </Dialog>
    </>
  );
}
