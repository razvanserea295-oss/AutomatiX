




import { useMemo, useState } from 'react';
import { Tags, Hand, BarChart3, Upload, FolderTree, History, Download, Plus, Trash2 } from 'lucide-react';
import { useLocalStorage, SectionCard, ExportMenu } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';

interface LibraryItem { id: number; name: string; category?: string; type?: string; usage_count?: number }
interface Props { items: LibraryItem[] }

interface ItemTag { itemId: number; tag: string }

function TagsCard({ items }: Props) {
  const [list, setList] = useLocalStorage<ItemTag[]>('promix_libraries_tags_v1', []);
  const [draft, setDraft] = useState<Partial<ItemTag>>({});
  return (
    <SectionCard title="Tag-uri multi-dimensional" icon={Tags}>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <select value={draft.itemId ?? ''} onChange={(e) => setDraft(d => ({ ...d, itemId: Number(e.target.value) }))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">Componentă</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Tag (oțel, M8, DN50…)" value={draft.tag ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, tag: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.itemId || !draft.tag) return;
          setList(prev => [...prev, { itemId: draft.itemId!, tag: draft.tag! }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {list.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {list.map((t, i) => {
            const it = items.find(x => x.id === t.itemId);
            return (
              <li key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-line text-pm-2xs text-content-secondary bg-surface-tertiary/40">
                <span className="text-content-primary">{it?.name ?? '#' + t.itemId}</span>:
                <span>{t.tag}</span>
                <button onClick={() => setList(prev => prev.filter((_, j) => j !== i))}
                  className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function DragHintCard() {
  return (
    <SectionCard title="Drag-from-library" icon={Hand}
      description="Trage o componentă în Parts Tree pentru a o adăuga la proiect">
      <p className="text-pm-2xs text-content-muted">Funcție disponibilă cu sesiunea activă; trebuie să ai un proiect deschis în panoul opus.</p>
    </SectionCard>
  );
}

function UsageStatsCard({ items }: Props) {
  const sorted = useMemo(() => items.slice().sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0)).slice(0, 10), [items]);
  return (
    <SectionCard title="Cele mai folosite" icon={BarChart3}>
      <ul className="text-pm-xs divide-y divide-line/40">
        {sorted.map(it => (
          <li key={it.id} className="flex items-center gap-2 py-1.5">
            <span className="text-content-primary truncate flex-1">{it.name}</span>
            <span className="tabular-nums text-content-muted">{it.usage_count ?? 0} folosiri</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function CadImportCard() {
  return (
    <SectionCard title="Import bibliotecă CAD" icon={Upload}>
      <Button variant="outline" size="sm" onClick={() => toast.info('Import SolidWorks/AutoCAD — încarcă XML/CSV de bibliotecă în Setări → Integrări')}>Import bibliotecă externă</Button>
    </SectionCard>
  );
}

interface Category { id: string; name: string; parent?: string }

function CategoryHierarchyCard() {
  const [items, setItems] = useLocalStorage<Category[]>('promix_libraries_categories_v1', []);
  const [draft, setDraft] = useState<Partial<Category>>({});
  return (
    <SectionCard title="Ierarhie categorii" icon={FolderTree}>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Nume" value={draft.name ?? ''} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} />
        <select value={draft.parent ?? ''} onChange={(e) => setDraft(d => ({ ...d, parent: e.target.value }))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">Părinte (root)</option>
          {items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.name) return;
          setItems(prev => [...prev, { id: `${Date.now()}`, name: draft.name!, parent: draft.parent }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {items.map(c => (
            <li key={c.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-primary">{c.name}</span>
              {c.parent && <span className="text-pm-2xs text-content-muted">↳ părinte: {items.find(x => x.id === c.parent)?.name ?? '?'}</span>}
              <button onClick={() => setItems(prev => prev.filter(x => x.id !== c.id))}
                className="ml-auto text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function VersioningCard({ items }: Props) {
  return (
    <SectionCard title="Versionare componente" icon={History}>
      <p className="text-pm-xs text-content-secondary">{items.length} componente disponibile. Capturarea versiunilor curente cere activare backend.</p>
    </SectionCard>
  );
}

function BulkExportCard({ items }: Props) {
  return (
    <SectionCard title="Bulk export" icon={Download}
      actions={<ExportMenu rows={items} columns={[
        { key: 'id', label: 'ID' }, { key: 'name', label: 'Nume' }, { key: 'category', label: 'Categorie' }, { key: 'type', label: 'Tip' },
      ]} filename="biblioteca" />}
    >
      <p className="text-pm-xs text-content-secondary">{items.length} componente selectate pentru export.</p>
    </SectionCard>
  );
}

export default function LibrariesEnhancements({ items }: Props) {
  return (
    <section className="mt-2 space-y-3">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">Biblioteci — extra</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Tools avansate</h2>
      </header>
      <TagsCard items={items} />
      <DragHintCard />
      <UsageStatsCard items={items} />
      <CadImportCard />
      <CategoryHierarchyCard />
      <VersioningCard items={items} />
      <BulkExportCard items={items} />
    </section>
  );
}
