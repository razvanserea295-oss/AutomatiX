import { lazy, Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  ChevronDown, ChevronRight, X, Bell, Settings, LogOut,
  GitBranch, Wifi, Circle, Search, PanelLeft, PanelBottom, HelpCircle,
  AlertCircle, Info, CheckCheck, CircleDot,
} from '@/icons';
import './hybridShell.css';
import { type SidebarItem } from '@/components/shell/WorkspacePanel';
import { type SearchHit } from '@/components/shell/search-types';
import { getWorkspaceSubpages } from '@/config/workspaceNav';
import { useLayoutStore } from '@/store/layoutStore';
import { useUserNotificationsStore, type UserNotification } from '@/store/userNotificationsStore';
import { normalizeRole } from '@/lib/access';
import { useAccentStore } from '@/store/accentStore';

// Map a notification "kind" to a severity dot colour
function severityColor(kind: string): string {
  const k = (kind || '').toLowerCase();
  if (/error|fail|overdue|reject|expir|scaden|alert|critical/.test(k)) return '#f14c4c';
  if (/warn|due|pending|review|stale/.test(k)) return '#cca700';
  return '#3794ff';
}
function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay
      ? d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' });
  } catch { return ''; }
}

const CommandPalette = lazy(() => import('@/components/shell/CommandPalette'));

interface HybridShellProps {
  title: string;
  userName: string;
  roleName?: string;
  notificationCount?: number;
  navbarItems: SidebarItem[];
  onSearchNavigate?: (hit: SearchHit) => void;
  onNotificationsClick?: () => void;
  onNavigateToPage?: (pageId: string) => void;
  onOpenShortcuts?: () => void;
  onLogout: () => void;
  children: ReactNode;
}

function segOf(path: string): string {
  return path.split('/').filter(Boolean)[0] ?? '';
}

