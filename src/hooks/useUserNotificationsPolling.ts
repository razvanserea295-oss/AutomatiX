
















import { useEffect, useRef } from 'react';
import { useUserNotificationsStore, type UserNotification } from '@/store/userNotificationsStore';
import { toast } from '@/store/toastStore';

const POLL_MS = 30_000; 

function toastFor(n: UserNotification) {
  
  
  
  const variant: 'info' | 'success' | 'warning' = (() => {
    if (n.kind === 'briefing_rejected' || n.kind === 'piece_order_cancelled' || n.kind === 'briefing_cancelled') return 'warning';
    if (n.kind === 'piece_order_arrived' || n.kind === 'briefing_accepted' || n.kind === 'briefing_completed') return 'success';
    return 'info';
  })();
  const body = `${n.title}\n${n.message}`;
  if (variant === 'success') toast.success(body);
  else if (variant === 'warning') toast.warning(body);
  else toast.info(body);
}

export function useUserNotificationsPolling(enabled: boolean) {
  const refresh = useUserNotificationsStore((s) => s.refresh);
  const bumpSeenId = useUserNotificationsStore((s) => s.bumpSeenId);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      if (document.hidden) return;
      const items = await refresh();
      if (cancelled) return;

      
      
      const state = useUserNotificationsStore.getState();
      const maxId = items.reduce((m, n) => (n.id > m ? n.id : m), 0);
      if (!initializedRef.current) {
        initializedRef.current = true;
        if (maxId > 0) bumpSeenId(maxId);
        return;
      }

      
      
      const fresh = items
        .filter((n) => !n.read && n.id > state.lastSeenId)
        .sort((a, b) => a.id - b.id);
      for (const n of fresh) toastFor(n);
      if (fresh.length > 0) bumpSeenId(fresh[fresh.length - 1].id);
    };

    void tick();
    timer = setInterval(tick, POLL_MS);
    const onVisible = () => { if (!document.hidden) void tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    
    
    
  }, [enabled, refresh, bumpSeenId]);
}
