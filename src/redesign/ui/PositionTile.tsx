import type { ReactNode } from 'react';
import { Minus, ChevronLeft, ChevronRight, MoveHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Edit-mode card shell — generalized from the Dashboard's WidgetTile. Explicit
 * controls (move ◄ ►, resize ⤢, remove −) PLUS native drag-to-reorder. The
 * inner card keeps its own .pm-card styling, so appearance customization still
 * applies while positioning.
 */
export function PositionTile({ span, editMode, dragging, canLeft, canRight, onRemove, onResize, onMoveLeft, onMoveRight, onDragStart, onDragEnter, onDragEnd, children }: {
  span: 1 | 2; editMode: boolean; dragging: boolean; canLeft: boolean; canRight: boolean;
  onRemove: () => void; onResize: (size: 1 | 2) => void; onMoveLeft: () => void; onMoveRight: () => void;
  onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void;
  children: ReactNode;
}) {
  const ctrlBtn = 'h-6 w-6 rounded-full flex items-center justify-center text-content-secondary hover:text-accent disabled:opacity-30 disabled:hover:text-content-secondary transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]';
  return (
    <div
      className={cn('relative min-w-0 flex', span === 2 && 'lg:col-span-2', dragging && 'opacity-40 z-30')}
      draggable={editMode}
      onDragStart={editMode ? onDragStart : undefined}
      onDragEnter={editMode ? onDragEnter : undefined}
      onDragEnd={editMode ? onDragEnd : undefined}
      onDragOver={editMode ? (e) => e.preventDefault() : undefined}
    >
      {editMode && (
        <>
          <button type="button" onClick={onRemove} onDragStart={(e) => e.preventDefault()} aria-label="Ascunde cardul"
            className="absolute -left-2 -top-2 z-20 h-6 w-6 rounded-full bg-status-red text-white shadow-[var(--elevation-2)] flex items-center justify-center transition-colors duration-150 hover:bg-status-red/90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
            <Minus className="h-4 w-4" strokeWidth={3} />
          </button>
          <div className="absolute -top-3 right-3 z-20 flex items-center gap-0.5 rounded-full bg-surface-elevated border border-line px-1 py-0.5 shadow-[var(--elevation-3)]" onDragStart={(e) => e.preventDefault()}>
            <button type="button" className={ctrlBtn} onClick={onMoveLeft} disabled={!canLeft} aria-label="Mută înainte" title="Mută înainte"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" className={ctrlBtn} onClick={() => onResize(span === 2 ? 1 : 2)} aria-label="Schimbă dimensiunea" title={span === 2 ? 'Fă-l jumătate' : 'Fă-l lat'}><MoveHorizontal className="h-4 w-4" /></button>
            <button type="button" className={ctrlBtn} onClick={onMoveRight} disabled={!canRight} aria-label="Mută după" title="Mută după"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </>
      )}
      <div className={cn('w-full', editMode && 'pointer-events-none select-none cursor-grab')}>
        {children}
      </div>
    </div>
  );
}

export function GhostTile({ span, label, onAdd }: { span: 1 | 2; label: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        'group relative min-h-[96px] rounded-2xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-2 text-content-muted hover:border-accent/50 hover:text-accent transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] anim-scale-in',
        span === 2 && 'lg:col-span-2',
      )}
    >
      <Plus className="h-5 w-5" />
      <span className="text-pm-xs font-medium px-2 text-center">{label}</span>
    </button>
  );
}