export default function HybridShell({
  title, userName, roleName = '', notificationCount = 0,
  navbarItems, onSearchNavigate, onNotificationsClick, onNavigateToPage,
  onOpenShortcuts, onLogout, children,
}: HybridShellProps) {
  const [location, navigate] = useLocation();
  const accent = useAccentStore(s => s.accent);

  const commandPaletteOpen = useLayoutStore((s) => s.commandPaletteOpen);
  const openCommandPalette = useLayoutStore((s) => s.openCommandPalette);
  const closeCommandPalette = useLayoutStore((s) => s.closeCommandPalette);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [treeExpanded, setTreeExpanded] = useState(true);
  const [paletteRequested, setPaletteRequested] = useState(false);
  const [clock, setClock] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'problems' | 'activity'>('problems');

  const notifItems = useUserNotificationsStore((s) => s.items);
  const notifUnread = useUserNotificationsStore((s) => s.unread);
  const refreshNotifs = useUserNotificationsStore((s) => s.refresh);
  const markRead = useUserNotificationsStore((s) => s.markRead);
  const markAllRead = useUserNotificationsStore((s) => s.markAllRead);

  useEffect(() => { if (commandPaletteOpen) setPaletteRequested(true); }, [commandPaletteOpen]);

  useEffect(() => { if (panelOpen) void refreshNotifs(); }, [panelOpen, refreshNotifs]);

  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);
  const problemRows = panelTab === 'problems' ? notifItems.filter((n) => !n.read) : notifItems;
  const openProblem = useCallback((n: UserNotification) => {
    if (!n.read) void markRead(n.id);
    if (n.link_page) navigate(n.link_page.startsWith('/') ? n.link_page : `/${n.link_page}`);
  }, [markRead, navigate]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const iv = setInterval(tick, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); setSidebarOpen((v) => !v); }
      else if (e.key === 'j' || e.key === 'J') { e.preventDefault(); setPanelOpen((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activeItem = navbarItems.find((i) => i.isActive) ?? navbarItems[0];
  const activeWorkspaceId = activeItem?.id ?? '';
  const role = normalizeRole(roleName);

  const treeRows = useMemo(() => {
    const subs = getWorkspaceSubpages(activeWorkspaceId, role);
    if (subs.length > 0) return subs.map((s) => ({ id: s.id, label: s.label, icon: s.icon, path: `/${s.id}` }));
    if (activeItem) return [{ id: activeItem.id, label: activeItem.label, icon: activeItem.icon, path: activeItem.id === 'dashboard' ? '/' : `/${activeItem.id}` }];
    return [];
  }, [activeWorkspaceId, role, activeItem]);

  const currentSeg = segOf(location);

  const goTab = useCallback((path: string) => { if (path !== location) navigate(path); }, [location, navigate]);

  return (
    <div className="hybrid-root flex flex-col h-dvh-app w-full overflow-hidden">
      {/* Title bar — functional controls with accent color highlight */}
      <header className="vsc-titlebar">
        <button type="button" className="vsc-titlebar-btn" onClick={() => setSidebarOpen((v) => !v)} title="Comută bara laterală (Ctrl+B)">
          <PanelLeft className="h-3.5 w-3.5" />
        </button>
        <button type="button" className="vsc-titlebar-btn" onClick={togglePanel} title="Comută panoul De rezolvat (Ctrl+J)" style={{ position: 'relative' }} data-active={panelOpen}>
          <PanelBottom className="h-3.5 w-3.5" />
        </button>
        <span className="vsc-menu font-semibold" style={{ color: accent || '#ffffff' }}>automatiX</span>
        <button type="button" className="vsc-cmdbox" onClick={openCommandPalette} title="Caută / Paletă de comenzi (Ctrl+K)">
          <Search className="h-3 w-3" />
          <span>{title || 'Caută pagini, acțiuni…'}</span>
        </button>
        <button type="button" className="vsc-titlebar-btn" onClick={onNotificationsClick} title="Notificări" style={{ position: 'relative' }}>
          <Bell className="h-3.5 w-3.5" />
          {notificationCount > 0 && <span className="vsc-activity-badge" style={{ right: 2, bottom: 2 }}>{notificationCount > 99 ? '99+' : notificationCount}</span>}
        </button>
        <button type="button" className="vsc-titlebar-btn" onClick={onOpenShortcuts} title="Scurtături de tastatură (Shift+?)">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* Body: activity bar + sidebar + editor */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Activity bar */}
        <nav className="vsc-activitybar" aria-label="Activity Bar">
          <div className="flex flex-1 flex-col items-center">
            {navbarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="vsc-activity-btn"
                  data-active={item.isActive}
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => { if (item.isActive) setSidebarOpen((v) => !v); else item.onClick(); }}
                >
                  {Icon ? <Icon className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                  {item.badge ? <span className="vsc-activity-badge">{item.badge > 99 ? '99+' : item.badge}</span> : null}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col items-center">
            <button type="button" className="vsc-activity-btn" title="Setări" aria-label="Setări" onClick={() => onNavigateToPage?.('settings')}>
              <Settings className="h-6 w-6" />
            </button>
            <button type="button" className="vsc-activity-btn" title="Deconectare" aria-label="Deconectare" onClick={onLogout}>
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </nav>

        {/* Side bar (Explorer) */}
        {sidebarOpen && (
          <aside className="vsc-sidebar">
            <div className="vsc-sidebar-title">
              <span>Navigare</span>
            </div>

            {/* WORKSPACE TREE */}
            <div className="vsc-section flex-1 min-h-0" style={{ overflowY: 'auto' }}>
              <button type="button" className="vsc-section-header" onClick={() => setTreeExpanded((v) => !v)}>
                {treeExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span>{activeItem?.label ?? 'Spațiu de lucru'}</span>
              </button>
              {treeExpanded && treeRows.map((row) => {
                const Icon = row.icon;
                const active = row.id === 'dashboard' ? location === '/' : currentSeg === row.id;
                return (
                  <button key={row.id} type="button" className="vsc-row" data-active={active} onClick={() => goTab(row.path)} title={row.label}>
                    {Icon ? <Icon className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                    <span className="vsc-row-label">{row.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Editor */}
        <main className="vsc-editor relative isolate flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
          <div className="hybrid-editor-content flex flex-1 flex-col min-h-0 overflow-hidden">
            {children}
          </div>

          {/* Bottom panel — Probleme / Activitate */}
          {panelOpen && (
            <section className="vsc-panel">
              <div className="vsc-panel-header">
                <button type="button" className="vsc-panel-tab" data-active={panelTab === 'problems'} onClick={() => setPanelTab('problems')}>
                  De rezolvat {notifUnread > 0 && <span style={{ background: '#e0564f', color: '#fff', borderRadius: 8, padding: '0 6px', fontSize: 10 }}>{notifUnread}</span>}
                </button>
                <button type="button" className="vsc-panel-tab" data-active={panelTab === 'activity'} onClick={() => setPanelTab('activity')}>
                  Activitate
                </button>
                <div className="vsc-panel-actions">
                  <button type="button" className="vsc-panel-action" title="Marchează tot citit" onClick={() => void markAllRead()}><CheckCheck className="h-4 w-4" /></button>
                  <button type="button" className="vsc-panel-action" title="Închide panoul (Ctrl+J)" onClick={() => setPanelOpen(false)}><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="vsc-panel-body">
                {problemRows.length === 0 ? (
                  <div className="vsc-panel-empty">
                    {panelTab === 'problems' ? 'Nimic de rezolvat — totul este la zi.' : 'Nicio activitate recentă.'}
                  </div>
                ) : problemRows.map((n) => {
                  const SevIcon = /error|fail|overdue|reject|expir|scaden|alert|critical/.test((n.kind || '').toLowerCase())
                    ? AlertCircle : /warn|due|pending|review|stale/.test((n.kind || '').toLowerCase()) ? CircleDot : Info;
                  return (
                    <button key={n.id} type="button" className="vsc-prob" onClick={() => openProblem(n)} title={n.link_page ? 'Deschide' : undefined}>
                      <SevIcon className="h-4 w-4 shrink-0" style={{ color: severityColor(n.kind), marginTop: 1 }} />
                      <span className="min-w-0" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span className="vsc-prob-title" style={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</span>
                        {n.message && <span className="vsc-prob-msg"> — {n.message}</span>}
                      </span>
                      <span className="vsc-prob-time">{fmtTime(n.created_at)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Status bar — with accent color highlighting */}
      <footer className="vsc-statusbar">
        <button type="button" className="vsc-status-item" onClick={() => onNavigateToPage?.('settings')} title={userName}>
          <GitBranch className="h-3.5 w-3.5" />
          <span>{userName}{role ? ` · ${role}` : ''}</span>
        </button>
        <button type="button" className="vsc-status-item" onClick={togglePanel} title="De rezolvat (Ctrl+J)">
          <AlertCircle className="h-3.5 w-3.5" /> {notifUnread}
        </button>
        <span className="vsc-status-item"><Wifi className="h-3.5 w-3.5" /> Conectat</span>
        <div className="flex-1" />
        <button type="button" className="vsc-status-item" onClick={onNotificationsClick} title="Notificări">
          <Bell className="h-3.5 w-3.5" />{notificationCount > 0 ? notificationCount : ''}
        </button>
        <span className="vsc-status-item" style={{ color: accent || '#cccccc' }}>{clock}</span>
        <span className="vsc-status-item">UTF-8</span>
        <span className="vsc-status-item">Română</span>
        <span className="vsc-status-item">v{__APP_VERSION__}</span>
      </footer>

      {paletteRequested && (
        <Suspense fallback={null}>
          <CommandPalette
            open={commandPaletteOpen}
            onClose={closeCommandPalette}
            onSearchNavigate={onSearchNavigate}
            onNavigatePage={onNavigateToPage}
            onOpenShortcuts={onOpenShortcuts}
          />
        </Suspense>
      )}
    </div>
  );
}