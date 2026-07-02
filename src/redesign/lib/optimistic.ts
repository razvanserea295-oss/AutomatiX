import { useCallback, useEffect, useRef, useState } from 'react';

export type OptimisticRowState = 'idle' | 'new' | 'deleting' | 'undo';

export interface OptimisticListItem {
  id: string | number;
  optimisticState?: OptimisticRowState;
}

export interface UseOptimisticListOptions<T extends OptimisticListItem> {
  items: T[];
  onCommitDelete?: (id: T['id']) => void | Promise<void>;
  deleteCollapseMs?: number;
}

export interface UseOptimisticListResult<T extends OptimisticListItem> {
  visibleItems: T[];
  isSaving: boolean;
  addOptimistic: (item: T) => void;
  markDeleting: (id: T['id']) => void;
  undoDelete: (id: T['id']) => void;
  setSaving: (saving: boolean) => void;
}

const DEFAULT_COLLAPSE_MS = 250;

/**
 * Optimistic list mutations — slide-in add, fade+collapse delete, undo restore.
 * Pair rows with `RowLoadingState` + `ix-row-new` / `ix-row-deleting` classes.
 */
export function useOptimisticList<T extends OptimisticListItem>({
  items,
  onCommitDelete,
  deleteCollapseMs = DEFAULT_COLLAPSE_MS,
}: UseOptimisticListOptions<T>): UseOptimisticListResult<T> {
  const [overlays, setOverlays] = useState<Map<T['id'], OptimisticRowState>>(new Map());
  const [pending, setPending] = useState<T[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const deleteTimers = useRef<Map<T['id'], ReturnType<typeof setTimeout>>>(new Map());

  const clearDeleteTimer = useCallback((id: T['id']) => {
    const t = deleteTimers.current.get(id);
    if (t != null) {
      clearTimeout(t);
      deleteTimers.current.delete(id);
    }
  }, []);

  const merge = useCallback((): T[] => {
    const byId = new Map<T['id'], T>();
    for (const item of items) byId.set(item.id, item);
    for (const item of pending) byId.set(item.id, item);
    const merged = [...byId.values()].map(item => {
      const st = overlays.get(item.id);
      return st ? { ...item, optimisticState: st } : item;
    });
    return merged.filter(item => item.optimisticState !== 'deleting' || overlays.has(item.id));
  }, [items, overlays, pending]);

  const addOptimistic = useCallback((item: T) => {
    setPending(prev => [...prev.filter(p => p.id !== item.id), { ...item, optimisticState: 'new' }]);
    setOverlays(prev => new Map(prev).set(item.id, 'new'));
    setTimeout(() => {
      setOverlays(prev => {
        const next = new Map(prev);
        if (next.get(item.id) === 'new') next.delete(item.id);
        return next;
      });
    }, 400);
  }, []);

  const markDeleting = useCallback((id: T['id']) => {
    clearDeleteTimer(id);
    setOverlays(prev => new Map(prev).set(id, 'deleting'));
    const t = setTimeout(() => {
      setOverlays(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      setPending(prev => prev.filter(p => p.id !== id));
      void onCommitDelete?.(id);
      deleteTimers.current.delete(id);
    }, deleteCollapseMs);
    deleteTimers.current.set(id, t);
  }, [clearDeleteTimer, deleteCollapseMs, onCommitDelete]);

  const undoDelete = useCallback((id: T['id']) => {
    clearDeleteTimer(id);
    setOverlays(prev => {
      const next = new Map(prev);
      next.set(id, 'undo');
      return next;
    });
    const t = setTimeout(() => {
      setOverlays(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [clearDeleteTimer]);

  useEffect(() => () => {
    deleteTimers.current.forEach(t => clearTimeout(t));
    deleteTimers.current.clear();
  }, []);

  return {
    visibleItems: merge(),
    isSaving,
    addOptimistic,
    markDeleting,
    undoDelete,
    setSaving: setIsSaving,
  };
}
