




import { useMemo, useState } from 'react';
import { TrendingUp, ShoppingCart, GitCompareArrows, ShieldCheck, Clock4, History, Layers, Plus, Trash2 } from '@/icons';
import { useLocalStorage, SectionCard } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';

interface SupplierLite { id: number; name: string; on_time_pct?: number; quality_pct?: number }
interface Props { suppliers: SupplierLite[] }

interface Score { supplierId: number; on_time: number; quality: number; price: number }

function ScorecardCard({ suppliers }: Props) {
  const [items, setItems] = useLocalStorage<Score[]>('promix_procurement_scores_v1', []);
  const ranked = useMemo(() => suppliers.map(s => {
    const sc = items.find(x => x.supplierId === s.id);
    const total = sc ? (sc.on_time + sc.quality + sc.price) / 3 : 0;
    return { ...s, total };
  }).sort((a, b) => b.total - a.total), [suppliers, items]);
  return (
    <SectionCard title="Supplier scorecard" icon={TrendingUp}>
      <ul className="text-pm-xs divide-y divide-line/40 max-h-44 overflow-y-auto">
        {ranked.slice(0, 12).map(s => {
          const sc = items.find(x => x.supplierId === s.id) ?? { supplierId: s.id, on_time: 70, quality: 70, price: 70 };
          return (
            <li key={s.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center py-1.5">
              <span className="text-content-primary truncate">{s.name}</span>
              <input type="number" className="w-12 h-7 rounded border border-line bg-surface-primary px-1 text-pm-2xs tabular-nums"
                value={sc.on_time} onChange={(e) => setItems(prev => [...prev.filter(x => x.supplierId !== s.id), { ...sc, on_time: Number(e.target.value) }])} title="On-time %" />
              <input type="number" className="w-12 h-7 rounded border border-line bg-surface-primary px-1 text-pm-2xs tabular-nums"
                value={sc.quality} onChange={(e) => setItems(prev => [...prev.filter(x => x.supplierId !== s.id), { ...sc, quality: Number(e.target.value) }])} title="Calitate %" />
              <input type="number" className="w-12 h-7 rounded border border-line bg-surface-primary px-1 text-pm-2xs tabular-nums"
                value={sc.price} onChange={(e) => setItems(prev => [...prev.filter(x => x.supplierId !== s.id), { ...sc, price: Number(e.target.value) }])} title="Preț competitiv %" />
              <span className="tabular-nums text-pm-2xs text-content-secondary">∑ {s.total.toFixed(0)}</span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function AutoRfqCard({ suppliers }: Props) {
  const [count, setCount] = useState(3);
  return (
    <SectionCard title="Auto-RFQ din low-stock" icon={ShoppingCart}>
      <div className="flex items-center gap-2">
        <span className="text-pm-2xs text-content-muted">Trimite cerere către top</span>
        <input type="number" min={1} max={10} className="w-16 h-9 rounded border border-line bg-surface-primary px-2 tabular-nums"
          value={count} onChange={(e) => setCount(Number(e.target.value))} />
        <span className="text-pm-2xs text-content-muted">furnizori (din scorecard)</span>
        <Button variant="primary" size="sm" disabled={suppliers.length === 0}
          onClick={() => toast.info(`Generare ${count} RFQ-uri pentru materialele sub prag — confirmare manuală necesară`)}>Pornește</Button>
      </div>
    </SectionCard>
  );
}

function CompareOffersCard() {
  const [text, setText] = useState('');
  const offers = useMemo(() => text.split('\n').filter(Boolean).map(l => {
    const [supplier, price, lead, terms] = l.split(/[,\t;]/);
    return { supplier: (supplier || '').trim(), price: Number(price || 0), lead: Number(lead || 0), terms: (terms || '').trim() };
  }), [text]);
  return (
    <SectionCard title="Compară oferte" icon={GitCompareArrows}>
      <textarea rows={3} className="w-full rounded border border-line bg-surface-primary px-2 py-1 text-pm-xs font-mono"
        placeholder={'furnizor,pret,lead_time(zile),termen_plata\nABC SRL,1200,7,30 zile\nXYZ SA,1180,14,15 zile'}
        value={text} onChange={(e) => setText(e.target.value)} />
      {offers.length > 0 && (
        <table className="w-full text-pm-xs mt-2">
          <thead className="text-content-muted font-bold uppercase tracking-[0.14em] text-pm-2xs">
            <tr><th className="px-2 py-1 text-left">Furnizor</th><th className="px-2 py-1 text-right">Preț</th><th className="px-2 py-1 text-right">Lead</th><th className="px-2 py-1 text-left">Termen</th></tr>
          </thead>
          <tbody>
            {offers.map((o, i) => (
              <tr key={i} className="border-b border-line/30">
                <td className="px-2 py-1 text-content-primary">{o.supplier}</td>
                <td className="px-2 py-1 text-right tabular-nums">{o.price}</td>
                <td className="px-2 py-1 text-right tabular-nums">{o.lead} z</td>
                <td className="px-2 py-1 text-content-muted">{o.terms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );
}

function AvlCard({ suppliers }: Props) {
  const [allowed, setAllowed] = useLocalStorage<number[]>('promix_procurement_avl_v1', []);
  return (
    <SectionCard title="Approved Vendor List" icon={ShieldCheck}
      description="Doar furnizorii bifați pot apărea în comenzi noi"
    >
      <ul className="text-pm-xs grid grid-cols-1 md:grid-cols-2 gap-1 max-h-44 overflow-y-auto">
        {suppliers.map(s => (
          <li key={s.id} className="flex items-center gap-2 px-2 py-1 rounded bg-surface-tertiary/30">
            <input type="checkbox" checked={allowed.includes(s.id)} onChange={(e) => {
              setAllowed(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id));
            }} />
            <span className="text-content-primary truncate">{s.name}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

interface LeadTimeRecord { supplierId: number; promised: number; actual: number }

function LeadTimeCard({ suppliers }: Props) {
  const [items, setItems] = useLocalStorage<LeadTimeRecord[]>('promix_procurement_lead_v1', []);
  const [draft, setDraft] = useState<Partial<LeadTimeRecord>>({});
  return (
    <SectionCard title="Lead time tracker" icon={Clock4}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <select value={draft.supplierId ?? ''} onChange={(e) => setDraft(d => ({ ...d, supplierId: Number(e.target.value) }))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">Furnizor</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="number" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums"
          placeholder="Promis (zile)" value={draft.promised ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, promised: Number(e.target.value) }))} />
        <input type="number" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums"
          placeholder="Real (zile)" value={draft.actual ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, actual: Number(e.target.value) }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.supplierId) return;
          setItems(prev => [...prev, { supplierId: draft.supplierId!, promised: Number(draft.promised ?? 0), actual: Number(draft.actual ?? 0) }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-32 overflow-y-auto">
          {items.map((it, i) => {
            const s = suppliers.find(x => x.id === it.supplierId);
            const dev = it.actual - it.promised;
            return (
              <li key={i} className="flex items-center gap-2 py-1.5">
                <span className="text-content-primary">{s?.name ?? '#' + it.supplierId}</span>
                <span className="text-content-muted ml-auto">promis {it.promised}z / real {it.actual}z</span>
                <span className={`tabular-nums ${dev > 0 ? 'text-status-red' : dev < 0 ? 'text-status-green' : 'text-content-muted'}`}>{dev > 0 ? '+' : ''}{dev}z</span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

interface Negotiation { id: string; supplierId: number; note: string; discount?: number; date: string }

function NegotiationCard({ suppliers }: Props) {
  const [items, setItems] = useLocalStorage<Negotiation[]>('promix_procurement_negotiations_v1', []);
  const [draft, setDraft] = useState<Partial<Negotiation>>({});
  return (
    <SectionCard title="Istoric negocieri" icon={History}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <select value={draft.supplierId ?? ''} onChange={(e) => setDraft(d => ({ ...d, supplierId: Number(e.target.value) }))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">Furnizor</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="md:col-span-2 h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Notă negociere" value={draft.note ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, note: e.target.value }))} />
        <input type="number" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums"
          placeholder="Discount %" value={draft.discount ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, discount: Number(e.target.value) }))} />
      </div>
      <Button variant="primary" size="sm" onClick={() => {
        if (!draft.supplierId || !draft.note) return;
        setItems(prev => [{ id: `${Date.now()}`, supplierId: draft.supplierId!, note: draft.note!, discount: draft.discount, date: new Date().toISOString() }, ...prev]);
        setDraft({});
      }}><Plus className="h-3.5 w-3.5" /> Adaugă</Button>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-32 overflow-y-auto mt-2">
          {items.map(n => {
            const s = suppliers.find(x => x.id === n.supplierId);
            return (
              <li key={n.id} className="flex items-center gap-2 py-1.5">
                <span className="text-content-primary">{s?.name ?? '#' + n.supplierId}</span>
                <span className="flex-1 text-content-secondary truncate">{n.note}</span>
                {n.discount && <span className="text-status-green">-{n.discount}%</span>}
                <button onClick={() => setItems(prev => prev.filter(x => x.id !== n.id))}
                  className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function PoPlannerCard() {
  return (
    <SectionCard title="Plan procurement consolidat" icon={Layers}
      description="Agregare nevoi din proiecte active într-un singur plan de comenzi">
      <Button variant="outline" size="sm" onClick={() => toast.info('Planul consolidat se generează din BOM-urile proiectelor în starea "în execuție"')}>Generează plan</Button>
    </SectionCard>
  );
}






export function SupplierToolsBar({ suppliers }: Props) {
  return (
    <section className="px-4 py-3 border-b border-line bg-surface-secondary/40">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <LeadTimeCard suppliers={suppliers} />
        <NegotiationCard suppliers={suppliers} />
      </div>
    </section>
  );
}

export default function ProcurementEnhancements({ suppliers }: Props) {
  return (
    <section className="border-t border-line p-3 space-y-3 bg-surface-secondary/40">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">Procurement — extra</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Tools avansate</h2>
      </header>
      <ScorecardCard suppliers={suppliers} />
      <AutoRfqCard suppliers={suppliers} />
      <CompareOffersCard />
      <AvlCard suppliers={suppliers} />
      <LeadTimeCard suppliers={suppliers} />
      <NegotiationCard suppliers={suppliers} />
      <PoPlannerCard />
    </section>
  );
}
