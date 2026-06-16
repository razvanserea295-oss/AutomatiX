











import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Activity, Users, AlertOctagon, LogIn, LogOut, Shield, RefreshCw, ShieldCheck, History, Loader2, Clock } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { confirmDialog } from '@/components/ConfirmDialog';
import { toast } from '@/store/toastStore';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge';
import { SectionCard, useLocalStorage } from '@/components/enhancements';
import { parseBackendTimestamp } from '@/lib/format';





interface ActiveSession {
  session_id: string;
  user_id: number;
  username: string;
  full_name: string | null;
  role_name: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
}

interface LoginEvent {
  id: number;
  action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | string;
  ip_address: string | null;
  details: string | null;
  created_at: string;
}

interface Summary {
  active_users: number;
  active_sessions: number;
  logins_today: number;
  failed_logins_today: number;
}



export default function UserSessionsPage({ user }: { user: User | null }) {
  const isAdmin = (user?.role_name || '').toLowerCase() === 'admin';

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyRef = useRef<HTMLDivElement | null>(null);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, sm] = await Promise.all([
        apiCommand<ActiveSession[]>('list_active_sessions'),
        apiCommand<Summary>('get_sessions_summary'),
      ]);
      setSessions(s || []);
      setSummary(sm || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la încărcare');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    fetchAll();
    
    
    
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (id) return; id = setInterval(fetchAll, 5000); };
    const stop  = () => { if (id) { clearInterval(id); id = null; } };
    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchAll, isAdmin]);

  const loadHistory = useCallback(async (userId: number) => {
    setSelectedUserId(userId);
    setHistoryLoading(true);
    
    
    
    requestAnimationFrame(() => {
      historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    try {
      const h = await apiCommand<LoginEvent[]>('get_user_login_history', { user_id: userId, limit: 100 });
      setHistory(h || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare istoric');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  




  const usersConnected = useMemo(() => {
    const byUser = new Map<number, ActiveSession[]>();
    for (const s of sessions) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
      byUser.get(s.user_id)!.push(s);
    }
    return Array.from(byUser.values()).map(group => {
      const sorted = group.slice().sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const primary = sorted[0];
      const distinctIps = Array.from(new Set(group.map(g => g.ip_address).filter(Boolean) as string[]));
      return {
        ...primary,
        extra_sessions: group.length - 1,
        all_ips: distinctIps,
        all_session_ids: group.map(g => g.session_id),
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sessions]);

  const handleForceLogout = async (target: ActiveSession) => {
    if (!await confirmDialog({
      title: `Forțează deconectare ${target.full_name || target.username}?`,
      body: 'Toate sesiunile active ale acestui utilizator vor fi închise. Va trebui să se autentifice din nou.',
      danger: true,
      confirmLabel: 'Forțează deconectarea',
    })) return;
    try {
      const res = await apiCommand<{ revoked: number }>('force_logout_user', { user_id: target.user_id });
      toast.success(`${res.revoked} sesiuni revocate pentru ${target.username}`);
      fetchAll();
      if (selectedUserId === target.user_id) loadHistory(target.user_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare force logout');
    }
  };

  const selectedSession = useMemo(
    () => sessions.find(s => s.user_id === selectedUserId) ?? null,
    [sessions, selectedUserId],
  );

  if (!isAdmin) {
    return (
      <Page>
        <div className="flex flex-1 items-center justify-center text-content-muted">
          <p className="text-sm">Doar administratorii au acces la această pagină.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page className="mod-shell">
      <div className="px-5 pt-4 pb-6 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Sistem"
          icon={Activity}
          title="Sesiuni & activitate"
          subtitle="Cine e conectat acum, IP-uri, istoric login/logout"
          actions={
            <Button size="sm" variant="outline" onClick={fetchAll} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Reîmprospătează
            </Button>
          }
        />
      </div>

      <Page.Body maxWidth="full" padding="comfortable">
        {

}
        {summary && (
          <GlassCard size="regular" className="!p-0 overflow-hidden enter-up" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-status-green/10 to-transparent">
              <div className="relative">
                <span className="absolute inline-flex h-3 w-3 rounded-full bg-status-green opacity-75 animate-ping" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-status-green" />
              </div>
              <div className="flex-1">
                <p className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Live · auto-refresh 5s</p>
                <p className="mt-0.5">
                  <span className="text-display font-semibold text-content-primary tabular-nums">{summary.active_users}</span>
                  <span className="ml-2 text-sm text-content-secondary">
                    {summary.active_users === 1 ? 'utilizator' : 'utilizatori'} {summary.active_users === 1 ? 'conectat' : 'conectați'} acum
                  </span>
                  {summary.active_sessions > summary.active_users && (
                    <span className="ml-3 text-pm-xs text-content-muted">
                      ({summary.active_sessions} sesiuni — unii utilizatori sunt logați pe mai multe device-uri)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-line">
              <Kpi icon={Users}        label="Useri conectați acum"      value={summary.active_users}        tone="info" />
              <Kpi icon={Activity}     label="Sesiuni active total"      value={summary.active_sessions}     tone="success" />
              <Kpi icon={LogIn}        label="Login-uri reușite (azi)"   value={summary.logins_today}        tone="neutral" />
              <Kpi icon={AlertOctagon} label="Login-uri eșuate (azi)"    value={summary.failed_logins_today} tone="danger" />
            </div>
          </GlassCard>
        )}

        {}
        <SectionCard
          title="Utilizatori conectați acum"
          icon={Users}
          description={loading
            ? 'Se încarcă…'
            : `${usersConnected.length} ${usersConnected.length === 1 ? 'utilizator' : 'utilizatori'}` +
              (sessions.length > usersConnected.length ? ` · ${sessions.length} sesiuni totale` : '')}
        >
          {loading ? (
            <div className="py-6 text-center text-pm-xs text-content-muted">
              <Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Se încarcă…
            </div>
          ) : usersConnected.length === 0 ? (
            <p className="py-6 text-center text-pm-xs text-content-muted italic">Niciun utilizator conectat acum.</p>
          ) : (
            
            
            <div className="max-h-[420px] overflow-y-auto -mx-4 px-4">
              <table className="w-full text-left text-pm-xs">
                <thead className="sticky top-0 z-10 bg-surface-secondary shadow-[inset_0_-1px_0_var(--color-border)]">
                  <tr>
                    <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Utilizator</th>
                    <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Rol</th>
                    <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">IP</th>
                    <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Sesiuni</th>
                    <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Ultima conectare</th>
                    <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {usersConnected.map(s => (
                    <tr key={s.user_id}
                      className={`border-b border-line/40 hover:bg-surface-tertiary/30 transition-colors ${
                        selectedUserId === s.user_id ? 'bg-accent/5' : ''}`}>
                      <td className="px-3 py-2">
                        <div className="text-content-primary font-medium">{s.full_name || s.username}</div>
                        <div className="text-pm-2xs text-content-muted">@{s.username}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-pm-2xs px-1.5 py-0.5 bg-surface-tertiary text-content-secondary uppercase tracking-wide">
                          {s.role_name || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-content-secondary tabular-nums" title={s.all_ips.join('\n')}>
                        {s.ip_address || '—'}
                        {s.all_ips.length > 1 && (
                          <span className="ml-1 text-pm-2xs text-content-muted">+{s.all_ips.length - 1}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {s.extra_sessions === 0 ? (
                          <span className="text-content-muted">1</span>
                        ) : (
                          <span className="text-status-amber font-semibold" title={`${s.extra_sessions + 1} sesiuni active`}>
                            {s.extra_sessions + 1}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-content-muted tabular-nums">{formatDateTime(s.created_at)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => loadHistory(s.user_id)}
                            title="Vezi istoric login (scroll automat la card)"
                            className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleForceLogout(s)}
                            title="Forțează deconectare (toate sesiunile)"
                            className="p-1.5 text-content-muted hover:bg-status-red/10 hover:text-status-red transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {}
        <div ref={historyRef} className="scroll-mt-4">
          <SectionCard title="Istoric login per utilizator" icon={History}
            description={selectedSession
              ? `Evenimente recente pentru ${selectedSession.full_name || selectedSession.username}`
              : 'Selectează un utilizator din tabelul de sus pentru a vedea istoricul'}
          >
            {!selectedUserId ? (
              <p className="py-6 text-center text-pm-xs text-content-muted italic">
                Click pe iconița <History className="h-3 w-3 inline" /> dintr-un rând al tabelului de sus.
              </p>
            ) : historyLoading ? (
              <div className="py-6 text-center text-pm-xs text-content-muted">
                <Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Se încarcă istoricul…
              </div>
            ) : history.length === 0 ? (
              <p className="py-6 text-center text-pm-xs text-content-muted italic">Niciun eveniment înregistrat.</p>
            ) : (
              
              
              <div className="max-h-[360px] overflow-y-auto -mx-4 px-4">
                <ul className="text-pm-xs divide-y divide-line/30">
                  {history.map(ev => (
                    <li key={ev.id} className="flex items-center gap-3 py-1.5">
                      <StatusBadge
                        size="xs"
                        uppercase
                        tone={ev.action === 'LOGIN' ? 'success' : ev.action === 'LOGOUT' ? 'neutral' : 'danger'}
                        label={actionLabel(ev.action)}
                      />
                      <span className="font-mono text-content-secondary text-pm-2xs">{ev.ip_address || '—'}</span>
                      <span className="ml-auto text-content-muted tabular-nums text-pm-2xs flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDateTime(ev.created_at)}
                      </span>
                      {ev.details && (
                        <span className="text-content-muted text-pm-2xs italic truncate max-w-[200px]" title={ev.details}>
                          {parseDetails(ev.details)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>
        </div>

        {}
        <TwoFAEnforcementCard />

      </Page.Body>
    </Page>
  );
}





function Kpi({ icon: Icon, label, value, tone }: {
  icon: any; label: string; value: number;
  tone: 'info' | 'success' | 'danger' | 'neutral';
}) {
  const accent = tone === 'info' ? 'text-status-blue' : tone === 'success' ? 'text-status-green'
    : tone === 'danger' ? 'text-status-red' : 'text-content-secondary';
  return (
    <div className="border-r last:border-r-0 border-line px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${accent}`} />
        <span className="text-pm-2xs uppercase tracking-[0.12em] font-bold text-content-muted">{label}</span>
      </div>
      <div className={`text-[26px] font-semibold tabular-nums leading-none mt-1 ${accent}`}>{value}</div>
    </div>
  );
}

function TwoFAEnforcementCard() {
  
  
  const [policy, setPolicy] = useLocalStorage<{ admin: boolean; manager: boolean; all: boolean }>(
    'promix_user_2fa_policy_v1', { admin: true, manager: true, all: false });
  return (
    <SectionCard title="2FA enforcement" icon={ShieldCheck}
      description="Marchează ce roluri sunt obligate să aibă autentificare cu doi factori"
    >
      <div className="grid grid-cols-3 gap-2 text-pm-base">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={policy.admin}
            onChange={(e) => setPolicy({ ...policy, admin: e.target.checked })} />
          <Shield className="h-3 w-3 text-status-red" /> Admin
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={policy.manager}
            onChange={(e) => setPolicy({ ...policy, manager: e.target.checked })} />
          <Shield className="h-3 w-3 text-status-amber" /> Manager
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={policy.all}
            onChange={(e) => setPolicy({ ...policy, all: e.target.checked })} />
          <Shield className="h-3 w-3 text-content-muted" /> Toți
        </label>
      </div>
    </SectionCard>
  );
}

function actionLabel(action: string): string {
  return action === 'LOGIN' ? 'Conectat' :
         action === 'LOGOUT' ? 'Deconectat' :
         action === 'LOGIN_FAILED' ? 'Eșuat' : action;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  
  
  
  const d = parseBackendTimestamp(iso);
  if (!d) return iso;
  return d.toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function parseDetails(raw: string): string {
  try {
    const j = JSON.parse(raw);
    if (j.reason === 'force_logout_by_admin') return `forțat de @${j.by}`;
    if (j.reason === 'unknown_user') return `user necunoscut: ${j.username}`;
    if (j.username) return `@${j.username}`;
    return raw;
  } catch { return raw.length > 60 ? raw.slice(0, 60) + '…' : raw; }
}
