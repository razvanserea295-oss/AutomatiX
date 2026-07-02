import * as React from 'react';
import { cn } from '@/v2/lib/cn';

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn('v2-table-dense table-density w-full caption-bottom density-tabular', className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />,
);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & { stagger?: boolean }
>(({ className, stagger, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', stagger && 'v2-stagger-rows', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'v2-table-row border-b data-[state=selected]:bg-muted data-[state=selected]:v2-card-selected',
      className,
    )}
    style={{ height: 'var(--density-row-h)' }}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'text-left align-middle font-semibold uppercase text-muted-foreground',
        className,
      )}
      style={{
        height: 'var(--density-table-header-h)',
        padding: `0 var(--density-cell-px)`,
        fontSize: 'var(--density-fs-table-header)',
        letterSpacing: 'var(--density-tracking-table-header)',
        lineHeight: 'var(--density-lh-table)',
      }}
      {...props}
    />
  ),
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('align-middle text-[length:var(--density-fs-table-cell)]', className)}
      style={{
        padding: 'var(--density-cell-py) var(--density-cell-px)',
        lineHeight: 'var(--density-lh-table)',
      }}
      {...props}
    />
  ),
);
TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
