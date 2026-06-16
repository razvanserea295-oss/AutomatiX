import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { CheckSquare, Square, MinusSquare, X } from 'lucide-react';

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: ReactNode;
  
  run: (items: T[]) => Promise<number>;
  
  danger?: boolean;
  
  confirmMessage?: string;
}






export function useBulkSelection<T extends { id: number | string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const selected = useMemo(
    () => items.filter(i => selectedIds.has(i.id)),
    [items, selectedIds],
  );

  const isSelected = useCallback((id: string | number) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((id: string | number) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === items.length && items.length > 0) return new Set();
      return new Set(items.map(i => i.id));
    });
  }, [items]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return {
    selectedIds, selected, count: selectedIds.size,
    isSelected, toggle, toggleAll, clear,
    allSelected, someSelected,
  };
}

export function SelectAllCheckbox({ allSelected, someSelected, onToggle }: {
  allSelected: boolean; someSelected: boolean; onToggle: () => void;
}) {
  const Icon = allSelected ? CheckSquare : someSelected ? MinusSquare : Square;
  return (
    <button onClick={onToggle} aria-label={allSelected ? 'Deselectează tot' : 'Selectează tot'}
      className="p-1 rounded hover:bg-surface-tertiary text-content-muted hover:text-accent transition-colors">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function RowCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const Icon = checked ? CheckSquare : Square;
  return (
    <button onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label={checked ? 'Deselectează' : 'Selectează'}
      className="p-1 rounded hover:bg-surface-tertiary text-content-muted hover:text-accent transition-colors">
      <Icon className={`h-3.5 w-3.5 ${checked ? 'text-accent' : ''}`} />
    </button>
  );
}





export function BulkActionBar<T>({ count, items, actions, onClear }: {
  count: number;
  items: T[];
  actions: BulkAction<T>[];
  onClear: () => void;
}) {
  const [running, setRunning] = useState<string | null>(null);

  if (count === 0) return null;

  const handle = async (action: BulkAction<T>) => {
    if (action.confirmMessage && !window.confirm(`${action.confirmMessage} (${count} elemente)`)) return;
    setRunning(action.id);
    try {
      const processed = await action.run(items);
      
      if (processed > 0) onClear();
    } finally { setRunning(null); }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface-primary border border-line shadow-lg rounded-lg px-4 py-2.5 flex items-center gap-3 min-w-[400px]">
      <span className="text-sm font-semibold text-content-primary">
        {count} selectate
      </span>
      <div className="h-5 w-px bg-line" />
      <div className="flex items-center gap-1.5 flex-wrap">
        {actions.map(action => (
          <button key={action.id} onClick={() => handle(action)} disabled={running !== null}
            className={`text-xs px-3 py-1.5 rounded font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 ${
              action.danger
                ? 'bg-status-red/15 text-status-red hover:bg-status-red/25'
                : 'bg-accent/15 text-accent hover:bg-accent/25'
            }`}>
            {action.icon}
            {running === action.id ? 'Se rulează...' : action.label}
          </button>
        ))}
      </div>
      <button onClick={onClear} className="ml-auto p-1 rounded hover:bg-surface-tertiary text-content-muted">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
