import { useState, useEffect } from 'react';
import type { CSSProperties, Ref } from 'react';
import {
  ChevronLeft, ChevronRight, Bell, Search, LogOut, ChevronDown,
  PanelLeft, PanelLeftClose, Maximize2, Settings,
} from '@/icons';
import { useLayoutStore } from '@/store/layoutStore';
import TimeTrackerPill from '@/components/TimeTrackerPill';
import WindowControls from './WindowControls';
import TitlebarPageActions from './TitlebarPageActions';
import GearLogo from '@/components/ui/GearLogo';
import { getInitials } from './search-types';
import { useAuthStore } from '@/store/authStore';
import { avatarUrl } from '@/lib/avatar';
import { useResponsivePreview } from '@/redesign/ui/ResponsivePreview';
import { PAGE_IDS } from '@/config/constants';

interface TitlebarProps {
  contextLabel?: string;
  onBack?: () => void;
  canGoForward?: boolean;
  onForward?: () => void;
  userName?: string;
  roleName?: string;
  jobTitle?: string | null;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  onSearchClick?: () => void;
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  onSearchFocus?: () => void;
  searchOpen?: boolean;
  searchInputRef?: Ref<HTMLInputElement>;
  searchAnchorRef?: Ref<HTMLDivElement>;
  onLogout?: () => void;
  onHome?: () => void;
  onNavToggle?: () => void;
  navOpen?: boolean;
  onNavigateToPage?: (pageId: string) => void;
}

const drag = { WebkitAppRegion: 'drag' } as CSSProperties;
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties;

