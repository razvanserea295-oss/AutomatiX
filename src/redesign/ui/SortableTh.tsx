















import { ChevronDown, ChevronsUpDown, ChevronUp } from '@/icons';
import type { SortState } from '@/hooks/useSort';






export const TH_TEXT = 'text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted';







export const THEAD_STICKY =
  'sticky top-0 z-10 bg-surface-secondary backdrop-blur-[18px] backdrop-saturate-[150%] shadow-[inset_0_-1px_0_var(--color-border)]';

interface ThProps {
  align?: 'left' | 'right' | 'center';
  className?: string;
  children?: React.ReactNode;
}


export function Th({ align = 'left', className = '', children }: ThProps) {
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th scope="col" className={`px-3 py-2.5 ${TH_TEXT} ${alignCls} ${className}`}>
      {children}
    </th>
  );
}

interface SortableThProps<TKey extends string> {
  sortKey: TKey;
  sort: SortState<TKey>;
  onSort: (key: TKey) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
  
  resizeHandle?: React.ReactNode;
  children: React.ReactNode;
}

export default function SortableTh<TKey extends string>({
  sortKey,
  sort,
  onSort,
  align = 'left',
  className = '',
  resizeHandle,
  children,
}: SortableThProps<TKey>) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`relative px-3 py-2.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`ds-sortable-th group inline-flex w-full items-center gap-1.5 ${justify} rounded-lg px-1.5 py-1 -mx-1.5 -my-1 text-pm-2xs font-bold uppercase tracking-[0.14em] transition-smooth duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
          active
            ? 'text-accent hover:bg-accent-muted'
            : 'text-content-muted hover:bg-surface-tertiary hover:text-content-secondary'
        }`}
      >
        <span className="min-w-0 truncate">{children}</span>
        <Icon
          className={`h-3 w-3 shrink-0 transition-opacity duration-150 ${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'}`}
          aria-hidden
        />
      </button>
      {resizeHandle}
    </th>
  );
}
