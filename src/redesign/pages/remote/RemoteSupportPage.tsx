import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MonitorSmartphone, Link2, Copy, Check, Loader2, Plug, PlugZap,
  Plus, Pencil, Trash2, RefreshCw, XCircle, Info, History, Server,
  Users, ArrowRight, Monitor, ExternalLink,
} from '@/icons';
import type { User } from '@/core/types';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { getServerUrl } from '@/config/server';
import { isDesktopRuntime } from '@/lib/runtime';
import Button from '@/redesign/ui/Button';
import StatusBadge from '@/redesign/ui/StatusBadge';
import EmptyState from '@/redesign/ui/EmptyState';
import KpiCard from '@/redesign/ui/KpiCard';
import Page from '@/redesign/ui/Page';
import type { StatusTone } from '@/lib/statusTokens';
import { PageChrome, DashboardLayout, Panel } from '@/app-ui';
import Segmented from '@/redesign/ui/Segmented';

import RustDeskWebViewer from '@/components/remote/RustDeskWebViewer';

type ViewerTarget = 'in-app' | 'rustdesk-app';

interface RemoteEndpoint {
  id: number;
  name: string;
  rustdesk_id: string;
  platform: string;
  notes: string | null;
  client_name: string | null;
  password_hint: string | null;
  enabled: boolean;
}

interface RemoteSession {
  id: number;
  session_type: 'ad_hoc' | 'registered';
  endpoint_id: number | null;
  endpoint_name: string | null;
  started_by_name: string | null;
  customer_ref: string | null;
  client_name: string | null;
  rustdesk_id: string | null;
  status: string;
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  quick_code: string | null;
  quick_expires_at: string | null;
}

interface QuickCreated {
  session: RemoteSession;
  code: string;
  path_hint: string;
  expires_at: string;
  message_template: string;
}

const LABEL = 'mb-1.5 block text-pm-2xs font-bold uppercase tracking-wide text-content-muted';
const INPUT = 'h-10 w-full rounded-xl border border-line bg-surface-secondary px-3 text-pm-sm text-content-primary focus:border-accent focus:outline-none focus-visible:shadow-[var(--ring-soft)]';
const TEXTAREA = 'w-full rounded-xl border border-line bg-surface-secondary px-3 py-2.5 text-pm-sm text-content-primary focus:border-accent focus:outline-none focus-visible:shadow-[var(--ring-soft)]';
const PRIMARY_CTA = 'flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-accent text-pm-md font-semibold text-[var(--color-on-accent)] shadow-[var(--elevation-2)] transition-smooth duration-150 hover:bg-accent/95 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:shadow-[var(--ring-soft)]';
const LIST_ROW = 'flex items-center gap-2.5 rounded-xl border border-line bg-surface-secondary/40 px-3 py-2.5 transition-smooth duration-150 hover:bg-surface-tertiary/40';

const WORKFLOW_STEPS = [
  'Generați link-ul și trimiteți-l clientului',
  'Clientul descarcă și rulează Promix-QuickSupport',
  'Clientul vă comunică ID + parola afișate',
  'Introduceți datele aici și apăsați Conectează — ecranul apare sus în pagină',
];

function buildPublicLink(pathHint: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = (getServerUrl() || origin).replace(/\/+$/, '');
  const path = pathHint.startsWith('/') ? pathHint : `/${pathHint}`;
  return `${base}/#${path}`;
}

function sessionTone(status: string): { tone: StatusTone; label: string } {
  if (status === 'active') return { tone: 'success', label: 'Activă' };
  if (status === 'pending') return { tone: 'warning', label: 'În așteptare' };
  if (status === 'ended') return { tone: 'neutral', label: 'Încheiată' };
  if (status === 'cancelled') return { tone: 'neutral', label: 'Anulată' };
  if (status === 'failed') return { tone: 'danger', label: 'Eșuată' };
  return { tone: 'neutral', label: status };
}

function fmtDt(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('ro-RO'); } catch { return iso; }
}

