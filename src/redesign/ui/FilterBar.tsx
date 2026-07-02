import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Search, X as XIcon } from '@/icons';
import { filterSearchInputCls, filterSearchIconCls, filterClearInlineBtnCls, filterSelectCls, filterResetBtnCls } from '@/redesign/ui/filterControls';


const SEARCH_DEBOUNCE_MS = 200;

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  
  clearable?: boolean;
  onClearAll?: () => void;
  children?: ReactNode;
}








export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Caută...',
  filters,
  clearable = false,
  onClearAll,
  children,
}: FilterBarProps) {
  
  
  
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  
  
  useEffect(() => {
    setLocalSearch(prev => (prev === search ? prev : search));
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
  }, [search]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const emitSearch = (value: string, immediate = false) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (immediate) { debounceRef.current = null; onSearchChangeRef.current(value); return; }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onSearchChangeRef.current(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  const hasActive = localSearch.trim() !== '' || (filters?.some(f => f.value) ?? false);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {}
      <div className="relative group">
        <Search className={filterSearchIconCls} />
        <input
          type="text"
          value={localSearch}
          onChange={e => emitSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className={filterSearchInputCls}
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => emitSearch('', true)}
            aria-label="Golește căutarea"
            className={`${filterClearInlineBtnCls} anim-scale-in active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]`}
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {}
      {filters?.map(f => (
        <select
          key={f.key}
          value={f.value}
          onChange={e => f.onChange(e.target.value)}
          className={filterSelectCls(Boolean(f.value))}
        >
          <option value="">{f.label}</option>
          {f.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {}
      {clearable && hasActive && (
        <button
          type="button"
          onClick={() => {
            emitSearch('', true);
            filters?.forEach(f => f.onChange(''));
            onClearAll?.();
          }}
          className={`${filterResetBtnCls} anim-scale-in active:scale-[0.98]`}
        >
          <XIcon className="h-3.5 w-3.5" />
          Resetează
        </button>
      )}

      {}
      {children && <div className="flex-1" />}
      {children}
    </div>
  );
}
