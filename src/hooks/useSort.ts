import { useMemo, useState, useCallback } from 'react';

export type SortDir = 'asc' | 'desc';

export interface SortState<TKey extends string = string> {
  key: TKey | null;
  dir: SortDir;
}








export function useSort<TRow, TKey extends string = string>(
  rows: TRow[],
  compare: (row: TRow, key: TKey) => string | number | Date | null | undefined,
  initial?: SortState<TKey>,
): {
  sorted: TRow[];
  sort: SortState<TKey>;
  toggle: (key: TKey) => void;
} {
  const [sort, setSort] = useState<SortState<TKey>>(initial ?? { key: null, dir: 'asc' });

  const toggle = useCallback((key: TKey) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc')  return { key, dir: 'desc' };
      return { key: null, dir: 'asc' };
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const key = sort.key;
    const sign = sort.dir === 'asc' ? 1 : -1;
    const indexed = rows.map((row, i) => ({ row, i, val: compare(row, key) }));
    indexed.sort((a, b) => {
      
      if (a.val == null && b.val == null) return a.i - b.i;
      if (a.val == null) return 1;
      if (b.val == null) return -1;
      if (typeof a.val === 'number' && typeof b.val === 'number') {
        return sign * (a.val - b.val);
      }
      if (a.val instanceof Date && b.val instanceof Date) {
        return sign * (a.val.getTime() - b.val.getTime());
      }
      return sign * String(a.val).localeCompare(String(b.val), 'ro', { numeric: true, sensitivity: 'base' });
    });
    return indexed.map((x) => x.row);
  }, [rows, sort, compare]);

  return { sorted, sort, toggle };
}
