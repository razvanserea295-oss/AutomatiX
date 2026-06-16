













import { useMemo, useState, type ReactNode } from 'react';
import Page, { PageBody } from './Page';
import PageHeader from './PageHeader';
import FilterBar from './FilterBar';
import SortableTh, { Th, THEAD_STICKY } from './SortableTh';
import { useSort } from '@/hooks/useSort';
import { SelectAllCheckbox, RowCheckbox } from '@/components/BulkSelection';
import { Loader2, Inbox } from 'lucide-react';

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
  title, subtitle, icon, actions,
  rows, columns, rowKey, onRowClick,
  loading = false,
  searchKeys, searchPlaceholder = 'Caută...', filters,
  emptyMessage = 'Nicio înregistrare.',
  embedded = false, headerless = false,
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
      {!headerless && (
        <PageHeader title={title} subtitle={subtitle} icon={icon}>{actions}</PageHeader>
      )}

      {(showFilterBar || (headerless && actions)) && (
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
          {headerless && actions && <div className="ml-auto">{actions}</div>}
        </div>
      )}

        <div className="border border-line rounded-lg overflow-hidden bg-surface-primary">
          {

}
          <div className="overflow-auto max-h-[72vh]">
            <table className="table-density w-full text-left">
              <thead className={THEAD_STICKY}>
                <tr>
                  {selection && (
                    <th className="px-2 py-2 w-8">
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
                    <td colSpan={columns.length + (selection ? 1 : 0)} className="px-3 py-12 text-center text-content-muted">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (selection ? 1 : 0)} className="px-3 py-12 text-center text-content-muted">
                      <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-pm-sm">{emptyMessage}</p>
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
                        className={`group border-b border-line-subtle last:border-0 ${
                          onRowClick ? 'cursor-pointer hover:bg-surface-nav-hover transition-colors' : ''
                        } ${selected ? 'bg-accent/5' : ''} ${rowClassName?.(row) ?? ''}`}
                      >
                        {selection && (
                          <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                            <RowCheckbox checked={selected} onToggle={() => selection.toggle(id)} />
                          </td>
                        )}
                        {columns.map(c => (
                          <td key={c.key} className={`px-3 py-2 text-pm-base text-content-primary ${c.className ?? ''}`}>
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
