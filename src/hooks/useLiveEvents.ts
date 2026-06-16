











import { useEffect } from 'react';
import { isServerMode, getServerUrl } from '@/config/server';
import { getPromixToken } from '@/lib/session';
import { useHandoffStore } from '@/store/handoffStore';
import { useProjectStore } from '@/store/projectStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useAlertStore } from '@/store/alertStore';

interface AppEvent {
  topic:
    | 'handoff.created' | 'handoff.updated'
    | 'project.created' | 'project.updated'
    | 'piece.updated'
    | 'alert.created'   | 'alert.acknowledged'
    | 'briefing.updated';
  payload?: Record<string, unknown>;
  ts: number;
}

export function useLiveEvents(): void {
  useEffect(() => {
    if (!isServerMode()) return;
    const token = getPromixToken();
    if (!token) return;

    const url = `${getServerUrl().replace(/\/+$/, '')}/api/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    
    
    
    const pending: Partial<Record<AppEvent['topic'], number>> = {};
    const schedule = (topic: AppEvent['topic'], fn: () => void) => {
      if (pending[topic]) window.clearTimeout(pending[topic]!);
      pending[topic] = window.setTimeout(() => { fn(); delete pending[topic]; }, 250);
    };

    es.onmessage = (e) => {
      let evt: AppEvent;
      try { evt = JSON.parse(e.data) as AppEvent; }
      catch { return; }

      switch (evt.topic) {
        case 'handoff.created':
        case 'handoff.updated':
          schedule(evt.topic, () => {
            void useHandoffStore.getState().fetchPending(true);
            void useDashboardStore.getState().invalidate();
          });
          break;
        case 'project.created':
        case 'project.updated':
          schedule(evt.topic, () => {
            void useProjectStore.getState().refreshAll();
            void useDashboardStore.getState().invalidate();
          });
          break;
        case 'piece.updated':
          
          // global refresh; PartsTreePage / KanbanPage will re-fetch when
          
          schedule('piece.updated', () => useDashboardStore.getState().invalidate());
          break;
        case 'alert.created':
        case 'alert.acknowledged':
          schedule(evt.topic, () => {
            void useAlertStore.getState().fetchAlerts();
            void useDashboardStore.getState().invalidate();
          });
          break;
        case 'briefing.updated':
          
          
          break;
      }
    };

    
    
    es.onerror = () => {
      
      if (es.readyState === EventSource.CLOSED) {
        console.warn('[live] SSE connection closed');
      }
    };

    return () => {
      Object.values(pending).forEach((id) => id && window.clearTimeout(id));
      es.close();
    };
  }, []);
}
