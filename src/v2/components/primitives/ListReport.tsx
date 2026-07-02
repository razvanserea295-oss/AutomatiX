

















import { useMemo, useState, type ReactNode } from 'react';
import Page, { PageBody } from '@/v2/components/primitives/Page';
import FilterBar from '@/v2/components/primitives/FilterBar';
import SortableTh, { Th, THEAD_STICKY } from '@/v2/components/primitives/SortableTh';
import { useSort } from '@/hooks/useSort';
import { SelectAllCheckbox, RowCheckbox } from '@/components/BulkSelection';
import { Loader2, Inbox } from '@/icons';

export interface ListColumn<T> {
  
  key: string;
  
  header: ReactNode;
  
  sortKey?: string;
  
  render: (row: T) => ReactNode;
  
  className?: string;
}

export interface ListFilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

interface ListReportProps<T> {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  
  actions?: ReactNode;
  rows: T[];
  columns: ListColumn<T>[];
  
  rowKey: (row: T) => string | number;
  
  onRowClick?: (row: T) => void;
  loading?: boolean;
  
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  filters?: ListFilterDef[];
  emptyMessage?: string;
  
  embedded?: boolean;
  
  headerless?: boolean;
  
  selection?: {
    isSelected: (id: string | number) => boolean;
    toggle: (id: string | number) => void;
    toggleAll: () => void;
    allSelected: boolean;
    someSelected: boolean;
  };
  
  rowClassName?: (row: T) => string;
  
  footer?: ReactNode;
}

export default function ListReport<T>({
  title: _title, subtitle: _subtitle, icon: _icon, actions,
  rows, columns, rowKey, onRowClick,
  loading = false,
  searchKeys, searchPlaceholder = 'Caută...', filters,
  emptyMessage = 'Nicio înregistrare.',
  embedded = false, headerless: _headerless = false,
  selection, rowClassName, footer,
}: ListReportProps<T>) {
  const [search, setSearch] = useState('');

  
  const searched = useMemo(() => {
    if (!search.trim() || !searchKeys?.length) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => searchKeys.some(k => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [rows, search, searchKeys]);

  const { sorted: filtered, sort, toggle } = useSort<T, string>(
    searched,
    (row, key) => (row as Record<string, unknown>)[key] as string | number | null,
  );

  const showFilterBar = (searchKeys?.length ?? 0) > 0 || (filters?.length ?? 0) > 0;

  const inner = (
    <>
      {(showFilterBar || actions) && (
        <div className="flex items-center gap-2 flex-wrap">
          {showFilterBar && (
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={searchPlaceholder}
              filters={filters}
              clearable
              onClearAll={() => { setSearch(''); filters?.forEach(f => f.onChange('')); }}
            />
          )}
          {actions && <div className={showFilterBar ? 'ml-auto' : 'w-full flex justify-end'}>{actions}</div>}
        </div>
      )}

        <div className="surface-card bg-surface-primary border border-line rounded-2xl overflow-hidden">
          {

}
          <div className="overflow-auto max-h-[72vh]">
            <table className="table-density w-full text-left">
              <thead className={THEAD_STICKY}>
                <tr>
                  {selection && (
                    <th className="px-3 py-2.5 w-8">
                      <SelectAllCheckbox
                        allSelected={selection.allSelected}
                        someSelected={selection.someSelected}
                        onToggle={selection.toggleAll}
                      />
                    </th>
                  )}
                  {columns.map(c =>
                    c.sortKey ? (
                      <SortableTh key={c.key} sortKey={c.sortKey} sort={sort} onSort={toggle}>
                        {c.header}
                      </SortableTh>
                    ) : (
                      <Th key={c.key} align={c.className?.includes('text-right') ? 'right' : 'left'}>
                        {c.header}
                      </Th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-14 text-center text-content-muted">
                      <span className="anim-fade-in inline-flex">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" />
                      </span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-14 text-center text-content-muted">
                      <span className="anim-fade-in inline-flex flex-col items-center">
                        <Inbox className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-pm-sm">{emptyMessage}</p>
                      </span>
                    </td>
                  </tr>
                ) : (
                  filtered.map(row => {
                    const id = rowKey(row);
                    const selected = selection?.isSelected(id) ?? false;
                    return (
                      <tr
                        key={id}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={`group border-b border-line/70 last:border-0 transition-smooth duration-150 ${
                          onRowClick ? 'cursor-pointer hover:bg-surface-tertiary active:bg-surface-tertiary' : ''
                        } ${selected ? 'bg-accent-muted' : ''} ${rowClassName?.(row) ?? ''}`}
                      >
                        {selection && (
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <RowCheckbox checked={selected} onToggle={() => selection.toggle(id)} />
                          </td>
                        )}
                        {columns.map(c => (
                          <td key={c.key} className={`px-3 py-2.5 text-pm-base text-content-primary ${c.className ?? ''}`}>
                            {c.render(row)}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {footer}
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{inner}</div>;
  }
  return (
    <Page>
      <PageBody>{inner}</PageBody>
    </Page>
  );
}
