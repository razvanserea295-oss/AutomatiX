import { useState, useEffect, useCallback } from 'react';
import { Wrench, Plus, Loader2, X, MessageSquare, Package, Send, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from '@/store/toastStore';
import { useMoney } from '@/store/settingsStore';
import { useClientStore } from '@/store/clientStore';
import EmptyState from '@/components/EmptyState';
import { filterToggleCls } from '@/components/ui/filterControls';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type TicketStatus = 'open' | 'in_progress' | 'waiting_parts' | 'waiting_client' | 'resolved' | 'closed' | 'cancelled';

interface Ticket {
  id: number; ticket_number: string;
  station_id: number | null; station_name: string | null;
  client_id: number | null; client_name: string | null;
  severity: Severity; status: TicketStatus;
  title: string; description: string | null;
  reported_via: string; reported_by_name: string | null; reported_by_contact: string | null;
  assigned_user_id: number | null; assigned_user_name: string | null;
  sla_due_at: string | null; first_response_at: string | null;
  resolved_at: string | null; closed_at: string | null;
  resolution_notes: string | null;
  cost_labor: number; cost_parts: number; cost_total: number; currency: string;
  is_billable: boolean;
  created_at: string; created_by_name: string | null;
  is_overdue: boolean;
  comments?: Array<{ id: number; user_name: string | null; body: string; created_at: string; comment_type: string }>;
  parts?: Array<{ id: number; description: string; quantity: number; unit_cost: number; total_cost: number }>;
}

interface Stats {
  open: number; in_progress: number; overdue: number; resolved_this_week: number;
  avg_resolution_hours: number | null; total_billable_revenue: number;
}

interface Station { id: number; name: string; client_id: number | null; }
interface UserItem { id: number; full_name: string; }

const SEVERITY_BADGE_TONE: Record<Severity, 'danger' | 'warning' | 'info' | 'neutral'> = {
  critical: 'danger',
  high:     'warning',
  medium:   'info',
  low:      'neutral',
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Deschis', in_progress: 'În lucru', waiting_parts: 'Aștept piese',
  waiting_client: 'Aștept client', resolved: 'Rezolvat', closed: 'Închis', cancelled: 'Anulat',
};
const STATUS_BADGE_TONE: Record<TicketStatus, 'info' | 'warning' | 'special' | 'progress' | 'success' | 'neutral'> = {
  open: 'info',
  in_progress: 'warning',
  waiting_parts: 'special',
  waiting_client: 'progress',
  resolved: 'success',
  closed: 'neutral',
  cancelled: 'neutral',
};

export default function ServiceTicketsPage({ user: _user }: { user: User | null }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'open' | 'all' | 'overdue'>('open');
  const [stations, setStations] = useState<Station[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const clients = useClientStore(s => s.clients);
  const fetchClients = useClientStore(s => s.fetchClients);

  const fetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiCommand<Ticket[]>('list_service_tickets', filter === 'open' ? { only_open: true } : {}),
      apiCommand<Stats>('get_service_ticket_stats'),
    ]).then(([ts, st]) => {
      let list = ts || [];
      if (filter === 'overdue') list = list.filter(t => t.is_overdue);
      setTickets(list);
      setStats(st);
    }).catch(() => setTickets([])).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    fetch();
    void fetchClients();
    apiCommand<Station[]>('get_all_stations').then(setStations).catch(() => setStations([]));
    apiCommand<UserItem[]>('get_users').then(setUsers).catch(() => setUsers([]));
  }, [fetch, fetchClients]);

  const refreshSelected = useCallback(async (id: number) => {
    try {
      const t = await apiCommand<Ticket>('get_service_ticket', { ticket_id: id });
      setSelected(t);
    } catch {  }
  }, []);

  return (
    <Page className="mod-shell !overflow-hidden">
      {}
      <div className="px-5 pt-4 pb-8 shrink-0 space-y-4">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Service"
          icon={Wrench}
          title="Tichete service"
          subtitle="Tichete de service pentru stații instalate, cu SLA și costuri"
          actions={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" /> Tichet nou
            </Button>
          }
        />
        {stats && (
          <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
            <KpiMini icon={Wrench}        label="Deschise"       value={stats.open} />
            <KpiMini icon={Clock}         label="În lucru"       value={stats.in_progress} />
            <KpiMini icon={AlertTriangle} label="Overdue SLA"    value={stats.overdue} warn={stats.overdue > 0} />
            <KpiMini icon={CheckCircle2}  label="Rezolvate (7z)" value={stats.resolved_this_week} />
          </div>
        )}
        <div className="flex items-center gap-1.5 enter-up" style={{ animationDelay: '160ms' }}>
          {(['open', 'overdue', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={filterToggleCls(filter === f)}>
              {f === 'open' ? 'Deschise' : f === 'overdue' ? 'Overdue' : 'Toate'}
            </button>
          ))}
        </div>
      </div>

      {}
      <div className="flex flex-1 min-h-0 overflow-hidden gap-4 px-5 pb-5 enter-up" style={{ animationDelay: '240ms' }}>
        {}
        <GlassCard size="regular" className="w-2/3 min-h-0 !p-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
          ) : tickets.length === 0 ? (
            <EmptyState icon={Wrench} title="Niciun tichet" body="Toate sub control sau nu există tichete în filtrul curent." />
          ) : (
            <div>
              {tickets.map(t => (
                <button key={t.id} onClick={() => { setSelected(t); refreshSelected(t.id); }}
                  className={`w-full text-left border-b border-line p-4 hover:bg-surface-tertiary/30 transition-colors ${
                    selected?.id === t.id ? 'border-l-2 border-l-accent bg-accent/5' : ''
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-pm-2xs font-mono text-accent">{t.ticket_number}</span>
                        <StatusBadge size="xs" uppercase tone={SEVERITY_BADGE_TONE[t.severity]} label={t.severity.toUpperCase()} />
                        <StatusBadge size="xs" tone={STATUS_BADGE_TONE[t.status]} label={STATUS_LABEL[t.status]} />
                        {t.is_overdue && (
                          <StatusBadge size="xs" tone="danger" label="SLA OVERDUE" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-content-primary truncate">{t.title}</p>
                      <p className="text-xs text-content-muted truncate">
                        {t.station_name ? `${t.station_name}` : '—'} {t.client_name ? `• ${t.client_name}` : ''}
                        {t.assigned_user_name ? ` • ${t.assigned_user_name}` : ' • neasignat'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </GlassCard>

        {}
        <GlassCard size="regular" className="w-1/3 min-h-0 !p-0 overflow-y-auto">
          {!selected ? (
            <div className="p-6 text-center text-xs text-content-muted">Selectează un tichet</div>
          ) : (
            <TicketDetail ticket={selected} users={users} onUpdate={(t) => { setSelected(t); fetch(); }} />
          )}
        </GlassCard>
      </div>

      {showCreate && (
        <CreateTicketModal
          stations={stations} clients={clients as any[]} users={users}
          onClose={() => setShowCreate(false)}
          onCreated={(t) => { setShowCreate(false); setSelected(t); fetch(); }}
        />
      )}
    </Page>
  );
}


function KpiMini({ icon: Icon, label, value, warn }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}

function TicketDetail({ ticket, users, onUpdate }: {
  ticket: Ticket; users: UserItem[];
  onUpdate: (t: Ticket) => void;
}) {
  const [commentBody, setCommentBody] = useState('');
  const [partDesc, setPartDesc] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partCost, setPartCost] = useState(0);
  const [busy, setBusy] = useState(false);
  const money = useMoney();

  const setStatus = async (status: TicketStatus) => {
    setBusy(true);
    try {
      const t = await apiCommand<Ticket>('update_service_ticket', { request: { id: ticket.id, status } });
      onUpdate(t); toast.success('Status actualizat');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
    finally { setBusy(false); }
  };

  const setSeverity = async (severity: Severity) => {
    setBusy(true);
    try {
      const t = await apiCommand<Ticket>('update_service_ticket', { request: { id: ticket.id, severity } });
      onUpdate(t); toast.success('Severitate actualizată');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
    finally { setBusy(false); }
  };

  const assign = async (userId: number | null) => {
    setBusy(true);
    try {
      const t = await apiCommand<Ticket>('update_service_ticket', { request: { id: ticket.id, assigned_user_id: userId } });
      onUpdate(t); toast.success('Asignat');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
    finally { setBusy(false); }
  };

  const setLabor = async (cost: number) => {
    setBusy(true);
    try {
      const t = await apiCommand<Ticket>('update_service_ticket', { request: { id: ticket.id, cost_labor: cost } });
      onUpdate(t);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
    finally { setBusy(false); }
  };

  const setTicketCurrency = async (currency: string) => {
    setBusy(true);
    try {
      const t = await apiCommand<Ticket>('update_service_ticket', { request: { id: ticket.id, currency } });
      onUpdate(t);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
    finally { setBusy(false); }
  };

  const addComment = async () => {
    if (!commentBody.trim()) return;
    try {
      const t = await apiCommand<Ticket>('add_service_ticket_comment', { ticket_id: ticket.id, body: commentBody });
      onUpdate(t); setCommentBody(''); toast.success('Comentariu adăugat');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const addPart = async () => {
    if (!partDesc.trim() || partQty <= 0) return;
    try {
      const t = await apiCommand<Ticket>('add_service_ticket_part', {
        ticket_id: ticket.id,
        part: { description: partDesc, quantity: partQty, unit_cost: partCost },
      });
      onUpdate(t); setPartDesc(''); setPartQty(1); setPartCost(0); toast.success('Piesă adăugată');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const removePart = async (partId: number) => {
    try {
      const t = await apiCommand<Ticket>('remove_service_ticket_part', { part_id: partId });
      onUpdate(t);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const slaBadge = ticket.sla_due_at ? (
    <span className={`text-pm-2xs ${ticket.is_overdue ? 'text-status-red font-bold' : 'text-content-muted'}`}>
      SLA: {new Date(ticket.sla_due_at).toLocaleString('ro-RO')}
    </span>
  ) : null;

  return (
    <div className="flex flex-col">
      {}
      <div className="px-4 py-3 border-b border-line bg-surface-secondary">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-pm-2xs font-mono text-accent">{ticket.ticket_number}</span>
          {slaBadge}
        </div>
        <h3 className="text-sm font-semibold text-content-primary">{ticket.title}</h3>
        <p className="text-xs text-content-muted">{ticket.station_name || '—'} • {ticket.client_name || '—'}</p>
        {ticket.description && (
          <p className="text-xs text-content-secondary mt-2 whitespace-pre-wrap bg-surface-primary border border-line p-2">{ticket.description}</p>
        )}
      </div>

      {}
      <div className="grid grid-cols-2 border-b border-line">
        <Field label="Status" className="border-r border-b border-line p-3">
          <select value={ticket.status} onChange={e => setStatus(e.target.value as TicketStatus)} disabled={busy} className="input">
            {(Object.keys(STATUS_LABEL) as TicketStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Severitate" className="border-b border-line p-3">
          <select value={ticket.severity} onChange={e => setSeverity(e.target.value as Severity)} disabled={busy} className="input">
            <option value="critical">Critical (4h)</option>
            <option value="high">High (24h)</option>
            <option value="medium">Medium (72h)</option>
            <option value="low">Low (7d)</option>
          </select>
        </Field>
        <Field label="Asignat" className="border-r border-line p-3">
          <select value={ticket.assigned_user_id || ''} onChange={e => assign(e.target.value ? Number(e.target.value) : null)} disabled={busy} className="input">
            <option value="">— neasignat —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </Field>
        <Field label={`Cost manoperă (${ticket.currency || 'RON'})`} className="p-3">
          <input type="number" min={0} step="0.01" defaultValue={ticket.cost_labor}
            onBlur={e => setLabor(Number(e.target.value))} className="input" />
        </Field>
      </div>

      {}
      <div className="bg-surface-secondary border-b border-line px-4 py-2 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Costuri</span>
          <select value={ticket.currency || 'RON'} onChange={e => setTicketCurrency(e.target.value)} disabled={busy}
            className="border border-line bg-surface-primary px-1.5 py-0.5 text-pm-2xs rounded">
            <option value="RON">RON</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div className="flex justify-between"><span>Manoperă:</span><span className="tabular-nums">{money(ticket.cost_labor, ticket.currency, 2)}</span></div>
        <div className="flex justify-between"><span>Piese:</span><span className="tabular-nums">{money(ticket.cost_parts, ticket.currency, 2)}</span></div>
        <div className="flex justify-between font-semibold border-t border-line mt-1 pt-1"><span>Total:</span><span className="tabular-nums">{money(ticket.cost_total, ticket.currency, 2)}</span></div>
      </div>

      {}
      <div className="border-b border-line px-4 py-3">
        <h4 className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-2 flex items-center gap-1">
          <Package className="h-3 w-3" /> Piese consumate
        </h4>
        <div className="mb-2">
          {(ticket.parts || []).map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-surface-secondary border-b border-line p-1.5 text-xs last:border-b-0">
              <span className="flex-1">{p.description}</span>
              <span className="tabular-nums text-content-muted">{p.quantity} x {p.unit_cost.toFixed(2)} = {p.total_cost.toFixed(2)}</span>
              <button onClick={() => removePart(p.id)} className="text-content-muted hover:text-status-red"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-0">
          <input className="input col-span-6 border-r-0" placeholder="Descriere piesă" value={partDesc} onChange={e => setPartDesc(e.target.value)} />
          <input className="input col-span-2 border-r-0" type="number" min={0} step="0.01" placeholder="Cant." value={partQty} onChange={e => setPartQty(Number(e.target.value))} />
          <input className="input col-span-3 border-r-0" type="number" min={0} step="0.01" placeholder="Preț unit." value={partCost} onChange={e => setPartCost(Number(e.target.value))} />
          <button onClick={addPart} className="col-span-1 bg-accent text-surface-primary p-1 text-xs"><Plus className="h-3 w-3 mx-auto" /></button>
        </div>
      </div>

      {}
      <div className="px-4 py-3">
        <h4 className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-2 flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> Comentarii
        </h4>
        <div className="mb-2 max-h-60 overflow-y-auto">
          {(ticket.comments || []).map(c => (
            <div key={c.id} className="bg-surface-secondary border-b border-line p-2 text-xs last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-content-primary">{c.user_name || '—'}</span>
                <span className="text-pm-2xs text-content-muted">{new Date(c.created_at).toLocaleString('ro-RO')}</span>
              </div>
              <p className="text-content-secondary whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-0">
          <textarea value={commentBody} onChange={e => setCommentBody(e.target.value)} placeholder="Adaugă comentariu..."
            rows={2} className="input flex-1 text-xs resize-none" />
          <button onClick={addComment} className="bg-accent text-surface-primary px-3 py-1 text-xs flex items-center justify-center">
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>

      <style>{`
        .input { width: 100%; border: 1px solid var(--color-border);
                 background-color: var(--color-bg-primary); padding: 0.375rem 0.625rem;
                 font-size: 0.75rem; color: var(--color-text-primary); }
        .input:focus { outline: none; box-shadow: 0 0 0 1px var(--color-accent); }
      `}</style>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className || ''}`}>
      <span className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted block mb-1">{label}</span>
      {children}
    </label>
  );
}

function CreateTicketModal({ stations, clients, users, onClose, onCreated }: {
  stations: Station[]; clients: any[]; users: UserItem[];
  onClose: () => void; onCreated: (t: Ticket) => void;
}) {
  const [stationId, setStationId] = useState<number | ''>('');
  const [clientId, setClientId] = useState<number | ''>('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reportedVia, setReportedVia] = useState('phone');
  const [reportedByName, setReportedByName] = useState('');
  const [reportedByContact, setReportedByContact] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error('Titlul tichetului este obligatoriu'); return; }
    setSubmitting(true);
    try {
      const t = await apiCommand<Ticket>('create_service_ticket', {
        request: {
          station_id: stationId || null,
          client_id: clientId || null,
          severity, title: title.trim(),
          description: description || null,
          reported_via: reportedVia,
          reported_by_name: reportedByName || null,
          reported_by_contact: reportedByContact || null,
          assigned_user_id: assignedUserId || null,
        },
      });
      toast.success('Tichet creat');
      onCreated(t);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare creare tichet'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-primary border border-line w-full max-w-2xl">
        <div className="border-b border-line p-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content-primary">Tichet service nou</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-tertiary"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-0">
            <div className="border-r border-b border-line p-3">
              <Field label="Stație">
                <select value={stationId} onChange={e => setStationId(e.target.value ? Number(e.target.value) : '')} className="input">
                  <option value="">— niciuna —</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="border-b border-line p-3">
              <Field label="Client">
                <select value={clientId} onChange={e => setClientId(e.target.value ? Number(e.target.value) : '')} className="input">
                  <option value="">— din stație —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="border-r border-b border-line p-3">
              <Field label="Severitate">
                <select value={severity} onChange={e => setSeverity(e.target.value as Severity)} className="input">
                  <option value="critical">Critical (SLA 4h)</option>
                  <option value="high">High (SLA 24h)</option>
                  <option value="medium">Medium (SLA 72h)</option>
                  <option value="low">Low (SLA 7 zile)</option>
                </select>
              </Field>
            </div>
            <div className="border-b border-line p-3">
              <Field label="Raportat prin">
                <select value={reportedVia} onChange={e => setReportedVia(e.target.value)} className="input">
                  <option value="phone">Telefon</option>
                  <option value="email">Email</option>
                  <option value="portal">Portal client</option>
                  <option value="onsite">La fața locului</option>
                </select>
              </Field>
            </div>
            <div className="border-r border-b border-line p-3">
              <Field label="Raportat de">
                <input value={reportedByName} onChange={e => setReportedByName(e.target.value)} className="input" placeholder="Nume persoană" />
              </Field>
            </div>
            <div className="border-b border-line p-3">
              <Field label="Contact">
                <input value={reportedByContact} onChange={e => setReportedByContact(e.target.value)} className="input" placeholder="Tel / email" />
              </Field>
            </div>
            <div className="col-span-2 p-3">
              <Field label="Asignează tehnician">
                <select value={assignedUserId} onChange={e => setAssignedUserId(e.target.value ? Number(e.target.value) : '')} className="input">
                  <option value="">— neasignat —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div className="px-3">
            <Field label="Titlu *">
              <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="ex: Motor malaxor face zgomot" />
            </Field>
          </div>
          <div className="px-3">
            <Field label="Descriere">
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="input resize-none" placeholder="Detalii defecțiune..." />
            </Field>
          </div>
        </div>
        <div className="border-t border-line p-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Anulează</Button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Creează
          </Button>
        </div>
      </div>
      <style>{`
        .input { width: 100%; border: 1px solid var(--color-border);
                 background-color: var(--color-bg-primary); padding: 0.375rem 0.625rem;
                 font-size: 0.75rem; color: var(--color-text-primary); }
        .input:focus { outline: none; box-shadow: 0 0 0 1px var(--color-accent); }
      `}</style>
    </div>
  );
}
