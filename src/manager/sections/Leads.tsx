import { useEffect, useMemo, useState } from 'react';
import { Inbox, Mail, Phone, Building2, RefreshCw, CalendarClock, KeyRound } from '@/icons';
import { cmd } from '../api';
import { Btn, Spinner, EmptyState, StatusPill, fmtDate, useToasts, Toasts } from '../ui';

interface Lead {
  id: number;
  type: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  status: string;
  created_at: string;
}

const STATUSES: { id: string; label: string; tone: 'blue' | 'amber' | 'green' | 'red' }[] = [
  { id: 'new', label: 'Nou', tone: 'blue' },
  { id: 'contacted', label: 'Contactat', tone: 'amber' },
  { id: 'converted', label: 'Convertit', tone: 'green' },
  { id: 'rejected', label: 'Respins', tone: 'red' },
];
const toneOf = (s: string) => STATUSES.find((x) => x.id === s)?.tone ?? 'gray';
const labelOf = (s: string) => STATUSES.find((x) => x.id === s)?.label ?? s;

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { items, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    try {
      const r = await cmd<{ leads: Lead[] }>('list_leads');
      setLeads(r.leads || []);
    } catch (e) {
      push('err', e instanceof Error ? e.message : 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function setStatus(id: number, status: string) {
    const prev = leads;
    setLeads((s) => s.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await cmd('update_lead_status', { id, status });
    } catch (e) {
      setLeads(prev);
      push('err', e instanceof Error ? e.message : 'Nu am putut actualiza');
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const l of leads) c[l.status] = (c[l.status] || 0) + 1;
    return c;
  }, [leads]);

  const shown = filter === 'all' ? leads : leads.filter((l) => l.status === filter);

  return (
    <div className="mgr-section">
      <div className="mgr-section-head">
        <div>
          <h2>Solicitări</h2>
          <p>Cereri de demonstrație și acces venite din site-ul de prezentare.</p>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => void load()}><RefreshCw size={14} /> Reîncarcă</Btn>
      </div>

      <div className="mgr-stats">
        <button className={`mgr-stat ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          <span className="mgr-stat-n">{counts.all || 0}</span><span className="mgr-stat-l">Total</span>
        </button>
        {STATUSES.map((s) => (
          <button key={s.id} className={`mgr-stat ${filter === s.id ? 'on' : ''}`} onClick={() => setFilter(s.id)}>
            <span className="mgr-stat-n">{counts[s.id] || 0}</span><span className="mgr-stat-l">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="mgr-card mgr-card-flush">
        {loading ? (
          <Spinner label="Se încarcă solicitările…" />
        ) : shown.length === 0 ? (
          <EmptyState icon={<Inbox size={22} />} title="Nicio solicitare" text="Cererile din site apar aici imediat ce sosesc." />
        ) : (
          <div className="mgr-table-wrap">
            <table className="mgr-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Tip</th>
                  <th>Mesaj</th>
                  <th>Primit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="mgr-strong">{l.name || '—'}</div>
                      {l.company && <div className="mgr-muted mgr-row-ic"><Building2 size={12} /> {l.company}</div>}
                      {l.email && <div className="mgr-muted mgr-row-ic"><Mail size={12} /> <a href={`mailto:${l.email}`}>{l.email}</a></div>}
                      {l.phone && <div className="mgr-muted mgr-row-ic"><Phone size={12} /> <a href={`tel:${l.phone}`}>{l.phone}</a></div>}
                    </td>
                    <td>
                      <StatusPill tone={l.type === 'demo' ? 'blue' : 'gray'}>
                        {l.type === 'demo' ? <><CalendarClock size={12} /> Demo</> : <><KeyRound size={12} /> Acces</>}
                      </StatusPill>
                    </td>
                    <td className="mgr-msg">{l.message ? <span title={l.message}>{l.message}</span> : <span className="mgr-muted">—</span>}</td>
                    <td className="mgr-muted mgr-nowrap">{fmtDate(l.created_at)}</td>
                    <td>
                      <div className="mgr-status-cell">
                        <StatusPill tone={toneOf(l.status)}>{labelOf(l.status)}</StatusPill>
                        <select className="mgr-select-sm" value={l.status} onChange={(e) => void setStatus(l.id, e.target.value)}>
                          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Toasts items={items} onDismiss={dismiss} />
    </div>
  );
}
