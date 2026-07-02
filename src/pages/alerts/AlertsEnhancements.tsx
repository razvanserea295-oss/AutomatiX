




import { useMemo, useState } from 'react';
import {
  BellRing, BellOff, ListChecks, Search, Mail, ChevronsRight, MoonStar, Plus, Trash2,
} from '@/icons';
import { useLocalStorage, SectionCard, SnoozeMenu } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';
import { formatDateRo } from '@/lib/format';
import type { Alert } from '@/store/alertStore';

interface Props { alerts: Alert[]; onBulkAck?: (ids: number[]) => Promise<void> | void }

const ALERT_TYPES = ['system', 'deadline', 'inventory', 'production', 'finance', 'maintenance'];

function SubscriptionsCard() {
  const [subs, setSubs] = useLocalStorage<Record<string, boolean>>('promix_alerts_subs_v1',
    Object.fromEntries(ALERT_TYPES.map(t => [t, true])));
  return (
    <SectionCard title="Subscripții pe tip" icon={BellRing}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {ALERT_TYPES.map(t => (
          <label key={t} className="flex items-center gap-2 text-pm-base">
            <input type="checkbox" checked={!!subs[t]}
              onChange={(e) => setSubs({ ...subs, [t]: e.target.checked })} />
            <span className="capitalize text-content-primary">{t}</span>
          </label>
        ))}
      </div>
    </SectionCard>
  );
}

function MuteWindowCard() {
  const [mute, setMute] = useLocalStorage<{ until?: string }>('promix_alerts_mute_v1', {});
  const muted = mute.until && new Date(mute.until).getTime() > Date.now();
  return (
    <SectionCard title="Mute notificări" icon={MoonStar}
      description={muted ? `Mut până la ${formatDateRo(mute.until!)}` : 'Notificările sunt active'}
      actions={
        <SnoozeMenu onSnooze={(iso) => { setMute({ until: iso }); toast.success(`Mute activ până la ${formatDateRo(iso)}`); }} />
      }
    >
      {muted && (
        <Button variant="ghost" size="sm" onClick={() => setMute({})}>
          <BellRing className="h-3.5 w-3.5" /> Reactivează acum
        </Button>
      )}
    </SectionCard>
  );
}

