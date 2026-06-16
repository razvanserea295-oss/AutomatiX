import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Bell, Search, LogOut, ChevronDown } from 'lucide-react';
import TimeTrackerPill from '@/components/TimeTrackerPill';
import WindowControls from './WindowControls';
import GearLogo from '@/components/ui/GearLogo';
import { getInitials } from './search-types';
import { useAuthStore } from '@/store/authStore';
import { avatarUrl } from '@/lib/avatar';

interface TitlebarProps {
  title?: string;
  onBack?: () => void;
  
  userName?: string;
  roleName?: string;
  jobTitle?: string | null;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  onSearchClick?: () => void;
  onLogout?: () => void;
  
  onHome?: () => void;
}

const drag = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;







export default function Titlebar({
  title, onBack,
  userName = '', roleName = '', jobTitle, notificationCount = 0,
  onNotificationsClick, onSearchClick, onLogout, onHome,
}: TitlebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);

  
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const initials = getInitials(userName || '?');
  const avatar = avatarUrl(useAuthStore(s => s.user));
  const shellBtn =
    'inline-flex h-8 w-8 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

  return (
    <header
      style={drag}
      data-tauri-drag-region
      className="relative z-30 grid h-11 shrink-0 select-none grid-cols-[1fr_minmax(0,30rem)_1fr] items-center bg-[#1A1B1D] pl-2 pr-0 text-white border-b border-white/5"
    >
      {}
      <div data-tauri-drag-region className="flex min-w-0 items-center gap-1">
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
          className="flex min-w-0 items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {
}
          <GearLogo size={18} className="shrink-0 brightness-0 invert" />
          <span className="text-[13px] font-semibold tracking-tight text-white">Automatix</span>
          {title && (
            <>
              <span className="text-white/30">/</span>
              <span className="truncate text-[12px] text-white/70">{title}</span>
            </>
          )}
        </button>
      </div>

      {}
      <div data-tauri-drag-region className="flex justify-center px-2">
        {onSearchClick && (
          <button
            type="button"
            onClick={onSearchClick}
            style={noDrag}
            className="group flex h-7 w-full items-center gap-2 rounded-md border border-white/15 bg-white/10 px-2.5 text-left text-[12px] text-white/70 transition-colors hover:bg-white/15 hover:border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-white/60" />
            <span className="flex-1 truncate">Caută aplicații, acțiuni, pagini…</span>
            <kbd className="hidden shrink-0 rounded border border-white/20 bg-white/5 px-1 py-px text-[9px] font-medium text-white/55 sm:inline">Ctrl K</kbd>
          </button>
        )}
      </div>

      {}
      <div style={noDrag} className="flex items-center justify-end gap-0.5 pr-0">
        <TimeTrackerPill />
        <span className="mx-1 h-4 w-px bg-white/15" />

        {onNotificationsClick && (
          <button type="button" onClick={onNotificationsClick} aria-label="Notificări" title="Notificări" className={`relative ${shellBtn}`}>
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-status-red px-0.5 text-[8px] font-bold leading-none text-white tabular-nums">
                {notificationCount > 99 ? '99' : notificationCount}
              </span>
            )}
          </button>
        )}

        {
}
        <button
          ref={avatarRef}
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Cont"
          aria-expanded={menuOpen}
          className="ml-0.5 flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white overflow-hidden">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
          </span>
          <ChevronDown className="h-3 w-3 text-white/60" />
        </button>

        {

}
        <WindowControls />
      </div>

      {}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setMenuOpen(false)} aria-hidden style={noDrag} />
          <div
            style={noDrag}
            className="fixed right-1 top-[46px] z-[60] w-60 overflow-hidden rounded-md border border-line bg-surface-elevated text-content-primary shadow-[var(--elevation-3)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-pm-sm font-bold text-accent overflow-hidden">
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
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-pm-sm text-status-red transition-colors hover:bg-status-red/10"
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
