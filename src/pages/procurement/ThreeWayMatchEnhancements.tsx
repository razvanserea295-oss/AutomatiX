



import { useState } from 'react';
import { Workflow, Sliders, ShieldCheck, Coins, History, FileDown, Plus, Trash2 } from 'lucide-react';
import { useLocalStorage, SectionCard, ExportMenu } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDateRo } from '@/lib/format';

interface MatchLite { id: number | string; po?: string | null; invoice?: string | null; receipt?: string | null; status?: string | null; variance?: number | null }
interface Props { matches: MatchLite[] }

function AutoMatchRulesCard() {
  const [rules, setRules] = useLocalStorage<{ field: string; tolerance: number }[]>(
    'promix_3wm_rules_v1', [
      { field: 'preț_unitar', tolerance: 2 },
      { field: 'cantitate', tolerance: 0 },
      { field: 'data_livrare', tolerance: 7 },
    ]);
  return (
    <SectionCard title="Reguli auto-match" icon={Workflow}>
      <ul className="text-pm-xs divide-y divide-line/40">
        {rules.map((r, i) => (
          <li key={i} className="flex items-center gap-2 py-1.5">
            <input className="flex-1 h-7 rounded border border-line bg-surface-primary px-2 text-pm-base"
              value={r.field} onChange={(e) => setRules(prev => prev.map((x, j) => j === i ? { ...x, field: e.target.value } : x))} />
            <input type="number" className="w-16 h-7 rounded border border-line bg-surface-primary px-2 tabular-nums"
              value={r.tolerance} onChange={(e) => setRules(prev => prev.map((x, j) => j === i ? { ...x, tolerance: Number(e.target.value) } : x))} />
            <span className="text-pm-2xs text-content-muted">% / unități</span>
            <button onClick={() => setRules(prev => prev.filter((_, j) => j !== i))}
              className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setRules(prev => [...prev, { field: '', tolerance: 0 }])}>
        <Plus className="h-3.5 w-3.5" /> Adaugă regulă
      </Button>
    </SectionCard>
  );
}

function ToleranceCard() {
  const [global, setGlobal] = useLocalStorage('promix_3wm_global_tolerance_v1', { pct: 2, abs: 50 });
  return (
    <SectionCard title="Toleranță globală" icon={Sliders}>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-pm-base">
          <span className="block text-pm-2xs uppercase tracking-wide text-content-muted mb-1">Procentual</span>
          <input type="number" value={global.pct} onChange={(e) => setGlobal({ ...global, pct: Number(e.target.value) })}
            className="h-9 w-full rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums" />
        </label>
        <label className="text-pm-base">
          <span className="block text-pm-2xs uppercase tracking-wide text-content-muted mb-1">Absolut (RON)</span>
          <input type="number" value={global.abs} onChange={(e) => setGlobal({ ...global, abs: Number(e.target.value) })}
            className="h-9 w-full rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums" />
        </label>
      </div>
    </SectionCard>
  );
}

interface Exception { id: string; matchId: string; reason: string; approver?: string; status: 'pending' | 'approved' | 'rejected' }

function ApprovalWorkflowCard({ matches }: Props) {
  const [items, setItems] = useLocalStorage<Exception[]>('promix_3wm_exceptions_v1', []);
  const [draft, setDraft] = useState<Partial<Exception>>({});
  return (
    <SectionCard title="Workflow excepții" icon={ShieldCheck}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <select value={draft.matchId ?? ''} onChange={(e) => setDraft(d => ({ ...d, matchId: e.target.value }))}
          className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base">
          <option value="">Match</option>
          {matches.map(m => <option key={m.id} value={String(m.id)}>{m.po ?? '#' + m.id}</option>)}
        </select>
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Motiv excepție" value={draft.reason ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, reason: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.matchId || !draft.reason) return;
          setItems(prev => [...prev, { id: `${Date.now()}`, matchId: draft.matchId!, reason: draft.reason!, status: 'pending' }]);
          setDraft({});
        }}>Cere aprobare CFO</Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {items.map(it => (
            <li key={it.id} className="flex items-center gap-2 py-1.5">
              <span className="font-mono text-content-primary">{it.matchId}</span>
              <span className="flex-1 text-content-secondary truncate">{it.reason}</span>
              <StatusBadge size="xs" tone={it.status === 'approved' ? 'success' : it.status === 'rejected' ? 'danger' : 'warning'} label={it.status} />
              {it.status === 'pending' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setItems(prev => prev.map(x => x.id === it.id ? { ...x, status: 'approved' } : x))}>OK</Button>
                  <Button variant="ghost" size="sm" onClick={() => setItems(prev => prev.map(x => x.id === it.id ? { ...x, status: 'rejected' } : x))}>NO</Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function CurrencyConversionCard() {
  return (
    <SectionCard title="Conversie valutară" icon={Coins}
      description="Pentru match-uri cross-currency se folosește cursul BNR din ziua livrării (sincronizat din Finance → Rate de schimb)">
      <p className="text-pm-2xs text-content-muted">Activează "Allow currency mismatch" în Setări dacă suporta backendul.</p>
    </SectionCard>
  );
}

interface AuditLog { id: string; user: string; action: string; ts: string }

function AuditLogCard() {
  const [items] = useLocalStorage<AuditLog[]>('promix_3wm_audit_v1', []);
  return (
    <SectionCard title="Audit log" icon={History}>
      {items.length === 0 ? (
        <p className="text-pm-xs text-content-muted text-center py-3">Niciun eveniment înregistrat încă.</p>
      ) : (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-32 overflow-y-auto">
          {items.map(e => (
            <li key={e.id} className="flex items-center gap-2 py-1.5">
              <span className="text-content-primary">{e.user}</span>
              <span className="flex-1 text-content-muted">{e.action}</span>
              <span className="text-pm-2xs text-content-muted">{formatDateRo(e.ts)}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ExportReportCard({ matches }: Props) {
  return (
    <SectionCard title="Export raport match" icon={FileDown}
      actions={
        <ExportMenu rows={matches} columns={[
          { key: 'po', label: 'PO' }, { key: 'invoice', label: 'Factură' },
          { key: 'receipt', label: 'Recepție' }, { key: 'status', label: 'Status' }, { key: 'variance', label: 'Varianță' },
        ]} filename="three-way-match-report" />
      }
    >
      <p className="text-pm-xs text-content-secondary">{matches.length} match-uri disponibile pentru export Excel.</p>
    </SectionCard>
  );
}

export default function ThreeWayMatchEnhancements({ matches }: Props) {
  return (
    <section className="border-t border-line p-3 space-y-3 bg-surface-secondary/40">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">3-way match — extra</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Tools avansate</h2>
      </header>
      <AutoMatchRulesCard />
      <ToleranceCard />
      <ApprovalWorkflowCard matches={matches} />
      <CurrencyConversionCard />
      <AuditLogCard />
      <ExportReportCard matches={matches} />
    </section>
  );
}