function BulkAckCard({ alerts, onBulkAck }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const open = alerts.filter(a => !a.acknowledged);
  const ack = async () => {
    if (selected.length === 0) return;
    if (onBulkAck) await onBulkAck(selected);
    toast.success(`${selected.length} alerte rezolvate${reason ? ` — ${reason}` : ''}`);
    setSelected([]); setReason('');
  };
  return (
    <SectionCard title="Bulk acknowledge" icon={ListChecks} description={`${open.length} deschise`}>
      {open.length === 0 ? (
        <p className="text-pm-xs text-content-muted text-center py-3">Nicio alertă activă.</p>
      ) : (
        <ul className="text-pm-xs divide-y divide-line/40">
          {open.slice(0, 30).map(a => (
            <li key={a.id} className="flex items-center gap-2 py-1.5">
              <input type="checkbox" checked={selected.includes(a.id)} onChange={(e) => {
                setSelected(prev => e.target.checked ? [...prev, a.id] : prev.filter(x => x !== a.id));
              }} />
              <span className="flex-1 text-content-primary truncate">{a.title}</span>
              <span className="text-content-muted">{formatDateRo(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 mt-2">
        <input className="flex-1 h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Motiv comun" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="primary" size="sm" onClick={ack} disabled={selected.length === 0}>Rezolvă selectatele</Button>
      </div>
    </SectionCard>
  );
}

function EmailDigestCard() {
  const [cfg, setCfg] = useLocalStorage<{ email: string; cadence: 'daily' | 'weekly'; enabled: boolean }>(
    'promix_alerts_digest_v1', { email: '', cadence: 'daily', enabled: false });
  return (
    <SectionCard title="Email digest" icon={Mail} description="Sumar zilnic/săptămânal pentru alertele neconfirmate">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input type="email" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="email@firma.ro" value={cfg.email}
          onChange={(e) => setCfg({ ...cfg, email: e.target.value })} />
        <select className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          value={cfg.cadence}
          onChange={(e) => setCfg({ ...cfg, cadence: e.target.value as 'daily' | 'weekly' })}>
          <option value="daily">Zilnic la 8:00</option>
          <option value="weekly">Luni dimineața</option>
        </select>
        <label className="flex items-center gap-2 text-pm-base">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
          <span className="text-content-primary">Activează digest</span>
        </label>
      </div>
    </SectionCard>
  );
}

function FullTextSearchCard({ alerts }: { alerts: Alert[] }) {
  const [q, setQ] = useState('');
  const matches = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return [];
    return alerts.filter(a => (a.title || '').toLowerCase().includes(term) || (a.message || '').toLowerCase().includes(term)).slice(0, 12);
  }, [q, alerts]);
  return (
    <SectionCard title="Search full-text" icon={Search}>
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="caută în titluri / descrieri…"
        className="h-9 w-full rounded border border-line bg-surface-primary px-3 text-pm-base" />
      {matches.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 mt-2">
          {matches.map(a => (
            <li key={a.id} className="py-1.5">
              <p className="text-content-primary">{a.title}</p>
              <p className="text-pm-2xs text-content-muted truncate">{a.message}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

interface EscalationChain { id: string; severity: string; thresholdMin: number; targets: string }

function EscalationChainCard() {
  const [items, setItems] = useLocalStorage<EscalationChain[]>('promix_alerts_chains_v1', []);
  const [draft, setDraft] = useState<Partial<EscalationChain>>({ severity: 'critical', thresholdMin: 30 });
  const add = () => {
    if (!draft.targets) return;
    setItems(prev => [...prev, { id: `${Date.now()}`, severity: draft.severity!, thresholdMin: Number(draft.thresholdMin ?? 30), targets: draft.targets! }]);
    setDraft({ severity: 'critical', thresholdMin: 30 });
  };
  return (
    <SectionCard title="Lanț de escalare" icon={ChevronsRight}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <select className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          value={draft.severity} onChange={(e) => setDraft(d => ({ ...d, severity: e.target.value }))}>
          <option value="critical">critical</option><option value="warning">warning</option><option value="info">info</option>
        </select>
        <input type="number" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums"
          placeholder="Min." value={draft.thresholdMin ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, thresholdMin: Number(e.target.value) }))} />
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Destinatari (a@b.ro, +40…)" value={draft.targets ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, targets: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={add}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {items.map(c => (
            <li key={c.id} className="flex items-center gap-2 py-1.5">
              <span className="capitalize text-content-primary">{c.severity}</span>
              <span className="text-content-muted">≥ {c.thresholdMin} min →</span>
              <span className="flex-1 text-content-secondary truncate">{c.targets}</span>
              <button onClick={() => setItems(prev => prev.filter(x => x.id !== c.id))}
                className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function PerAlertSnoozeCard({ alerts }: { alerts: Alert[] }) {
  const [snoozes, setSnoozes] = useLocalStorage<Record<string, string>>('promix_alerts_snoozes_v1', {});
  return (
    <SectionCard title="Snooze individual" icon={BellOff} description="Amână o alertă specifică la o oră viitoare">
      {alerts.length === 0 ? (
        <p className="text-pm-xs text-content-muted">Nicio alertă disponibilă.</p>
      ) : (
        <ul className="text-pm-xs divide-y divide-line/40">
          {alerts.slice(0, 10).map(a => (
            <li key={a.id} className="flex items-center gap-2 py-1.5">
              <span className="flex-1 text-content-primary truncate">{a.title}</span>
              {snoozes[a.id] ? (
                <span className="text-pm-2xs text-content-muted">până la {formatDateRo(snoozes[a.id])}</span>
              ) : (
                <SnoozeMenu onSnooze={(iso) => setSnoozes({ ...snoozes, [a.id]: iso })} />
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export default function AlertsEnhancements({ alerts, onBulkAck }: Props) {
  return (
    <section className="mt-4 space-y-3">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">Avansat</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Reguli & instrumente alerte</h2>
      </header>
      <SubscriptionsCard />
      <BulkAckCard alerts={alerts} onBulkAck={onBulkAck} />
      <PerAlertSnoozeCard alerts={alerts} />
      <FullTextSearchCard alerts={alerts} />
      <MuteWindowCard />
      <EscalationChainCard />
      <EmailDigestCard />
    </section>
  );
}
