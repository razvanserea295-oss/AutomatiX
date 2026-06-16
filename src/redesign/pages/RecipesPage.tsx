import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Label, Text,
  List, ListItemStandard, Toolbar, ToolbarButton, ToolbarSpacer,
  AnalyticalTable, Button, Dialog, Bar, Input,
} from '@ui5/webcomponents-react';
import ButtonDesign from '@ui5/webcomponents/dist/types/ButtonDesign.js';
import ValueState from '@ui5/webcomponents-base/dist/types/ValueState.js';
import addIcon from '@ui5/webcomponents-icons/dist/add.js';
import editIcon from '@ui5/webcomponents-icons/dist/edit.js';
import deleteIcon from '@ui5/webcomponents-icons/dist/delete.js';

import type { User } from '@/core/types';
import FioriBreadcrumbs from '@/redesign/shell/FioriBreadcrumbs';
import { useMenuStore } from '@/store/menuStore';
import { useRecipeStore, type RecipeItem } from '@/store/recipeStore';
import { useViewerMode } from '@/hooks/useViewerMode';
import { useSettingsStore, useMoney } from '@/store/settingsStore';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';

function fcState(pct: number): ValueState {
  if (pct === 0 || pct <= 35) return ValueState.Positive;
  if (pct <= 50) return ValueState.Critical;
  return ValueState.Negative;
}

type FormState = { name: string; quantity: number; unit: string; unit_cost: number };
const EMPTY_FORM: FormState = { name: '', quantity: 0, unit: 'buc', unit_cost: 0 };

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '5rem' }}>
      <Label>{label}</Label>
      <Title level="H4">{String(value)}</Title>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--sapGroup_ContentBorderColor, #d9d9d9)',
  borderRadius: 'var(--sapElement_BorderCornerRadius, 0.75rem)',
  background: 'var(--sapGroup_ContentBackground, #fff)',
  display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
};

