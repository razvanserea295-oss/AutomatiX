import { Bookmark, Plus, X } from '@/icons';
import { useLocalStorage } from './useLocalStorage';

export interface SavedFilter {
  id: string;
  label: string;
  payload: Record<string, unknown>;
}

interface Props {
  storageKey: string;
  current: Record<string, unknown>;
  onApply: (payload: Record<string, unknown>) => void;
  
  activeId?: string;
}






export default function QuickFilterChips({ storageKey, current, onApply, activeId }: Props) {
  const [filters, setFilters] = useLocalStorage<SavedFilter[]>(`promix_qfilter_${storageKey}`, []);

  const save = () => {
    const label = window.prompt('Numele filtrului salvat:');
    if (!label?.trim()) return;
    const f: SavedFilter = { id: `${Date.now()}`, label: label.trim(), payload: current };
    setFilters(prev => [...prev.slice(-9), f]);
  };

  const remove = (id: string) => setFilters(prev => prev.filter(f => f.id !== id));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {filters.map(f => (
        <span
          key={f.id}
          className={`group inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 text-pm-2xs border ${
            activeId === f.id
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-line bg-surface-tertiary/40 text-content-secondary hover:border-line/80'
          }`}
        >
          <button type="button" className="flex items-center gap-1" onClick={() => onApply(f.payload)}>
            <Bookmark className="h-3 w-3" /> {f.label}
          </button>
          <button
            type="button"
            className="opacity-50 hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); remove(f.id); }}
            aria-label={`Șterge filtrul ${f.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={save}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-pm-2xs border border-dashed border-line text-content-muted hover:text-content-primary hover:border-line/80"
        title="Salvează filtrul curent"
      >
        <Plus className="h-3 w-3" /> Salvează filtru
      </button>
    </div>
  );
}
