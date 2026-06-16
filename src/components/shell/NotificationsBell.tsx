




















import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, CheckCheck, Loader2, Inbox } from 'lucide-react';
import { useUserNotificationsStore, type UserNotification } from '@/store/userNotificationsStore';
import { useNotificationStore } from '@/store/notificationStore';

interface Props {
  
  onNavigate?: (pageId: string) => void;
  

  onEmptyClick?: () => void;
}

function relativeTime(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const diffSec = Math.max(1, Math.floor((Date.now() - t) / 1000));
    if (diffSec < 60)        return `acum ${diffSec}s`;
    if (diffSec < 3600)      return `acum ${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86_400)    return `acum ${Math.floor(diffSec / 3600)}h`;
    if (diffSec < 7 * 86_400) return `acum ${Math.floor(diffSec / 86_400)}z`;
    return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

export default function NotificationsBell({ onNavigate, onEmptyClick }: Props) {
  const items = useUserNotificationsStore((s) => s.items);
  const unread = useUserNotificationsStore((s) => s.unread);
  const loading = useUserNotificationsStore((s) => s.loading);
  const refresh = useUserNotificationsStore((s) => s.refresh);
  const markRead = useUserNotificationsStore((s) => s.markRead);
  const markAllRead = useUserNotificationsStore((s) => s.markAllRead);
  const localUnread = useNotificationStore((s) => s.unreadCount);

  const totalBadge = unread + localUnread;
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  
  useEffect(() => {
    if (!open) { setAnchor(null); return; }
    const measure = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (!r) return;
      
      const PANEL_W = 360;
      setAnchor({ left: Math.max(8, r.right - PANEL_W), top: r.bottom + 4 });
    };
    
    
    let raf = 0;
    const onMove = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; measure(); });
    };
    measure();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleBellClick = () => {
    
    
    
    if (!open && items.length === 0 && totalBadge === 0 && onEmptyClick) {
      onEmptyClick();
      return;
    }
    setOpen((v) => !v);
    if (!open) void refresh();
  };

  const handleItemClick = (n: UserNotification) => {
    void markRead(n.id);
    if (n.link_page && onNavigate) onNavigate(n.link_page);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleBellClick}
        title="Notificări"
        aria-label="Notificări"
        aria-expanded={open}
        className="relative flex items-center justify-center h-8 w-8 text-content-muted hover:text-content-primary hover:bg-surface-nav-hover transition-colors"
      >
        <Bell className="h-3.5 w-3.5" />
        {totalBadge > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center h-3 min-w-[12px] px-0.5 rounded-full bg-status-red text-white text-[8px] font-bold leading-none tabular-nums">
            {totalBadge > 99 ? '99' : totalBadge}
          </span>
        )}
      </button>

      {open && anchor && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Lista notificări"
          style={{ position: 'fixed', left: anchor.left, top: anchor.top, zIndex: 9999 }}
          className="w-[360px] max-h-[480px] bg-surface-primary border border-line shadow-lg rounded-md overflow-hidden flex flex-col"
        >
          {}
          <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-surface-secondary">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-content-muted" />
              <span className="text-pm-sm font-semibold text-content-primary">Notificări</span>
              {unread > 0 && (
                <span className="text-pm-2xs bg-accent/15 text-accent px-1.5 py-0.5 rounded">
                  {unread} necitite
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                title="Marchează toate ca citite"
                className="flex items-center gap-1 text-pm-2xs text-content-muted hover:text-content-primary px-1.5 py-1 rounded hover:bg-surface-tertiary transition-colors"
              >
                <CheckCheck className="h-3 w-3" /> Toate citite
              </button>
            )}
          </div>

          {}
          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-content-muted" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Inbox className="h-8 w-8 text-content-muted mb-2" />
                <p className="text-pm-sm text-content-muted">Nicio notificare</p>
                <p className="text-pm-2xs text-content-muted/70 mt-1">
                  Aici apar briefing-uri, comenzi de piese și mențiuni.
                </p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left px-3 py-2.5 border-b border-line/50 last:border-b-0 transition-colors ${
                    n.read ? 'hover:bg-surface-tertiary' : 'bg-accent/5 hover:bg-accent/10'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-label="necitit" />
                    )}
                    {n.read && (
                      <Check className="h-3 w-3 mt-0.5 text-content-muted/50 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-pm-xs ${n.read ? 'text-content-secondary' : 'text-content-primary font-semibold'} line-clamp-2`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-pm-2xs text-content-muted mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-pm-2xs text-content-muted/70 mt-1">{relativeTime(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