export default function RemoteSupportPage({ user }: { user: User | null }) {
  const isDesktop = isDesktopRuntime();

  const [sessions, setSessions] = useState<RemoteSession[]>([]);
  const [endpoints, setEndpoints] = useState<RemoteEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerRef, setCustomerRef] = useState('');
  const [creatingQuick, setCreatingQuick] = useState(false);
  const [activeQuick, setActiveQuick] = useState<QuickCreated | null>(null);
  const [copied, setCopied] = useState<'link' | 'msg' | null>(null);

  const [connectId, setConnectId] = useState('');
  const [connectPassword, setConnectPassword] = useState('');
  const [connectSessionId, setConnectSessionId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [activeSession, setActiveSession] = useState<RemoteSession | null>(null);
  const [showWebViewer, setShowWebViewer] = useState(false);
  const [viewerCreds, setViewerCreds] = useState<{ id: string; password: string } | null>(null);
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget>(isDesktopRuntime() ? 'rustdesk-app' : 'in-app');
  const [externalViewerOk, setExternalViewerOk] = useState<boolean | null>(null);
  const viewerPanelRef = useRef<HTMLDivElement>(null);

  const [epForm, setEpForm] = useState({ name: '', rustdesk_id: '', notes: '', password_hint: '' });
  const [epEditing, setEpEditing] = useState<number | null>(null);
  const [savingEp, setSavingEp] = useState(false);
  const [showEpForm, setShowEpForm] = useState(false);
  const [bundleInfo, setBundleInfo] = useState<{ available: boolean; file: string | null; dir: string } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const base = getServerUrl();
      const bundleUrl = base
        ? `${base.replace(/\/+$/, '')}/api/support/bundle-info`
        : '/api/support/bundle-info';
      const [sess, eps, bundleRes] = await Promise.all([
        apiCommand<RemoteSession[]>('list_remote_sessions', { limit: 40 }),
        apiCommand<RemoteEndpoint[]>('get_remote_endpoints'),
        fetch(bundleUrl).then((r) => r.json()).catch(() => ({ available: false, file: null, dir: '' })),
      ]);
      setBundleInfo(bundleRes as { available: boolean; file: string | null; dir: string });
      setSessions(sess || []);
      setEndpoints(eps || []);
      const pending = (sess || []).find((s) => s.status === 'pending' && s.quick_code);
      if (pending?.quick_code) {
        setActiveQuick({
          session: pending,
          code: pending.quick_code,
          path_hint: `/support/q/${pending.quick_code}`,
          expires_at: pending.quick_expires_at || '',
          message_template: '',
        });
        setConnectSessionId(pending.id);
        if (pending.rustdesk_id) setConnectId(pending.rustdesk_id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const stats = useMemo(() => ({
    pending: sessions.filter((s) => s.status === 'pending').length,
    active: sessions.filter((s) => s.status === 'active').length,
    endpoints: endpoints.length,
    total: sessions.length,
  }), [sessions, endpoints]);

  const quickLink = useMemo(
    () => (activeQuick ? buildPublicLink(activeQuick.path_hint) : ''),
    [activeQuick],
  );

  const messageTemplate = useMemo(() => {
    if (!activeQuick) return '';
    if (activeQuick.message_template) {
      return activeQuick.message_template.replace('{LINK}', quickLink);
    }
    return `Bună ziua,\n\nPentru asistență la distanță, deschideți:\n${quickLink}\n\nDescărcați instrumentul, rulați-l și comunicați ID + parola.\n\nCu stimă`;
  }, [activeQuick, quickLink]);

  const copyText = async (text: string, kind: 'link' | 'msg') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
      toast.success('Copiat în clipboard');
    } catch {
      toast.error('Nu s-a putut copia');
    }
  };

  const handleCreateQuick = async () => {
    setCreatingQuick(true);
    try {
      const created = await apiCommand<QuickCreated>('create_quick_remote_support', {
        customer_ref: customerRef.trim() || null,
      });
      setActiveQuick(created);
      setConnectSessionId(created.session.id);
      setCustomerRef('');
      toast.success('Link de suport generat');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare la generare');
    } finally {
      setCreatingQuick(false);
    }
  };

  const handleConnect = async () => {
    const id = connectId.replace(/\s+/g, '').trim();
    const pw = connectPassword;
    if (!id || !pw) {
      toast.error('Introduceți ID și parola');
      return;
    }
    setConnecting(true);
    setExternalViewerOk(null);
    try {
      const session = await apiCommand<RemoteSession>('start_remote_connection', {
        session_id: connectSessionId,
        rustdesk_id: id,
      });
      setActiveSession(session);
      setViewerCreds({ id, password: pw });
      setConnectPassword('');

      if (viewerTarget === 'rustdesk-app' && isDesktop) {
        const launch = await apiCommand<{ ok: boolean; message: string }>('launch_rustdesk_viewer', {
          rustdesk_id: id,
          password: pw,
        });
        setExternalViewerOk(launch.ok);
        setShowWebViewer(false);
        if (launch.ok) {
          toast.success('RustDesk s-a deschis — căutați fereastra în taskbar');
        } else {
          toast.error(launch.message);
        }
      } else {
        setShowWebViewer(true);
        setExternalViewerOk(null);
        toast.success('Ecranul remote apare în panoul de mai sus');
        requestAnimationFrame(() => {
          viewerPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Conectare eșuată');
    } finally {
      setConnecting(false);
    }
  };

  const relaunchExternalViewer = async () => {
    if (!viewerCreds) return;
    try {
      const launch = await apiCommand<{ ok: boolean; message: string }>('launch_rustdesk_viewer', {
        rustdesk_id: viewerCreds.id,
        password: viewerCreds.password,
      });
      setExternalViewerOk(launch.ok);
      if (launch.ok) toast.success('RustDesk redeschis');
      else toast.error(launch.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const handleEndSession = async (sessionId: number) => {
    try {
      await apiCommand('end_remote_session', { session_id: sessionId });
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setShowWebViewer(false);
        setViewerCreds(null);
        setExternalViewerOk(null);
      }
      toast.success('Sesiune încheiată');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const handleCancelQuick = async () => {
    if (!activeQuick) return;
    try {
      await apiCommand('cancel_remote_session', { session_id: activeQuick.session.id });
      setActiveQuick(null);
      setConnectSessionId(null);
      toast.success('Link anulat');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const saveEndpoint = async () => {
    const name = epForm.name.trim();
    const rustdesk_id = epForm.rustdesk_id.replace(/\s+/g, '').trim();
    if (!name || !rustdesk_id) {
      toast.error('Nume și ID obligatorii');
      return;
    }
    setSavingEp(true);
    try {
      if (epEditing) {
        await apiCommand('update_remote_endpoint', {
          id: epEditing,
          name,
          rustdesk_id,
          notes: epForm.notes || null,
          password_hint: epForm.password_hint || null,
        });
      } else {
        await apiCommand('create_remote_endpoint', {
          name,
          rustdesk_id,
          notes: epForm.notes || null,
          password_hint: epForm.password_hint || null,
        });
      }
      setEpForm({ name: '', rustdesk_id: '', notes: '', password_hint: '' });
      setEpEditing(null);
      setShowEpForm(false);
      toast.success('Salvat');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setSavingEp(false);
    }
  };

  const startEditEndpoint = (ep: RemoteEndpoint) => {
    setEpEditing(ep.id);
    setShowEpForm(true);
    setEpForm({
      name: ep.name,
      rustdesk_id: ep.rustdesk_id,
      notes: ep.notes || '',
      password_hint: ep.password_hint || '',
    });
  };

  const deleteEndpoint = async (id: number) => {
    if (!confirm('Ștergeți acest endpoint?')) return;
    try {
      await apiCommand('delete_remote_endpoint', { id });
      toast.success('Șters');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const connectToEndpoint = (ep: RemoteEndpoint) => {
    setConnectId(ep.rustdesk_id);
    setConnectSessionId(null);
    setConnectPassword(ep.password_hint || '');
  };

  if (!user) return null;

  return (
    <DashboardLayout
        chrome={(
          <PageChrome
            actions={(
              <Button
                size="md"
                variant="outline"
                onClick={() => void loadAll()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Reîmprospătează
              </Button>
            )}
          />
        )}
      kpis={(
        <Page.Kpis cols={4}>
          <KpiCard
            label="Link-uri în așteptare"
            value={stats.pending}
            icon={Link2}
            iconColor={stats.pending > 0 ? 'text-status-amber' : 'text-content-muted'}
          />
          <KpiCard
            label="Sesiuni active"
            value={stats.active}
            icon={PlugZap}
            iconColor={stats.active > 0 ? 'text-status-green' : 'text-content-muted'}
          />
          <KpiCard label="Endpoint-uri" value={stats.endpoints} icon={Server} />
          <KpiCard label="Total sesiuni" value={stats.total} icon={History} />
        </Page.Kpis>
      )}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 flex-1 min-h-0">
        {(showWebViewer && viewerCreds) && (
          <div ref={viewerPanelRef} className="lg:col-span-3">
            <Panel
              title="Ecran remote"
              subtitle={`Conectat la ID ${viewerCreds.id} · control în această pagină`}
              actions={activeSession ? (
                <Button variant="ghost" size="sm" onClick={() => void handleEndSession(activeSession.id)}>
                  Încheie sesiunea
                </Button>
              ) : undefined}
            >
              <RustDeskWebViewer
                rustdeskId={viewerCreds.id}
                password={viewerCreds.password}
                technicianName={user.full_name || user.username || 'Automatix'}
                technicianId={String(user.id)}
              />
            </Panel>
          </div>
        )}

        {activeSession && viewerCreds && !showWebViewer && externalViewerOk && (
          <div ref={viewerPanelRef} className="lg:col-span-3">
            <Panel title="Ecran remote" subtitle="Deschis în aplicația RustDesk (fereastră separată)">
              <div className="flex flex-col items-center gap-4 rounded-xl border border-status-green/30 bg-status-green/8 px-6 py-10 text-center">
                <Monitor className="h-12 w-12 text-status-green" />
                <div>
                  <p className="text-pm-md font-semibold text-content-primary">RustDesk rulează în altă fereastră</p>
                  <p className="mt-2 max-w-md text-pm-sm text-content-secondary">
                    Ecranul clientului nu apare în Automatix — căutați în taskbar fereastra <strong>RustDesk</strong> sau <strong>Automatix Remote</strong>.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => void relaunchExternalViewer()}>
                    <ExternalLink className="h-4 w-4" />
                    Redeschide RustDesk
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowWebViewer(true);
                      requestAnimationFrame(() => {
                        viewerPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      });
                    }}
                  >
                    Afișează aici în Automatix
                  </Button>
                </div>
              </div>
            </Panel>
          </div>
        )}

        {bundleInfo && !bundleInfo.available && (
          <div className="lg:col-span-3 flex items-start gap-2 rounded-xl border-l-2 border-status-amber bg-status-amber/8 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-status-amber" />
            <div className="min-w-0 text-pm-xs text-content-secondary">
              <p className="font-semibold text-content-primary">Instrumentul de suport nu este pe server</p>
              <p className="mt-1">
                Clienții nu pot descărca Promix-QuickSupport.exe. Pe server rulați{' '}
                <code className="text-pm-2xs">npm run support:prepare-bundle</code>
                {' '}sau copiați manual exe-ul în{' '}
                <code className="text-pm-2xs">{bundleInfo.dir || 'public/support/'}</code>.
              </p>
            </div>
          </div>
        )}
        {/* —— Quick support (primary) —— */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0 lg:overflow-y-auto lg:overscroll-contain">
          <Panel
            title="Suport rapid — client extern"
            subtitle="Pentru clienți fără Automatix · link temporar + instrument portabil"
          >
            {!activeQuick ? (
              <>
                <ol className="mb-5 grid gap-2 sm:grid-cols-2">
                  {WORKFLOW_STEPS.map((step, i) => (
                    <li
                      key={step}
                      className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-secondary/40 px-3 py-2.5"
                    >
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-pm-2xs font-bold text-accent tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-pm-xs text-content-secondary">{step}</span>
                    </li>
                  ))}
                </ol>

                <label className={LABEL}>Referință client (opțional)</label>
                <input
                  className={`${INPUT} mb-4`}
                  value={customerRef}
                  onChange={(e) => setCustomerRef(e.target.value)}
                  placeholder="ex. SC Exemplu SRL · tichet #123"
                />

                <div className="mb-4 flex items-start gap-2 rounded-xl border-l-2 border-status-blue bg-status-blue/8 px-3 py-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-blue" />
                  <p className="min-w-0 text-pm-2xs text-content-secondary">
                    Clientul primește un link public, descarcă Promix-QuickSupport.exe preconfigurat și vă comunică ID + parola afișate pe ecran.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCreateQuick()}
                  disabled={creatingQuick}
                  className={PRIMARY_CTA}
                >
                  {creatingQuick ? <Loader2 className="h-5 w-5 animate-spin" /> : <Link2 className="h-5 w-5" />}
                  {creatingQuick ? 'Se generează…' : 'Generează link pentru client'}
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge tone="warning" label="Link activ" size="sm" />
                  <span className="text-pm-2xs text-content-muted tabular-nums">
                    Expiră {fmtDt(activeQuick.expires_at)}
                  </span>
                </div>

                <div>
                  <label className={LABEL}>Link pentru client</label>
                  <div className="flex gap-2">
                    <input readOnly className={`${INPUT} font-mono text-pm-xs`} value={quickLink} />
                    <Button variant="outline" size="sm" onClick={() => void copyText(quickLink, 'link')} aria-label="Copiază link">
                      {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Mesaj pregătit de trimis</label>
                  <textarea readOnly rows={5} className={TEXTAREA} value={messageTemplate} />
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => void copyText(messageTemplate, 'msg')}>
                    {copied === 'msg' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Copiază mesajul
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-line/60 pt-4">
                  <Button variant="ghost" size="sm" onClick={() => void handleCancelQuick()}>
                    <XCircle className="h-4 w-4" />
                    Anulează link-ul
                  </Button>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Istoric sesiuni" subtitle="Ultimele sesiuni de suport">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={History}
                title="Nicio sesiune încă"
                description="Generați un link rapid sau conectați-vă la un endpoint înregistrat."
              />
            ) : (
              <ul className="space-y-1.5">
                {sessions.map((s) => {
                  const st = sessionTone(s.status);
                  return (
                    <li key={s.id} className={LIST_ROW}>
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-content-muted">
                        {s.session_type === 'ad_hoc' ? <Users className="h-4 w-4" /> : <Server className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-pm-sm font-medium text-content-primary">
                          {s.customer_ref || s.client_name || s.endpoint_name || `Sesiune #${s.id}`}
                        </span>
                        <span className="block truncate text-pm-2xs text-content-muted tabular-nums">
                          {fmtDt(s.started_at || s.created_at)}
                          {s.rustdesk_id ? ` · ID ${s.rustdesk_id}` : ''}
                          {s.started_by_name ? ` · ${s.started_by_name}` : ''}
                        </span>
                      </span>
                      <StatusBadge tone={st.tone} label={st.label} size="xs" />
                      {s.status === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => void handleEndSession(s.id)}>
                          Încheie
                        </Button>
                      )}
                      {s.status === 'pending' && s.quick_code && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveQuick({
                              session: s,
                              code: s.quick_code!,
                              path_hint: `/support/q/${s.quick_code}`,
                              expires_at: s.quick_expires_at || '',
                              message_template: '',
                            });
                            setConnectSessionId(s.id);
                          }}
                        >
                          Link
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* —— Connect + endpoints sidebar —— */}
        <div className="flex flex-col gap-6 min-h-0 lg:overflow-y-auto lg:overscroll-contain">
          <Panel title="Conectare" subtitle="Introduceți ID + parola de la client">
            <label className={LABEL}>Unde vrei să vezi ecranul</label>
            <div className="mb-4">
              <Segmented
                ariaLabel="Mod vizualizare"
                value={viewerTarget}
                onChange={(v) => setViewerTarget(v as ViewerTarget)}
                options={[
                  { id: 'in-app', label: 'În Automatix' },
                  ...(isDesktop ? [{ id: 'rustdesk-app', label: 'Fereastră RustDesk' }] : []),
                ]}
              />
            </div>
            <p className="mb-4 text-pm-2xs text-content-muted">
              {viewerTarget === 'in-app'
                ? 'Ecranul apare în panoul „Ecran remote” de sus, în această pagină.'
                : 'Se deschide aplicația RustDesk instalată pe PC-ul tău (fereastră separată).'}
            </p>

            <label className={LABEL}>ID RustDesk</label>
            <input
              className={`${INPUT} mb-4 font-mono`}
              value={connectId}
              onChange={(e) => setConnectId(e.target.value)}
              placeholder="123 456 789"
              autoComplete="off"
            />

            <label className={LABEL}>Parolă (o singură dată)</label>
            <input
              type="password"
              className={`${INPUT} mb-4`}
              value={connectPassword}
              onChange={(e) => setConnectPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
            />

            {!isDesktop && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border-l-2 border-status-blue bg-status-blue/8 px-3 py-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-blue" />
                <p className="min-w-0 text-pm-2xs text-content-secondary">
                  În browser, ecranul remote apare direct în pagină (modul „În Automatix”).
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={connecting || !connectId.trim() || !connectPassword}
              className={PRIMARY_CTA}
            >
              {connecting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isDesktop ? (
                <PlugZap className="h-5 w-5" />
              ) : (
                <Plug className="h-5 w-5" />
              )}
              {connecting ? 'Se conectează…' : viewerTarget === 'in-app' ? 'Conectează — arată ecranul aici' : 'Conectează — deschide RustDesk'}
            </button>

            {activeSession && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-status-green/30 bg-status-green/8 px-3 py-2.5">
                <span className="text-pm-xs font-medium text-content-primary">
                  Sesiune activă #{activeSession.id}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void handleEndSession(activeSession.id)}>
                  Încheie
                </Button>
              </div>
            )}

          </Panel>

          <Panel
            title="Endpoint-uri înregistrate"
            subtitle="Mașini cunoscute · uzine, clienți recurenți"
            actions={(
              <Button
                size="sm"
                variant={showEpForm ? 'primary' : 'outline'}
                onClick={() => {
                  setShowEpForm((v) => !v);
                  if (showEpForm) {
                    setEpEditing(null);
                    setEpForm({ name: '', rustdesk_id: '', notes: '', password_hint: '' });
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {showEpForm ? 'Închide' : 'Adaugă'}
              </Button>
            )}
          >
            {showEpForm && (
              <div className="mb-4 space-y-3 rounded-xl border border-dashed border-line bg-surface-secondary/30 p-3">
                <p className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">
                  {epEditing ? 'Editare endpoint' : 'Endpoint nou'}
                </p>
                <input
                  className={INPUT}
                  placeholder="Nume (ex. Uzina Cluj)"
                  value={epForm.name}
                  onChange={(e) => setEpForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  className={`${INPUT} font-mono`}
                  placeholder="ID RustDesk"
                  value={epForm.rustdesk_id}
                  onChange={(e) => setEpForm((f) => ({ ...f, rustdesk_id: e.target.value }))}
                />
                <input
                  className={INPUT}
                  placeholder="Indiciu parolă (opțional)"
                  value={epForm.password_hint}
                  onChange={(e) => setEpForm((f) => ({ ...f, password_hint: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void saveEndpoint()} disabled={savingEp}>
                    {savingEp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {epEditing ? 'Salvează' : 'Adaugă'}
                  </Button>
                  {epEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEpEditing(null);
                        setEpForm({ name: '', rustdesk_id: '', notes: '', password_hint: '' });
                      }}
                    >
                      Anulează
                    </Button>
                  )}
                </div>
              </div>
            )}

            {endpoints.length === 0 ? (
              <EmptyState
                icon={Server}
                title="Niciun endpoint"
                description="Adăugați mașini cu RustDesk instalat permanent."
                action={!showEpForm ? (
                  <Button size="sm" variant="outline" onClick={() => setShowEpForm(true)}>
                    <Plus className="h-4 w-4" />
                    Adaugă primul endpoint
                  </Button>
                ) : undefined}
              />
            ) : (
              <ul className="space-y-1.5">
                {endpoints.map((ep) => (
                  <li key={ep.id} className={LIST_ROW}>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-content-muted">
                      <MonitorSmartphone className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-pm-sm font-medium text-content-primary">{ep.name}</span>
                      <span className="block truncate font-mono text-pm-2xs text-content-muted">{ep.rustdesk_id}</span>
                      {ep.client_name && (
                        <span className="block truncate text-pm-2xs text-content-muted">{ep.client_name}</span>
                      )}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => connectToEndpoint(ep)} title="Folosește ID">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => startEditEndpoint(ep)} title="Editează">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void deleteEndpoint(ep.id)} title="Șterge">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
}