export default function Titlebar({
  contextLabel, onBack, canGoForward, onForward,
  userName = '', roleName = '', jobTitle,
  notificationCount = 0,
  onNotificationsClick, onSearchClick, onLogout, onHome,
  searchValue = '', onSearchValueChange, onSearchFocus, searchOpen = false,
  searchInputRef, searchAnchorRef,
  onNavToggle, navOpen = true,
  onNavigateToPage,
}: TitlebarProps) {
  const authUser = useAuthStore((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const avatar = avatarUrl(authUser);
  const initials = getInitials(userName || '?');
  const { togglePreview } = useResponsivePreview();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const shellBtn = 'titlebar-icon-btn';

  const navLabel = navOpen ? 'Închide meniul' : 'Deschide meniul';

  const windowTitle = contextLabel ? `Automatix — ${contextLabel}` : 'Automatix';

  return (
    <header
      style={drag}
      data-tauri-drag-region
      aria-label={windowTitle}
      className="shell-titlebar relative z-30 shrink-0 select-none bg-[#2d2d2d] text-white border-b border-white/[0.08]"
    >
      {/* Mobile app bar */}
      <div data-tauri-drag-region className="flex h-14 items-center gap-2 px-3 sm:hidden">
        <button
          type="button"
          style={noDrag}
          onClick={onNavToggle ?? (() => useLayoutStore.getState().toggleSidebar())}
          title={`${navLabel} (Ctrl+\\)`}
          aria-label={navLabel}
          aria-expanded={navOpen}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.08] text-white transition-smooth duration-150 active:bg-white/14 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {navOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>
        {onBack && (
          <button type="button" aria-label="Înapoi" onClick={onBack} style={noDrag} className={shellBtn}>
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onHome}
          style={noDrag}
          title="Acasă"
          aria-label="Acasă"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-smooth duration-150 active:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <GearLogo size={20} className="shrink-0 brightness-0 invert" />
          <span className="min-w-0">
            <span className="block truncate text-pm-sm font-bold tracking-tight text-white">Automatix</span>
            {contextLabel && (
              <span className="block truncate text-pm-2xs text-white/55">{contextLabel}</span>
            )}
          </span>
        </button>
        {onSearchClick && (
          <button
            type="button"
            onClick={onSearchClick}
            style={noDrag}
            data-global-search-anchor="true"
            aria-label="Caută"
            title="Caută (Ctrl+K)"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.08] text-white/80 transition-smooth duration-150 active:bg-white/14 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
        {onNotificationsClick && (
          <button type="button" onClick={onNotificationsClick} aria-label="Notificări" title="Notificări" style={noDrag} className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.08] text-white/80 transition-smooth duration-150 active:bg-white/14 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-red px-1 text-[8px] font-bold leading-none text-white tabular-nums">
                {notificationCount > 99 ? '99' : notificationCount}
              </span>
            )}
          </button>
        )}
        {onNavigateToPage && (
          <button
            type="button"
            onClick={() => onNavigateToPage(PAGE_IDS.SETTINGS)}
            aria-label="Setări"
            title="Setări"
            style={noDrag}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.08] text-white/80 transition-smooth duration-150 active:bg-white/14 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Cont"
          aria-expanded={menuOpen}
          style={noDrag}
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.08] text-pm-2xs font-bold text-white transition-smooth duration-150 active:bg-white/14 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
        </button>
      </div>

      {/* Desktop titlebar — VS Code integrated style */}
      <div
        data-tauri-drag-region
        className="titlebar-desktop hidden sm:flex"
      >
        {/* Left: icon + menus + nav */}
        <div data-tauri-drag-region className="titlebar-left overflow-hidden">
          <button
            type="button"
            onClick={onHome}
            style={noDrag}
            title="Acasă"
            aria-label="Acasă"
            className="titlebar-icon-btn ml-0.5"
          >
            <GearLogo size={15} className="shrink-0 brightness-0 invert opacity-90" />
          </button>

          <TitlebarPageActions />

          <span className="mx-1.5 hidden h-3.5 w-px bg-white/12 lg:inline" aria-hidden />

          <div style={noDrag} className="hidden items-center gap-0.5 md:flex">
            <button
              type="button"
              disabled={!onBack}
              onClick={onBack}
              aria-label="Înapoi"
              title="Înapoi"
              className={`${shellBtn} disabled:opacity-30`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={canGoForward === false}
              onClick={onForward ?? (() => window.history.forward())}
              aria-label="Înainte"
              title="Înainte"
              className={`${shellBtn} disabled:opacity-30`}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Center: search (visually centered between equal left/right slots) */}
        <div data-tauri-drag-region className="titlebar-center">
          <div style={noDrag} className="titlebar-search-wrap">
            <div
              ref={searchAnchorRef}
              data-global-search-anchor="true"
              data-search-open={searchOpen ? 'true' : 'false'}
              className="titlebar-search"
            >
              <Search className={`h-3 w-3 shrink-0 ${searchOpen ? 'text-white/80' : 'text-white/50'}`} strokeWidth={2.25} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onFocus={onSearchFocus ?? onSearchClick}
                onMouseDown={onSearchFocus ?? onSearchClick}
                onChange={(e) => onSearchValueChange?.(e.target.value)}
                placeholder="Caută…"
                aria-label="Caută"
                className="titlebar-search-input"
              />
              <kbd className={`shell-search-kbd hidden shrink-0 xl:inline ${searchOpen ? 'border-white/28 text-white/70' : 'text-white/50'}`}>
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: actions + window controls */}
        <div style={noDrag} className="titlebar-actions">
          <div className="titlebar-primary-actions">
            <button
              type="button"
              onClick={onNavToggle ?? (() => useLayoutStore.getState().toggleSidebar())}
              title={navOpen ? 'Ascunde bara laterală (Ctrl+\\)' : 'Arată bara laterală (Ctrl+\\)'}
              aria-label={navOpen ? 'Ascunde bara laterală' : 'Arată bara laterală'}
              aria-expanded={navOpen}
              className={`${shellBtn} titlebar-sidebar-toggle`}
            >
              {navOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="hidden items-center sm:flex">
            <TimeTrackerPill />
          </div>

          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={togglePreview}
              title="Preview responsive"
              className={shellBtn}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}

          {onNotificationsClick && (
            <button
              type="button"
              onClick={onNotificationsClick}
              aria-label="Notificări"
              title="Notificări"
              className={shellBtn}
            >
              <Bell className="h-3.5 w-3.5" />
              {notificationCount > 0 && (
                <span className="titlebar-notify-badge">
                  {notificationCount > 99 ? '99' : notificationCount}
                </span>
              )}
            </button>
          )}

          {onNavigateToPage && (
            <button
              type="button"
              onClick={() => onNavigateToPage(PAGE_IDS.SETTINGS)}
              aria-label="Setări"
              title="Setări (Ctrl+,)"
              className={shellBtn}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Cont"
            aria-expanded={menuOpen}
            className="mx-0.5 flex h-7 items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 transition-smooth duration-150 hover:bg-white/10 active:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/15 text-pm-2xs font-bold text-white">
              {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
            </span>
            <ChevronDown className={`hidden h-3 w-3 text-white/60 transition-transform duration-150 lg:block ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className="titlebar-window-controls">
            <WindowControls />
          </div>
        </div>
      </div>

      {/* User dropdown */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setMenuOpen(false)} aria-hidden style={noDrag} />
          <div
            style={noDrag}
            className="fixed right-2 top-[calc(var(--shell-titlebar-h-mobile)+4px)] z-[60] w-60 origin-top-right overflow-hidden rounded-lg border border-line bg-surface-elevated text-content-primary shadow-[var(--elevation-3)] sm:right-1 sm:top-[calc(var(--shell-titlebar-h)+4px)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-pm-sm font-bold text-accent">
                {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-pm-sm font-semibold leading-tight">{userName || 'Utilizator'}</p>
                {(jobTitle || roleName) && (
                  <p className="truncate text-pm-2xs leading-tight text-content-muted">{jobTitle || roleName}</p>
                )}
              </div>
            </div>
            <div className="py-1">
              {onLogout && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onLogout(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-pm-sm text-status-red transition-smooth duration-150 hover:bg-status-red/10 active:bg-status-red/15 focus:outline-none focus-visible:bg-status-red/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Deconectare
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
