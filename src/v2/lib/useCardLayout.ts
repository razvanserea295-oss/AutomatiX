import { useCallback, useEffect, useState } from 'react';

/**
 * Generic per-user, per-page card layout (order / size / hidden), extracted and
 * generalized from the Dashboard widget system. Persists to localStorage keyed
 * by region + user. CardGrid wraps this — pages rarely call it directly.
 */
export interface CardLayout {
  order: string[];
  hidden: string[];
  sizes: Record<string, 1 | 2>;
}

/** Lightweight registry entry the hook needs (CardGrid items add `node`). */
export interface CardDef {
  id: string;
  label: string;
  defaultSpan?: 1 | 2;
}

function storageKey(region: string, userKey: string): string {
  return `promix_card_layout_v1_${region}__${userKey}`;
}

function defaultLayout(registry: CardDef[]): CardLayout {
  const order = registry.map((r) => r.id);
  const sizes: Record<string, 1 | 2> = {};
  for (const r of registry) sizes[r.id] = r.defaultSpan ?? 1;
  return { order, hidden: [], sizes };
}

function loadLayout(region: string, userKey: string, registry: CardDef[]): CardLayout {
  const ids = registry.map((r) => r.id);
  const base = defaultLayout(registry);
  try {
    let raw = localStorage.getItem(storageKey(region, userKey));
    // One-time continuity: the dashboard region used a legacy key before the engine.
    if (!raw && region === 'dashboard') raw = localStorage.getItem(`promix_dash_layout_v1_${userKey}`);
    if (raw) {
      const p = JSON.parse(raw) as Partial<CardLayout>;
      const order = (Array.isArray(p.order) ? p.order : []).filter((x): x is string => ids.includes(x as string));
      for (const id of ids) if (!order.includes(id)) order.push(id); // append newly-registered cards
      const hidden = (Array.isArray(p.hidden) ? p.hidden : []).filter((x): x is string => ids.includes(x as string));
      const sizes = { ...base.sizes };
      if (p.sizes && typeof p.sizes === 'object') {
        for (const id of ids) {
          const s = (p.sizes as Record<string, unknown>)[id];
          if (s === 1 || s === 2) sizes[id] = s;
        }
      }
      return { order, hidden, sizes };
    }
  } catch { /* ignore corrupt layout */ }
  return base;
}

export function useCardLayout(region: string, userKey: string, registry: CardDef[]) {
  const [layout, setLayout] = useState<CardLayout>(() => loadLayout(region, userKey, registry));

  useEffect(() => {
    try { localStorage.setItem(storageKey(region, userKey), JSON.stringify(layout)); } catch { /* ignore */ }
  }, [region, userKey, layout]);

  const setOrder = useCallback((order: string[]) => setLayout((l) => ({ ...l, order })), []);
  const setSize = useCallback((id: string, size: 1 | 2) =>
    setLayout((l) => (l.sizes[id] === size ? l : { ...l, sizes: { ...l.sizes, [id]: size } })), []);
  const hide = useCallback((id: string) =>
    setLayout((l) => (l.hidden.includes(id) ? l : { ...l, hidden: [...l.hidden, id] })), []);
  const show = useCallback((id: string) =>
    setLayout((l) => ({ ...l, hidden: l.hidden.filter((x) => x !== id) })), []);
  const reset = useCallback(() => setLayout(defaultLayout(registry)), [registry]);

  return { layout, setOrder, setSize, hide, show, reset };
}
