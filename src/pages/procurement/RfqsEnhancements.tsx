




import { useState } from 'react';
import { Send, Table, Award, Layout, BellRing, Link2, Plus, Trash2 } from 'lucide-react';
import { useLocalStorage, SectionCard } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';

interface RfqLite { id: number; title?: string; status?: string }
interface SupplierLite { id: number; name: string }
interface Props { rfqs: RfqLite[]; suppliers: SupplierLite[] }

function MultiSendCard({ suppliers }: { suppliers: SupplierLite[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  return (
    <SectionCard title="Trimite multi-furnizor" icon={Send}>
      <ul className="text-pm-xs grid grid-cols-2 md:grid-cols-3 gap-1 max-h-40 overflow-y-auto">
        {suppliers.map(s => (
          <li key={s.id} className="flex items-center gap-2 px-2 py-1 rounded bg-surface-tertiary/30">
            <input type="checkbox" checked={selected.includes(s.id)} onChange={(e) => {
              setSelected(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id));
            }} />
            <span className="text-content-primary truncate">{s.name}</span>
          </li>
        ))}
      </ul>
      <Button variant="primary" size="sm" disabled={selected.length === 0} className="mt-2"
        onClick={() => toast.info(`RFQ trimis către ${selected.length} furnizori`)}>Pornește (cu un click)</Button>
    </SectionCard>
  );
}

function CompareMatrixCard() {
  const [text, setText] = useState('');
  const rows = text.split('\n').filter(Boolean).map(l => l.split(/[,\t;]/));
  return (
    <SectionCard title="Matrice comparare" icon={Table}>
      <textarea rows={3} className="w-full rounded border border-line bg-surface-primary px-2 py-1 text-pm-xs font-mono"
        placeholder={'furnizor,pret,livrare\nABC,1200,7\nXYZ,1180,14'}
        value={text} onChange={(e) => setText(e.target.value)} />
      {rows.length > 0 && (
        <table className="w-full text-pm-xs mt-2">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line/30">
                {r.map((c, j) => <td key={j} className="px-2 py-1 text-content-primary">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );
}

function AwardCard({ rfqs }: { rfqs: RfqLite[] }) {
  const [target, setTarget] = useState<number | ''>('');
  return (
    <SectionCard title="Award winner" icon={Award}>
      <div className="flex items-center gap-2">
        <select value={target} onChange={(e) => setTarget(e.target.value === '' ? '' : Number(e.target.value))}
          className="flex-1 h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">RFQ</option>
          {rfqs.map(r => <option key={r.id} value={r.id}>{r.title ?? `RFQ #${r.id}`}</option>)}
        </select>
        <Button variant="primary" size="sm" disabled={!target}
          onClick={() => toast.info(`Award triggered — RFQ #${target} → PO automat`)}>Generează PO</Button>
      </div>
    </SectionCard>
  );
}

interface RfqTemplate { id: string; name: string; categories: string }

function TemplateLibraryCard() {
  const [items, setItems] = useLocalStorage<RfqTemplate[]>('promix_rfqs_templates_v1', []);
  const [draft, setDraft] = useState<Partial<RfqTemplate>>({});
  return (
    <SectionCard title="Template-uri RFQ" icon={Layout}>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Nume" value={draft.name ?? ''} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} />
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Categorii (oțel, mecanică)" value={draft.categories ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, categories: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.name) return;
          setItems(prev => [...prev, { id: `${Date.now()}`, name: draft.name!, categories: draft.categories ?? '' }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {items.map(t => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-primary">{t.name}</span>
              <span className="text-content-muted">{t.categories}</span>
              <button onClick={() => setItems(prev => prev.filter(x => x.id !== t.id))}
                className="ml-auto text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function DeadlineReminderCard() {
  const [hoursBefore, setHoursBefore] = useLocalStorage('promix_rfq_reminder_hours_v1', 24);
  return (
    <SectionCard title="Reminder deadline" icon={BellRing}
      description={`Sistem trimite memento cu ${hoursBefore}h înainte de scadență`}>
      <input type="number" className="w-24 h-9 rounded border border-line bg-surface-primary px-3 tabular-nums"
        value={hoursBefore} onChange={(e) => setHoursBefore(Number(e.target.value))} />
    </SectionCard>
  );
}

function PublicLinkCard() {
  const [token, setToken] = useState('');
  const generate = () => {
    setToken(Math.random().toString(36).slice(2, 12));
    toast.success('Link public generat — furnizorul răspunde fără cont');
  };
  return (
    <SectionCard title="Public response link" icon={Link2}>
      <Button variant="primary" size="sm" onClick={generate}>Generează</Button>
      {token && <p className="text-pm-2xs font-mono text-accent mt-2">{location.origin}/#/rfq/{token}</p>}
    </SectionCard>
  );
}

export default function RfqsEnhancements({ rfqs, suppliers }: Props) {
  return (
    <section className="border-t border-line p-3 space-y-3 bg-surface-secondary/40">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">RFQ — extra</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Tools avansate</h2>
      </header>
      <MultiSendCard suppliers={suppliers} />
      <CompareMatrixCard />
      <AwardCard rfqs={rfqs} />
      <TemplateLibraryCard />
      <DeadlineReminderCard />
      <PublicLinkCard />
    </section>
  );
}
