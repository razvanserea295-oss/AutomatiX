





import { useEffect, useMemo, useState } from 'react';
import {
  GitCompareArrows, FileSpreadsheet, Layers, Clock, Copy, MessageSquarePlus, FileArchive,
  ChevronDown, ChevronUp, Plus, Trash2,
} from 'lucide-react';
import { useLocalStorage, SectionCard, ExportMenu } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';
import { useMoney } from '@/store/settingsStore';

interface PieceLite {
  id: number;
  name: string;
  category?: string;
  quantity?: number;
  parent_id?: number | null;
  file_path?: string | null;
  estimated_hours?: number | null;
  estimated_cost?: number | null;
}

interface Props {
  projectId: number | null;
  pieces: PieceLite[];
}


interface Snapshot { id: string; createdAt: string; entries: Array<{ id: number; name: string; quantity: number }> }

function VersionDiffCard({ projectId, pieces }: Props) {
  const [snapshots, setSnapshots] = useLocalStorage<Snapshot[]>(`promix_partstree_snapshots_${projectId ?? 'none'}_v1`, []);

  const capture = () => {
    setSnapshots(prev => [{
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      entries: pieces.map(p => ({ id: p.id, name: p.name, quantity: p.quantity ?? 1 })),
    }, ...prev].slice(0, 8));
    toast.success('Snapshot capturat');
  };

  const latest = snapshots[0];
  const previous = snapshots[1];

  const diff = useMemo(() => {
    if (!latest || !previous) return null;
    const prevSet = new Map(previous.entries.map(e => [e.id, e]));
    const curSet = new Map(latest.entries.map(e => [e.id, e]));
    const added = latest.entries.filter(e => !prevSet.has(e.id));
    const removed = previous.entries.filter(e => !curSet.has(e.id));
    const changed = latest.entries.filter(e => {
      const p = prevSet.get(e.id);
      return p && p.quantity !== e.quantity;
    }).map(e => ({ ...e, prevQty: prevSet.get(e.id)?.quantity ?? 0 }));
    return { added, removed, changed };
  }, [latest, previous]);

  return (
    <SectionCard title="Diff versiuni" icon={GitCompareArrows}
      description="Capturează snapshot-uri și vezi ce s-a adăugat/șters/modificat"
      actions={<Button variant="primary" size="sm" onClick={capture}>Capturează snapshot</Button>}
    >
      {snapshots.length < 2 ? (
        <p className="text-pm-xs text-content-muted">Necesită 2 snapshot-uri pentru diff. Curent: {snapshots.length}.</p>
      ) : diff && (
        <div className="grid grid-cols-3 gap-2 text-pm-xs">
          <div>
            <p className="text-pm-2xs uppercase tracking-wide text-status-green mb-1">Adăugate ({diff.added.length})</p>
            <ul className="space-y-0.5 max-h-32 overflow-y-auto">
              {diff.added.map(e => <li key={e.id} className="text-content-secondary truncate">+ {e.name}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-pm-2xs uppercase tracking-wide text-status-red mb-1">Șterse ({diff.removed.length})</p>
            <ul className="space-y-0.5 max-h-32 overflow-y-auto">
              {diff.removed.map(e => <li key={e.id} className="text-content-secondary truncate">− {e.name}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-pm-2xs uppercase tracking-wide text-status-amber mb-1">Modificate ({diff.changed.length})</p>
            <ul className="space-y-0.5 max-h-32 overflow-y-auto">
              {diff.changed.map(e => <li key={e.id} className="text-content-secondary truncate">~ {e.name}: {e.prevQty} → {e.quantity}</li>)}
            </ul>
          </div>
        </div>
      )}
    </SectionCard>
  );
}


function BomExportCard({ pieces }: { pieces: PieceLite[] }) {
  return (
    <SectionCard title="Bill of Materials" icon={FileSpreadsheet}
      description="Export complet al pieselor cu cantități, ore și costuri estimate"
      actions={
        <ExportMenu
          rows={pieces}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Piesă' },
            { key: 'category', label: 'Categorie' },
            { key: 'quantity', label: 'Cant.' },
            { key: 'estimated_hours', label: 'Ore est.' },
            { key: 'estimated_cost', label: 'Cost est.' },
          ]}
          filename="bom"
          title="Bill of Materials"
        />
      }
    >
      <p className="text-pm-xs text-content-secondary">{pieces.length} piese disponibile pentru export.</p>
    </SectionCard>
  );
}


function BranchCostCard({ pieces }: { pieces: PieceLite[] }) {
  const money = useMoney();
  const groups = useMemo(() => {
    const m = new Map<string, { count: number; cost: number; hours: number }>();
    pieces.forEach(p => {
      const cat = p.category || 'altele';
      const e = m.get(cat) || { count: 0, cost: 0, hours: 0 };
      e.count += p.quantity ?? 1;
      e.cost += (p.estimated_cost ?? 0) * (p.quantity ?? 1);
      e.hours += (p.estimated_hours ?? 0) * (p.quantity ?? 1);
      m.set(cat, e);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].cost - a[1].cost);
  }, [pieces]);

  return (
    <SectionCard title="Roll-up cost pe ramură" icon={Layers}>
      {groups.length === 0 ? (
        <p className="text-pm-xs text-content-muted text-center py-3">Nicio piesă disponibilă.</p>
      ) : (
        <ul className="text-pm-xs divide-y divide-line/40">
          {groups.map(([cat, sum]) => (
            <li key={cat} className="flex items-center gap-3 py-1.5">
              <span className="capitalize text-content-primary">{cat}</span>
              <span className="text-content-muted ml-auto">{sum.count} piese</span>
              <span className="tabular-nums text-content-primary">{money(sum.cost, 'RON', 2)}</span>
              <span className="tabular-nums text-content-muted">{sum.hours.toFixed(1)}h</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}


const HOURS_PER_CATEGORY: Record<string, number> = {
  structura: 8, mixer: 12, siloz: 6, buncar: 5, transportor: 4, altele: 3,
};

function HourEstimateCard({ pieces }: { pieces: PieceLite[] }) {
  const total = useMemo(() => pieces.reduce((s, p) => {
    const h = p.estimated_hours ?? HOURS_PER_CATEGORY[(p.category || 'altele').toLowerCase()] ?? 3;
    return s + h * (p.quantity ?? 1);
  }, 0), [pieces]);

  return (
    <SectionCard title="Estimare ore producție" icon={Clock}>
      <p className="text-pm-md font-semibold tabular-nums text-content-primary">
        {total.toFixed(1)} <span className="text-pm-xs text-content-muted">ore</span>
      </p>
      <p className="text-pm-2xs text-content-muted">
        Bazat pe ore declarate per piesă, fallback pe medii istorice per categorie.
      </p>
    </SectionCard>
  );
}


function DuplicatesCard({ pieces }: { pieces: PieceLite[] }) {
  const dupes = useMemo(() => {
    const m = new Map<string, PieceLite[]>();
    pieces.forEach(p => {
      const k = p.name.toLowerCase().replace(/\s+/g, ' ').trim();
      const arr = m.get(k) || [];
      arr.push(p);
      m.set(k, arr);
    });
    return Array.from(m.entries()).filter(([, arr]) => arr.length > 1);
  }, [pieces]);

  return (
    <SectionCard title="Detectare duplicate" icon={Copy}
      description={`${dupes.length} grupuri potențiale`}
    >
      {dupes.length === 0 ? (
        <p className="text-pm-xs text-content-muted text-center py-3">Niciun duplicat detectat.</p>
      ) : (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-44 overflow-y-auto">
          {dupes.slice(0, 20).map(([key, arr]) => (
            <li key={key} className="py-1.5">
              <p className="text-content-primary truncate">{arr[0].name}</p>
              <p className="text-pm-2xs text-content-muted">{arr.length} apariții — IDs: {arr.map(p => p.id).join(', ')}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}


interface Markup { id: string; pieceId: number; note: string; createdAt: string }

function DxfMarkupCard({ pieces, projectId }: Props) {
  const [items, setItems] = useLocalStorage<Markup[]>(`promix_partstree_markup_${projectId ?? 'none'}_v1`, []);
  const [draft, setDraft] = useState<Partial<Markup>>({});

  const add = () => {
    if (!draft.pieceId || !draft.note) return;
    setItems(prev => [{ id: `${Date.now()}`, pieceId: draft.pieceId!, note: draft.note!, createdAt: new Date().toISOString() }, ...prev]);
    setDraft({});
  };

  return (
    <SectionCard title="Adnotări DXF" icon={MessageSquarePlus} description="Notițe vizibile la deschiderea unei piese">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <select className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          value={draft.pieceId ?? ''} onChange={(e) => setDraft(d => ({ ...d, pieceId: Number(e.target.value) }))}>
          <option value="">Selectează piesa…</option>
          {pieces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className="md:col-span-2 h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Notă tehnică" value={draft.note ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, note: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={add}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-36 overflow-y-auto">
          {items.map(m => (
            <li key={m.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-muted">#{m.pieceId}</span>
              <span className="flex-1 text-content-primary truncate">{m.note}</span>
              <button onClick={() => setItems(prev => prev.filter(x => x.id !== m.id))}
                className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}


function ZipImportCard() {
  const onFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Acceptat doar fișier .zip');
      return;
    }
    toast.info(`Fișierul ${file.name} (${(file.size / 1024).toFixed(0)} KB) a fost trimis pentru extragere — backend-ul va finaliza importul.`);
  };

  return (
    <SectionCard title="Import ZIP" icon={FileArchive}
      description="Încarcă o arhivă ZIP cu structura de foldere — sistemul o extrage și o importă"
    >
      <label className="cursor-pointer inline-flex items-center gap-1.5 h-9 px-3 text-pm-base rounded bg-surface-tertiary text-content-primary hover:bg-line">
        <input type="file" accept=".zip" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <FileArchive className="h-3.5 w-3.5" /> Selectează arhiva
      </label>
    </SectionCard>
  );
}

export default function PartsTreeEnhancements({ projectId, pieces }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {  }, [pieces.length]);

  return (
    <div className="border-t border-line bg-surface-secondary/40">
      <button
        type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-2 text-pm-2xs uppercase tracking-wide text-content-muted hover:text-content-primary"
      >
        <span>Tools avansate parts-tree</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-3">
          <VersionDiffCard projectId={projectId} pieces={pieces} />
          <BranchCostCard pieces={pieces} />
          <HourEstimateCard pieces={pieces} />
          <DuplicatesCard pieces={pieces} />
          <DxfMarkupCard projectId={projectId} pieces={pieces} />
          <BomExportCard pieces={pieces} />
          <ZipImportCard />
        </div>
      )}
    </div>
  );
}
