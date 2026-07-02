import {
  Fragment,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from '@/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/v2/components/ui/table';
import { Button } from '@/v2/components/ui/button';
import { cn } from '@/v2/lib/cn';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';

export type DataTableColumn<T> = {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  width?: number;
  minWidth?: number;
};

export type DataTableProps<T extends { id: string | number }> = {
  data: T[];
  columns: DataTableColumn<T>[];
  pageSize?: number;
  selectable?: boolean;
  selectedId?: string | number | null;
  onSelect?: (row: T) => void;
  expandable?: (row: T) => ReactNode | null;
  rowActions?: (row: T) => ReactNode;
  rowMutations?: Partial<Record<string | number, 'exit' | 'insert' | 'update'>>;
  className?: string;
  animateRows?: boolean;
};

type SortState = { id: string; dir: 'asc' | 'desc' } | null;

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  pageSize = 10,
  selectable,
  selectedId,
  onSelect,
  expandable,
  rowActions,
  rowMutations,
  className,
  animateRows = true,
}: DataTableProps<T>) {
  const reduced = useReducedMotion();
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const [pageTransition, setPageTransition] = useState<'in' | 'out' | 'idle'>('idle');
  const [expanded, setExpanded] = useState<Set<string | number>>(new Set());
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [data, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (id: string) => {
    setSort((prev) => {
      if (!prev || prev.id !== id) return { id, dir: 'asc' };
      if (prev.dir === 'asc') return { id, dir: 'desc' };
      return null;
    });
  };

  const goPage = useCallback(
    (next: number) => {
      if (next === page || reduced) {
        setPage(next);
        return;
      }
      setPageTransition('out');
      window.setTimeout(() => {
        setPage(next);
        setPageTransition('in');
        window.setTimeout(() => setPageTransition('idle'), 150);
      }, 100);
    },
    [page, reduced],
  );

  const toggleExpand = (id: string | number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onResizeStart = (colId: string, e: React.MouseEvent, minWidth = 80) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[colId] ?? columns.find((c) => c.id === colId)?.width ?? 120;

    const onMove = (ev: MouseEvent) => {
      const w = Math.max(minWidth, startW + ev.clientX - startX);
      setColWidths((prev) => ({ ...prev, [colId]: w }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className={cn('analytics-data-table', className)}>
      <Table className="analytics-table">
        <TableHeader>
          <TableRow className="analytics-table-header-row hover:bg-transparent">
            {expandable && <TableHead className="w-8" />}
            {columns.map((col) => {
              const active = sort?.id === col.id;
              const w = colWidths[col.id] ?? col.width;
              return (
                <TableHead
                  key={col.id}
                  className="analytics-table-head group relative"
                  style={{ width: w, minWidth: col.minWidth ?? 80 } as CSSProperties}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 uppercase"
                    onClick={() => col.sortValue && toggleSort(col.id)}
                  >
                    {col.header}
                    {col.sortValue && (
                      <span className={cn('analytics-sort-icon', active && `is-${sort?.dir}`)}>
                        {active ? (
                          sort?.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </span>
                    )}
                  </button>
                  <span
                    className="analytics-col-resize"
                    onMouseDown={(e) => onResizeStart(col.id, e, col.minWidth)}
                    role="separator"
                    aria-orientation="vertical"
                  />
                </TableHead>
              );
            })}
            {rowActions && <TableHead className="w-24" />}
          </TableRow>
        </TableHeader>
        <TableBody
          stagger={animateRows && !reduced}
          className={cn(
            pageTransition === 'out' && 'analytics-page-out',
            pageTransition === 'in' && 'analytics-page-in',
          )}
        >
          {pageData.map((row, ri) => {
            const isExpanded = expanded.has(row.id);
            const mutation = rowMutations?.[row.id];
            const isExiting = mutation === 'exit';
            const isInserting = mutation === 'insert';
            const isUpdating = mutation === 'update';
            const expandContent = expandable?.(row);

            return (
              <Fragment key={row.id}>
                <TableRow
                  data-state={selectedId === row.id ? 'selected' : undefined}
                  className={cn(
                    'analytics-table-row',
                    ri % 2 === 0 ? 'analytics-row-odd' : 'analytics-row-even',
                    selectable && 'cursor-pointer',
                    isExiting && 'analytics-row-exit',
                    isInserting && 'analytics-row-insert',
                    isUpdating && 'analytics-row-update',
                    isExpanded && 'analytics-row-expanded',
                  )}
                  onClick={() => selectable && onSelect?.(row)}
                >
                  {expandable && (
                    <TableCell className="w-8">
                      {expandContent && (
                        <button
                          type="button"
                          className={cn('analytics-expand-chevron', isExpanded && 'is-open')}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(row.id);
                          }}
                          aria-expanded={isExpanded}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      )}
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(sort && 'analytics-cell-sort-blur')}
                      style={{ width: colWidths[col.id] ?? col.width }}
                    >
                      {col.accessor(row)}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell>
                      <div className="analytics-row-actions">{rowActions(row)}</div>
                    </TableCell>
                  )}
                </TableRow>
                {expandContent && isExpanded && (
                  <TableRow className="analytics-row-expand-content">
                    <TableCell colSpan={columns.length + (expandable ? 1 : 0) + (rowActions ? 1 : 0)}>
                      <div className="analytics-expand-panel">{expandContent}</div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {pageCount > 1 && (
        <div className="density-pagination analytics-pagination">
          {Array.from({ length: pageCount }, (_, i) => (
            <Button
              key={i}
              variant={i === page ? 'default' : 'ghost'}
              size="sm"
              className={cn('h-7 w-7 p-0 tabular-nums', i === page && 'analytics-page-active')}
              onClick={() => goPage(i)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
