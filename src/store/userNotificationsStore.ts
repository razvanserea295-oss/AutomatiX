/**
 * Backend-backed user notifications store.
 *
 * The pre-existing `notificationStore.ts` is an in-memory store for
 * production-monitoring banners that the page emits locally (deadline
 * approaching, piece completed, etc). That store does NOT survive
 * reloads and is unrelated to the DB-backed `user_notifications`
 * table.
 *
 * This store wraps the backend notifications:
 *   - `items`     — latest N rows (default 30) for the bell-panel list.
 *   - `unread`    — global unread count (across ALL rows, not just the
 *                   page) — drives the bell badge.
 *   - `lastSeenId` — the largest id we've already showed a toast for,
 *                   so polling doesn't re-toast the same notification
 *                   on every refresh.
 *
 * Polling is owned by `useUserNotificationsPolling.ts` which calls
 * `refresh()` on an interval (and on tab focus) and emits a toast for
 * any new ids it discovers.
 */

import { create } from 'zustand';
import { apiCommand } from '@/api/commands';

export interface UserNotification {
  id: number;
  user_id: number;
  kind: string;
  title: string;
  message: string;
  link_page: string | null;
  read: boolean;
  created_at: string;
  read_at: string | null;
}

interface ListResponse {
  items: UserNotification[];
  unread: number;
}

interface UserNotificationsState {
  items: UserNotification[];
  unread: number;
  lastSeenId: number;
  loading: boolean;
  



  bumpSeenId: (id: number) => void;
  refresh: () => Promise<UserNotification[]>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useUserNotificationsStore = create<UserNotificationsState>((set, get) => ({
  items: [],
  unread: 0,
  lastSeenId: 0,
  loading: false,

  bumpSeenId: (id) => {
    if (id > get().lastSeenId) set({ lastSeenId: id });
  },

  refresh: async () => {
    if (get().loading) return get().items;
    set({ loading: true });
    try {
      const res = await apiCommand<ListResponse>('get_user_notifications', { limit: 30 });
      const items = res?.items || [];
      set({ items, unread: res?.unread || 0 });
      return items;
    } catch (e) {
      console.warn('[notifications] refresh failed:', e);
      return get().items;
    } finally {
      set({ loading: false });
    }
  },

  markRead: async (id) => {
    
    
    set((state) => {
      const items = state.items.map((n) => (n.id === id && !n.read ? { ...n, read: true, read_at: new Date().toISOString() } : n));
      const unread = items.filter((n) => !n.read).length;
      return { items, unread };
    });
    try {
      await apiCommand('mark_notification_read', { id });
      
      
      await get().refresh();
    } catch (e) {
      console.warn('[notifications] markRead failed:', e);
    }
  },

  markAllRead: async () => {
    set((state) => ({
      items: state.items.map((n) => ({ ...n, read: true, read_at: n.read_at ?? new Date().toISOString() })),
      unread: 0,
    }));
    try {
      await apiCommand('mark_all_notifications_read', {});
    } catch (e) {
      console.warn('[notifications] markAllRead failed:', e);
    }
  },
}));
