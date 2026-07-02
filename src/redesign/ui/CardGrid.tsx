import { useState } from 'react';
import type { ReactNode } from 'react';
import { RotateCcw } from '@/icons';
import { cn } from '@/lib/cn';
import { useLayoutEditStore } from '@/store/layoutEditStore';
import { useCardLayout } from '@/redesign/lib/useCardLayout';
import { PositionTile, GhostTile } from './PositionTile';

export interface CardGridItem {
  id: string;
  label: string;
  defaultSpan?: 1 | 2;
  node: ReactNode;
}

// Mirrors the app's KpiGrid breakpoints (src/redesign/ui/Page.tsx) so converted
// strips keep their responsive feel. cols=2 is the content-body case (1-up → 2-up).
const COLS: Record<number, string> = {
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6',
};

/**
 * A responsive grid of reorderable / resizable / hideable cards. Self-contained:
 * owns its layout (useCardLayout, persisted per user+region) and reacts to the
 * global edit toggle (useLayoutEditStore, flipped by <EditLayoutButton>).
 * When not editing, it renders as a plain grid — zero overhead.
 */
export default function CardGrid({ region, userKey, cols = 2, items, className = '' }: {
  region: string;
  userKey: string;
  cols?: 2 | 3 | 4 | 5 | 6;
  items: CardGridItem[];
  className?: string;
}) {
  const editMode = useLayoutEditStore((s) => s.editMode);
  const { layout, setOrder, setSize, hide, show, reset } = useCardLayout(region, userKey, items);
  const [dragId, setDragId] = useState<string | null>(null);

  const byId = new Map(items.map((it) => [it.id, it]));
  const present = layout.order.filter((id) => byId.has(id));
  const visible = present.filter((id) => !layout.hidden.includes(id));
  const hidden = present.filter((id) => layout.hidden.includes(id));

  const moveCard = (id: string, dir: -1 | 1) => {
    const vi = visible.indexOf(id);
    const neighbor = visible[vi + dir];
    if (!neighbor) return;
    const order = [...layout.order];
    const ia = order.indexOf(id), ib = order.indexOf(neighbor);
    [order[ia], order[ib]] = [order[ib], order[ia]];
    setOrder(order);
  };
  const reorderDrag = (from: string, to: string) => {
    if (from === to) return;
    const order = [...layout.order];
    const fi = order.indexOf(from), ti = order.indexOf(to);
    if (fi < 0 || ti < 0) return;
    order.splice(fi, 1); order.splice(ti, 0, from);
    setOrder(order);
  };

  return (
    <div className={className}>
      {editMode && (
        <div className="mb-2 flex items-center justify-end">
          <button type="button" onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-elevated px-2.5 py-1 text-pm-2xs font-semibold text-content-secondary hover:text-accent hover:border-accent/40 transition-smooth">
            <RotateCcw className="h-3 w-3" /> Resetează aranjarea
          </button>
        </div>
      )}
      <div className={cn('grid gap-4', COLS[cols])}>
        {visible.map((id, i) => (
          <PositionTile
            key={id}
            span={layout.sizes[id] ?? 1}
            editMode={editMode}
            dragging={dragId === id}
            canLeft={i > 0}
            canRight={i < visible.length - 1}
            onRemove={() => hide(id)}
            onResize={(size) => setSize(id, size)}
            onMoveLeft={() => moveCard(id, -1)}
            onMoveRight={() => moveCard(id, 1)}
            onDragStart={() => setDragId(id)}
            onDragEnter={() => { if (dragId && dragId !== id) reorderDrag(dragId, id); }}
            onDragEnd={() => setDragId(null)}
          >
            {byId.get(id)!.node}
          </PositionTile>
        ))}
        {editMode && hidden.map((id) => (
          <GhostTile key={id} span={layout.sizes[id] ?? 1} label={byId.get(id)!.label} onAdd={() => show(id)} />
        ))}
        {editMode && visible.length === 0 && hidden.length === 0 && (
          <p className="col-span-full text-center text-pm-sm text-content-muted py-8">Niciun card disponibil.</p>
        )}
      </div>
    </div>
  );
}
