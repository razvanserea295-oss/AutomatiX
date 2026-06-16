import { useCallback, useState } from 'react';

const MIN_COL_PX = 60;
const MAX_COL_PX = 800;











export function useColumnWidths<TKey extends string>(
  storageKey: string,
  defaults: Record<TKey, number>,
): {
  widths: Record<TKey, number>;
  setWidth: (key: TKey, px: number) => void;
  nudge: (key: TKey, deltaPx: number) => void;
  reset: () => void;
} {
  const [widths, setWidths] = useState<Record<TKey, number>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
      const merged: Record<string, number> = { ...defaults };
      for (const k of Object.keys(stored)) {
        const v = Number(stored[k]);
        if (Number.isFinite(v) && v >= MIN_COL_PX && v <= MAX_COL_PX) merged[k] = v;
      }
      return merged as Record<TKey, number>;
    } catch {
      return defaults;
    }
  });

  const persist = (next: Record<TKey, number>) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {  }
  };

  const setWidth = useCallback((key: TKey, px: number) => {
    setWidths((prev) => {
      const clamped = Math.max(MIN_COL_PX, Math.min(MAX_COL_PX, Math.round(px)));
      if (prev[key] === clamped) return prev;
      const next = { ...prev, [key]: clamped };
      persist(next);
      return next;
    });
  }, [storageKey]);

  const nudge = useCallback((key: TKey, deltaPx: number) => {
    setWidths((prev) => {
      const clamped = Math.max(MIN_COL_PX, Math.min(MAX_COL_PX, Math.round(prev[key] + deltaPx)));
      if (prev[key] === clamped) return prev;
      const next = { ...prev, [key]: clamped };
      persist(next);
      return next;
    });
  }, [storageKey]);

  const reset = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch {  }
    setWidths(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  return { widths, setWidth, nudge, reset };
}
