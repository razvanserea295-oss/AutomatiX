



import { useMemo, useState } from 'react';
import { Search, Layers, GitCompareArrows, Replace, Workflow, Box, FileDown, Trash2, Plus } from 'lucide-react';
import { useLocalStorage, SectionCard } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from '@/store/toastStore';
import { useMoney } from '@/store/settingsStore';

interface NodeLite { id: number; name: string; type?: string; cost?: number; hours?: number; usedIn?: string[] }
interface Props { nodes: NodeLite[] }

function WhereUsedCard({ nodes }: Props) {
  const [q, setQ] = useState('');
  const matches = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return [];
    return nodes.filter(n => n.name.toLowerCase().includes(term)).slice(0, 16);
  }, [q, nodes]);
  return (
    <SectionCard title="Where used" icon={Search}
      description="Caută un component pentru a vedea în ce ansambluri apare">
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="șurub, flansă, motor..."
        className="h-9 w-full rounded border border-line bg-surface-primary px-3 text-pm-base" />
      {matches.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 mt-2 max-h-40 overflow-y-auto">
          {matches.map(n => (
            <li key={n.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-primary truncate flex-1">{n.name}</span>
              <span className="text-pm-2xs text-content-muted">{(n.usedIn?.length ?? 0)} loc.</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function CostRollupCard({ nodes }: Props) {
  const money = useMoney();
  const total = useMemo(() => nodes.reduce((s, n) => s + (n.cost ?? 0), 0), [nodes]);
  const totalHours = useMemo(() => nodes.reduce((s, n) => s + (n.hours ?? 0), 0), [nodes]);
  return (
    <SectionCard title="Cost rollup" icon={Layers}>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-line/60 px-3 py-2">
          <p className="text-pm-2xs uppercase tracking-wide text-content-muted">Cost agregat</p>
          <p className="text-pm-md font-semibold tabular-nums text-content-primary">{money(total, 'RON', 2)}</p>
        </div>
        <div className="rounded border border-line/60 px-3 py-2">
          <p className="text-pm-2xs uppercase tracking-wide text-content-muted">Manoperă</p>
          <p className="text-pm-md font-semibold tabular-nums text-content-primary">{totalHours.toFixed(1)} h</p>
        </div>
      </div>
    </SectionCard>
  );
}

function VersionDiffCard() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  return (
    <SectionCard title="Diff versiuni" icon={GitCompareArrows}>
      <div className="grid grid-cols-2 gap-2">
        <textarea rows={3} className="rounded border border-line bg-surface-primary px-2 text-pm-xs font-mono"
          placeholder="Snapshot V1" value={a} onChange={(e) => setA(e.target.value)} />
        <textarea rows={3} className="rounded border border-line bg-surface-primary px-2 text-pm-xs font-mono"
          placeholder="Snapshot V2" value={b} onChange={(e) => setB(e.target.value)} />
      </div>
      <p className="text-pm-2xs text-content-muted mt-1">Lipiți două snapshot-uri pentru a vedea schimbările structurale (alfa).</p>
    </SectionCard>
  );
}

function CascadeReplaceCard() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return (
    <SectionCard title="Replace cascade" icon={Replace}
      description="Schimbă un component peste tot unde e folosit">
      <div className="grid grid-cols-3 gap-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base font-mono"
          placeholder="Component vechi (M8)" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base font-mono"
          placeholder="Component nou (M10)" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="primary" size="sm" disabled={!from || !to}
          onClick={() => toast.info(`Replace ${from} → ${to} — necesită confirmare șef proiectare`)}>Aplică cascade</Button>
      </div>
    </SectionCard>
  );
}

interface ApprovalFlow { id: string; node: string; reviewer: string; status: 'pending' | 'approved' | 'rejected' }

function ApprovalCard() {
  const [items, setItems] = useLocalStorage<ApprovalFlow[]>('promix_engineering_approvals_v1', []);
  const [draft, setDraft] = useState<Partial<ApprovalFlow>>({});
  return (
    <SectionCard title="Approval workflow" icon={Workflow}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Component / desen" value={draft.node ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, node: e.target.value }))} />
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Reviewer" value={draft.reviewer ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, reviewer: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.node || !draft.reviewer) return;
          setItems(prev => [...prev, { id: `${Date.now()}`, node: draft.node!, reviewer: draft.reviewer!, status: 'pending' }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {items.map(it => (
            <li key={it.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-primary">{it.node}</span>
              <span className="text-content-muted">→ {it.reviewer}</span>
              <div className="ml-auto">
                <StatusBadge
                  size="xs"
                  tone={it.status === 'approved' ? 'success' : it.status === 'rejected' ? 'danger' : 'warning'}
                  label={it.status}
                />
              </div>
              <button onClick={() => setItems(prev => prev.filter(x => x.id !== it.id))}
                className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ThreeDPreviewCard() {
  return (
    <SectionCard title="3D preview" icon={Box}>
      <p className="text-pm-xs text-content-secondary">
        Pentru fișierele STEP/STL atașate la un component, deschiderea în viewer Three.js este disponibilă din panoul de detaliu (urmează activare backend pentru extragerea geometriei).
      </p>
    </SectionCard>
  );
}

function ExportStepCard({ nodes }: Props) {
  return (
    <SectionCard title="Export STEP / IGES skeleton" icon={FileDown}>
      <Button variant="primary" size="sm" disabled={nodes.length === 0}
        onClick={() => toast.info(`Exportul STEP/IGES pentru ${nodes.length} componente cere instalarea modulului opencascade.js`)}>Generează schelet</Button>
    </SectionCard>
  );
}

export default function EngineeringEnhancements({ nodes }: Props) {
  return (
    <section className="border-t border-line p-3 space-y-3 bg-surface-secondary/40">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">Engineering — extra</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Tools avansate</h2>
      </header>
      <WhereUsedCard nodes={nodes} />
      <CostRollupCard nodes={nodes} />
      <VersionDiffCard />
      <CascadeReplaceCard />
      <ApprovalCard />
      <ThreeDPreviewCard />
      <ExportStepCard nodes={nodes} />
    </section>
  );
}
