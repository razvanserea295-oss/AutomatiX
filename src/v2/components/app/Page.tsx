import type { ReactNode, ComponentProps } from 'react';
import { Input } from '@/v2/components/ui/input';
import { cn } from '@/v2/lib/cn';

type PageProps = {
  children: ReactNode;
  className?: string;
  /** Page fills viewport below top bar; inner panels scroll */
  fill?: boolean;
};

/** Full-width page shell — no max-width cap, compact padding */
export function Page({ children, className, fill }: PageProps) {
  return (
    <div className={cn(fill ? 'v2-page-fill' : 'v2-page', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'v2-animate-content density-toolbar flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border/50 pb-1',
        className,
      )}
      style={{ minHeight: 'var(--density-toolbar-h)' }}
    >
      <div className="min-w-0">
        <h2 className="density-page-title truncate text-foreground">{title}</h2>
        {description && (
          <p className="density-meta truncate text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-1">{actions}</div>}
    </div>
  );
}

/** Grows to fill remaining page height */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-[var(--density-gap-section)]', className)}>
      {children}
    </div>
  );
}

/** Filters, search, tabs row — single tight band */
export function PageToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('density-toolbar', className)}>
      {children}
    </div>
  );
}

export function PageSearch({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn('flex-1', className)}
      style={{ minWidth: 'var(--density-search-w)', maxWidth: 'var(--density-search-w)', height: 'var(--density-search-h)' }}
      {...props}
    />
  );
}

export function PageKpis({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'v2-stagger grid shrink-0 gap-[var(--density-gap-card)] sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

type SplitProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'wide' | 'detail';
};

/** Master-detail grid that expands to fill page */
export function PageSplit({ children, className, variant = 'default' }: SplitProps) {
  return (
    <div
      className={cn(
        'v2-split',
        variant === 'wide' && 'v2-split-wide',
        variant === 'detail' && 'v2-split-detail',
        className,
      )}
    >
      {children}
    </div>
  );
}

type PanelProps = {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  scroll?: boolean;
};

/** Bordered panel — use with PageSplit */
export function PagePanel({ children, className, bodyClassName, scroll }: PanelProps) {
  return (
    <div className={cn('v2-panel', className)}>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          scroll && 'v2-panel-scroll overflow-auto',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Table inside a card that scrolls and fills available height */
export function DataTableCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('v2-panel min-h-0 flex-1', className)}>
      <div className="v2-panel-scroll v2-table-sticky">
        {children}
      </div>
    </div>
  );
}