export default function RecipesPage({ user: _user }: { user: User | null }) {
  const isViewer = useViewerMode('menu');
  const fetchMenu = useMenuStore(s => s.fetchItems);
  const overview = useRecipeStore(s => s.overview);
  const itemsMap = useRecipeStore(s => s.items);
  const fetchOverview = useRecipeStore(s => s.fetchOverview);
  const fetchRecipe = useRecipeStore(s => s.fetchRecipe);
  const addItem = useRecipeStore(s => s.addItem);
  const updateItem = useRecipeStore(s => s.updateItem);
  const deleteItem = useRecipeStore(s => s.deleteItem);
  const loadSettings = useSettingsStore(s => s.load);
  const money = useMoney();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => { void fetchMenu(); void fetchOverview(); void loadSettings(); }, [fetchMenu, fetchOverview, loadSettings]);
  useEffect(() => { if (selectedId == null && overview.length > 0) setSelectedId(overview[0].menu_item_id); }, [overview, selectedId]);
  useEffect(() => { if (selectedId != null) void fetchRecipe(selectedId); }, [selectedId, fetchRecipe]);

  const selected = useMemo(() => overview.find(o => o.menu_item_id === selectedId) || null, [overview, selectedId]);
  const recipeItems = selectedId != null ? (itemsMap[selectedId] || []) : [];
  const liveCost = useMemo(() => recipeItems.reduce((s, i) => s + i.line_cost, 0), [recipeItems]);

  const metrics = useMemo(() => {
    const withRecipe = overview.filter(o => o.ingredient_count > 0).length;
    const costed = overview.filter(o => o.price > 0 && o.ingredient_count > 0);
    const avgFc = costed.length ? Math.round(costed.reduce((s, o) => s + o.food_cost_pct, 0) / costed.length) : 0;
    return { total: overview.length, withRecipe, avgFc };
  }, [overview]);

  const openCreate = useCallback(() => { setEditId(null); setForm(EMPTY_FORM); setDialogOpen(true); }, []);
  const openEdit = useCallback((it: RecipeItem) => { setEditId(it.id); setForm({ name: it.name, quantity: it.quantity, unit: it.unit, unit_cost: it.unit_cost }); setDialogOpen(true); }, []);

  const handleDelete = useCallback(async (it: RecipeItem) => {
    if (!(await confirmDialog({ title: 'Șterge ingredientul?', body: `„${it.name}" va fi eliminat din rețetă.`, danger: true }))) return;
    try { await deleteItem(it.id); toast.success('Ingredient șters'); } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  }, [deleteItem]);

  const save = useCallback(async () => {
    if (selectedId == null) return;
    const payload = { name: form.name, quantity: Number(form.quantity) || 0, unit: form.unit || 'buc', unit_cost: Number(form.unit_cost) || 0 };
    try {
      if (editId != null) await updateItem({ id: editId, ...payload });
      else await addItem({ menu_item_id: selectedId, ...payload });
      toast.success('Ingredient salvat');
      setDialogOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare la salvare'); }
  }, [selectedId, editId, form, addItem, updateItem]);

  const ingredientCurrency = selected?.currency || 'RON';
  const columns = useMemo<any[]>(() => [
    { Header: 'Ingredient', accessor: 'name' },
    { Header: 'Cant.', accessor: 'quantity', hAlign: 'End', width: 90 },
    { Header: 'U.M.', accessor: 'unit', width: 80 },
    { Header: 'Cost unitar', accessor: 'unit_cost', hAlign: 'End', width: 130, Cell: ({ row }: { row: { original: RecipeItem } }) => money(row.original.unit_cost, ingredientCurrency) },
    { Header: 'Total', accessor: 'line_cost', hAlign: 'End', width: 130, Cell: ({ row }: { row: { original: RecipeItem } }) => money(row.original.line_cost, ingredientCurrency) },
    {
      Header: 'Acțiuni', id: 'actions', disableSortBy: true, hAlign: 'End', width: 110,
      Cell: ({ row }: { row: { original: RecipeItem } }) => (
        isViewer ? null : (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <Button design={ButtonDesign.Transparent} icon={editIcon} tooltip="Editează" onClick={() => openEdit(row.original)} />
            <Button design={ButtonDesign.Transparent} icon={deleteIcon} tooltip="Șterge" onClick={() => handleDelete(row.original)} />
          </div>
        )
      ),
    },
  ], [isViewer, money, ingredientCurrency, openEdit, handleDelete]);

  const set = (k: keyof FormState) => (v: string | number) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <DynamicPage
        style={{ height: '100%' }}
        titleArea={
          <DynamicPageTitle breadcrumbs={<FioriBreadcrumbs page="Rețete" />} heading={<Title>Rețete</Title>} subheading={<Text>Ingrediente, cost de producție și marjă per produs</Text>}>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <Kpi label="Produse" value={metrics.total} />
              <Kpi label="Cu rețetă" value={metrics.withRecipe} />
              <Kpi label="Food cost mediu" value={`${metrics.avgFc}%`} />
            </div>
          </DynamicPageTitle>
        }
      >
        <div style={{ display: 'flex', gap: '1rem', height: '100%', minHeight: 0 }}>
          {/* master — product list */}
          <div style={{ ...panelStyle, width: '22rem', flexShrink: 0 }}>
            <List
              selectionMode="Single"
              style={{ height: '100%', overflow: 'auto' }}
              onSelectionChange={(e) => {
                const id = (e.detail.selectedItems?.[0] as HTMLElement | undefined)?.dataset?.id;
                if (id) setSelectedId(Number(id));
              }}
            >
              {overview.map(o => (
                <ListItemStandard
                  key={o.menu_item_id}
                  data-id={o.menu_item_id}
                  selected={o.menu_item_id === selectedId}
                  text={o.name}
                  description={`${o.category} · ${money(o.price, o.currency)}`}
                  additionalText={o.ingredient_count === 0 ? 'fără rețetă' : `${o.food_cost_pct}% FC`}
                  additionalTextState={o.ingredient_count === 0 ? ValueState.None : fcState(o.food_cost_pct)}
                />
              ))}
            </List>
          </div>

          {/* detail — recipe editor */}
          <div style={{ ...panelStyle, flex: 1 }}>
            {selected ? (
              <>
                <Toolbar design="Transparent">
                  <Title level="H5">{selected.name}</Title>
                  <ToolbarSpacer />
                  {!isViewer && <ToolbarButton design={ButtonDesign.Emphasized} icon={addIcon} text="Adaugă ingredient" onClick={openCreate} />}
                </Toolbar>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', padding: '0 1rem 0.75rem' }}>
                  <Kpi label="Preț vânzare" value={money(selected.price, selected.currency)} />
                  <Kpi label="Cost ingrediente" value={money(liveCost, selected.currency)} />
                  <Kpi label="Marjă" value={money(selected.price - liveCost, selected.currency)} />
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <AnalyticalTable columns={columns} data={recipeItems} visibleRowCountMode="Auto" minRows={1} noDataText="Rețetă goală — adaugă ingrediente" />
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--sapContent_LabelColor)' }}>
                <Text>Selectează un produs din listă</Text>
              </div>
            )}
          </div>
        </div>
      </DynamicPage>

      <Dialog
        open={dialogOpen}
        headerText={editId != null ? 'Editează ingredient' : 'Adaugă ingredient'}
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
          <div><Label required>Ingredient</Label><Input style={{ width: '100%' }} value={form.name} onInput={(e) => set('name')(e.target.value)} placeholder="ex. Chiflă, Carne vită, Cheddar" /></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}><Label required>Cantitate</Label><Input type="Number" style={{ width: '100%' }} value={String(form.quantity)} onInput={(e) => set('quantity')(Number(e.target.value) || 0)} /></div>
            <div style={{ flex: 1 }}><Label>Unitate</Label><Input style={{ width: '100%' }} value={form.unit} onInput={(e) => set('unit')(e.target.value)} placeholder="buc, g, ml" /></div>
          </div>
          <div><Label required>Cost unitar</Label><Input type="Number" style={{ width: '100%' }} value={String(form.unit_cost)} onInput={(e) => set('unit_cost')(Number(e.target.value) || 0)} /></div>
        </div>
      </Dialog>
    </>
  );
}
