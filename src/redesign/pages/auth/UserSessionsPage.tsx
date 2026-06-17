










































import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Activity, Users, AlertOctagon, LogIn, LogOut, Shield, RefreshCw, ShieldCheck, History, Loader2, Clock } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { confirmDialog } from '@/components/ConfirmDialog';
import { toast } from '@/store/toastStore';
import { useLocalStorage } from '@/components/enhancements';
import { parseBackendTimestamp } from '@/lib/format';

import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import Page from '@/redesign/ui/Page';
import Card, { CardBody } from '@/redesign/ui/Card';
import KpiCard from '@/redesign/ui/KpiCard';
import StatusBadge from '@/redesign/ui/StatusBadge';
import { GlassCard, MetricValue, SectionHeader, EmptyState } from '@/redesign/ui';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';





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
    
    
    startMorphTransition(() => flushSync(() => setSelectedUserId(userId)), { dir: 'forward' });
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
        <EmptyState
          icon={Shield}
          title="Acces restricționat"
          description="Doar administratorii au acces la această pagină."
        />
      </Page>
    );
  }

  const multiDevice = summary && summary.active_sessions > summary.active_users;

  return (
    <Page fit>
      <Page.Body fit maxWidth="full" padding="comfortable">

        {


}
        <div className="shrink-0 enter-up pb-3.5 border-b border-line/60" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
              <h1 className="text-pm-xl font-semibold text-content-primary leading-tight truncate">
                Sesiuni &amp; activitate
              </h1>
              <p className="text-pm-xs text-content-muted mt-0.5">
                Cine e conectat acum, IP-uri, istoric login/logout
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-line bg-surface-secondary px-3 py-1.5">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-status-green opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-green" />
                </span>
                <span className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
                  Live · auto-refresh 5s
                </span>
              </span>
              <Button size="sm" variant="outline" onClick={fetchAll} disabled={refreshing}>
                {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Reîmprospătează
              </Button>
            </div>
          </div>
        </div>

        {

}
        <div className="shrink-0 grid grid-cols-2 lg:grid-cols-6 gap-4 enter-up" style={{ animationDelay: '60ms' }}>
          {}
          <GlassCard
            size="regular"
            className="col-span-2 lg:col-span-2 !p-5 flex flex-col justify-center bg-gradient-to-br from-status-green/10 to-transparent"
          >
            <p className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
              Conectați acum
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <MetricValue value={summary?.active_users ?? 0} size="display-lg" />
              <span className="text-pm-sm text-content-secondary">
                {(summary?.active_users ?? 0) === 1 ? 'utilizator' : 'utilizatori'}
              </span>
            </div>
            <p className="mt-1.5 text-pm-2xs text-content-muted min-h-[1rem]">
              {multiDevice
                ? `${summary!.active_sessions} sesiuni — unii pe mai multe device-uri`
                : 'O sesiune per utilizator'}
            </p>
          </GlassCard>

          <KpiCard label="Useri conectați"      value={summary?.active_users ?? 0}        icon={Users}        iconColor="text-status-blue"  loading={loading && !summary} />
          <KpiCard label="Sesiuni active"       value={summary?.active_sessions ?? 0}     icon={Activity}     iconColor="text-status-green" loading={loading && !summary} />
          <KpiCard label="Login-uri reușite azi" value={summary?.logins_today ?? 0}        icon={LogIn}                                      loading={loading && !summary} />
          <KpiCard label="Login-uri eșuate azi"  value={summary?.failed_logins_today ?? 0} icon={AlertOctagon} iconColor="text-status-red"   loading={loading && !summary} />
        </div>

        {


}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 enter-up flex-1 min-h-0" style={{ animationDelay: '120ms' }}>

          {}
          <Card padding="none" className="lg:col-span-8 flex flex-col min-w-0 min-h-0">
            <div className="shrink-0 px-6 pt-5">
              <SectionHeader
                icon={Users}
                title="Utilizatori conectați acum"
                meta={loading
                  ? 'Se încarcă…'
                  : `${usersConnected.length} ${usersConnected.length === 1 ? 'utilizator' : 'utilizatori'}` +
                    (sessions.length > usersConnected.length ? ` · ${sessions.length} sesiuni totale` : '')}
              />
            </div>
            <div className="px-3 pb-3 flex-1 min-h-0 flex flex-col">
              {loading ? (
                <div className="py-10 text-center text-pm-xs text-content-muted">
                  <Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Se încarcă…
                </div>
              ) : usersConnected.length === 0 ? (
                <EmptyState icon={Users} title="Niciun utilizator conectat acum." />
              ) : (
                
                
                <div className="flex-1 min-h-0 overflow-y-auto px-3">
                  <table className="w-full text-left text-pm-xs">
                    <thead className="sticky top-0 z-10 bg-surface-secondary shadow-[inset_0_-1px_0_var(--color-border)]">
                      <tr>
                        <th className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Utilizator</th>
                        <th className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Rol</th>
                        <th className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">IP</th>
                        <th className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Sesiuni</th>
                        <th className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Ultima conectare</th>
                        <th className="px-3 py-2.5 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted text-right">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody className="stagger-in" key={usersConnected.map(u => u.user_id).join(',')}>
                      {usersConnected.map(s => (
                        <tr key={s.user_id}
                          style={{ viewTransitionName: selectedUserId === s.user_id ? vtName('session-user', s.user_id) : undefined }}
                          className={`group border-b border-line/40 hover:bg-surface-tertiary/30 transition-colors ${
                            selectedUserId === s.user_id ? 'bg-accent/5 shadow-[inset_3px_0_0_var(--color-accent)]' : ''}`}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {}
                              <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden>
                                <span className="absolute inline-flex h-2 w-2 rounded-full bg-status-green opacity-70 animate-ping motion-reduce:animate-none" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-status-green" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-content-primary font-medium">{s.full_name || s.username}</div>
                                <div className="text-pm-2xs text-content-muted">@{s.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge size="xs" uppercase tone="neutral" label={s.role_name || '—'} />
                          </td>
                          <td className="px-3 py-2.5 font-mono text-content-secondary tabular-nums" title={s.all_ips.join('\n')}>
                            {s.ip_address || '—'}
                            {s.all_ips.length > 1 && (
                              <span className="ml-1 text-pm-2xs text-content-muted">+{s.all_ips.length - 1}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {s.extra_sessions === 0 ? (
                              <span className="text-content-muted">1</span>
                            ) : (
                              <span className="text-status-amber font-semibold" title={`${s.extra_sessions + 1} sesiuni active`}>
                                {s.extra_sessions + 1}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-content-muted tabular-nums">{formatDateTime(s.created_at)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <IconButton
                                size="sm"
                                intent="primary"
                                onClick={() => loadHistory(s.user_id)}
                                aria-label="Vezi istoric login"
                                title="Vezi istoric login (scroll automat la card)"
                                className="hover-wiggle"
                              >
                                <History />
                              </IconButton>
                              <IconButton
                                size="sm"
                                intent="danger"
                                onClick={() => handleForceLogout(s)}
                                aria-label="Forțează deconectare"
                                title="Forțează deconectare (toate sesiunile)"
                              >
                                <LogOut />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {}
          <div ref={historyRef} className="lg:col-span-4 min-h-0 flex">
            <Card
              padding="none"
              className="flex flex-col min-w-0 w-full min-h-0"
              vtName={selectedUserId != null ? vtName('session-user', selectedUserId) : undefined}
            >
              <div className="shrink-0 px-5 pt-5">
                <SectionHeader
                  icon={History}
                  title="Istoric login"
                  meta={selectedSession
                    ? `${selectedSession.full_name || selectedSession.username}`
                    : 'Selectează un utilizator'}
                />
              </div>
              <CardBody padding="sm" className="pt-0 flex-1 min-h-0 flex flex-col">
                {!selectedUserId ? (
                  <EmptyState
                    icon={History}
                    title="Niciun utilizator selectat"
                    description="Click pe iconița istoric dintr-un rând al tabelului."
                  />
                ) : historyLoading ? (
                  <div className="py-10 text-center text-pm-xs text-content-muted">
                    <Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Se încarcă istoricul…
                  </div>
                ) : history.length === 0 ? (
                  <EmptyState icon={History} title="Niciun eveniment înregistrat." />
                ) : (
                  
                  
                  <div className="flex-1 min-h-0 overflow-y-auto px-2">
                    <ul className="text-pm-xs divide-y divide-line/30 stagger-in" key={selectedUserId}>
                      {history.map(ev => (
                        <li key={ev.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
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
                            <span className="w-full text-content-muted text-pm-2xs italic truncate" title={ev.details}>
                              {parseDetails(ev.details)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {

}
        <div className="shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-4 enter-up" style={{ animationDelay: '180ms' }}>
          <div className="lg:col-span-7">
            <TwoFAEnforcementCard />
          </div>
          <Card className="lg:col-span-5 flex flex-col justify-center" padding="lg">
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-pm-md font-semibold text-content-primary">Securitatea sesiunilor</p>
                <p className="mt-1 text-pm-sm text-content-muted">
                  Forțarea deconectării revocă <strong>toate</strong> sesiunile active ale unui utilizator.
                  Politica 2FA este momentan salvată local — aplicarea pe server urmează.
                </p>
              </div>
            </div>
          </Card>
        </div>

      </Page.Body>
    </Page>
  );
}





function TwoFAEnforcementCard() {
  
  
  const [policy, setPolicy] = useLocalStorage<{ admin: boolean; manager: boolean; all: boolean }>(
    'promix_user_2fa_policy_v1', { admin: true, manager: true, all: false });
  return (
    <Card padding="none" className="h-full">
      <div className="px-6 pt-5">
        <SectionHeader
          icon={ShieldCheck}
          title="2FA enforcement"
          meta="Marchează ce roluri sunt obligate să aibă autentificare cu doi factori"
        />
      </div>
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-pm-base">
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-secondary px-3 py-2.5 cursor-pointer">
            <input type="checkbox" className="accent-accent" checked={policy.admin}
              onChange={(e) => setPolicy({ ...policy, admin: e.target.checked })} />
            <Shield className="h-3.5 w-3.5 text-status-red" /> Admin
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-secondary px-3 py-2.5 cursor-pointer">
            <input type="checkbox" className="accent-accent" checked={policy.manager}
              onChange={(e) => setPolicy({ ...policy, manager: e.target.checked })} />
            <Shield className="h-3.5 w-3.5 text-status-amber" /> Manager
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-secondary px-3 py-2.5 cursor-pointer">
            <input type="checkbox" className="accent-accent" checked={policy.all}
              onChange={(e) => setPolicy({ ...policy, all: e.target.checked })} />
            <Shield className="h-3.5 w-3.5 text-content-muted" /> Toți
          </label>
        </div>
      </CardBody>
    </Card>
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
