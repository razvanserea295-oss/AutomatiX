import type { HTMLAttributes, ReactNode } from 'react';
import Card, { CardHeader, CardBody } from './Card';
import { DESKTOP_PAGE_FIT, PAGE_GAP } from '@/redesign/layout/constants';

interface PageProps extends HTMLAttributes<HTMLDivElement> {
  /** When true, page fills the shell and defers vertical scroll to children on lg+. */
  fit?: boolean;
  layout?: 'col' | 'row';
  children: ReactNode;
}

function Page({ fit = false, layout = 'col', children, className = '', ...rest }: PageProps) {
  const fitCls = fit ? DESKTOP_PAGE_FIT : 'flex w-full flex-col min-w-0 flex-1 min-h-0';
  return (
    <div
      className={`app-surface ${fitCls} ${layout === 'row' ? '!flex-row' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

interface PageBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Content width cap — `narrow` centers a form column; `wide`/`full` span the shell. */
  maxWidth?: 'narrow' | 'wide' | 'full';
  /** Outer gutters — all non-flush variants share the same horizontal inset. */
  padding?: 'flush' | 'tight' | 'comfortable' | 'spacious';
  /** Flex column that grows inside a `fit` page — use with fill panels/tables. */
  fit?: boolean;
  children: ReactNode;
}

// Side gutters must be UNIFORM page-to-page. Two things used to break that:
// (1) every padding variant had a different horizontal value (px-5/6/8), and
// (2) `wide`/`narrow` capped + centered the content, so on a normal screen the
// edge-to-content gap jumped around (and looked "too large"). Fix: one
// horizontal padding for all non-flush variants, and let `wide` fill the
// content column on normal screens (only capping on ultra-wide) so it matches
// the `full` pages. `narrow` stays a genuine reading width for forms.
const maxWidthClass = {
  narrow: 'max-w-[1280px]',
  wide:   'max-w-none',
  full:   'max-w-none',
};

const padClass = {
  flush:       'px-0 py-0',
  tight:       'px-3 py-3 sm:px-4 sm:py-4 lg:px-6',
  comfortable: 'px-3 py-4 sm:px-4 lg:px-6 lg:py-6',
  spacious:    'px-3 py-5 sm:px-4 lg:px-6 lg:py-8',
};


function PageBody({
  maxWidth = 'full',
  padding = 'comfortable',
  fit = false,
  className = '',
  children,
  ...rest
}: PageBodyProps) {
  const layout = fit ? `flex flex-col ${PAGE_GAP} lg:flex-1 lg:min-h-0` : 'space-y-4 lg:space-y-6';
  const center = maxWidth === 'narrow' ? 'mx-auto' : '';
  return (
    <div className={`page-body w-full ${center} ${maxWidthClass[maxWidth]} ${padClass[padding]} ${layout} ${className}`} {...rest}>
      {children}
    </div>
  );
}

interface PageSectionProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  id?: string;
  className?: string;
  children?: ReactNode;
}


function PageSection({ eyebrow, title, description, actions, id, className = '', children }: PageSectionProps) {
  return (
    <section id={id} className={className}>
      <Card>
        {(eyebrow || title || description || actions) && (
          <CardHeader
            title={
              <>
                {eyebrow && (
                  <p className="text-pm-eyebrow text-accent mb-1.5 flex items-center gap-2">
                    <span className="inline-block h-px w-3.5 bg-accent/50" aria-hidden />
                    {eyebrow}
                  </p>
                )}
                {title && (
                  <span className="text-pm-lg font-semibold text-content-primary leading-tight">{title}</span>
                )}
              </>
            }
            subtitle={description}
            actions={actions}
          />
        )}
        <CardBody>
          {children}
        </CardBody>
      </Card>
    </section>
  );
}

interface KpiGridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: 2 | 3 | 4 | 5 | 6;
}

const kpiCols: Record<NonNullable<KpiGridProps['cols']>, string> = {
  2: 'grid grid-cols-1 items-stretch sm:grid-cols-2 gap-3 sm:gap-4',
  3: 'grid grid-cols-1 items-stretch sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4',
  4: 'grid grid-cols-1 items-stretch sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4',
  5: 'grid grid-cols-1 items-stretch sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3 sm:gap-4',
  6: 'grid grid-cols-1 items-stretch sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4',
};


function KpiGrid({ cols = 4, className = '', children, ...rest }: KpiGridProps) {
  return (
    <div className={`${kpiCols[cols]} ${className}`} {...rest}>
      {children}
    </div>
  );
}

Page.Body = PageBody;
Page.Section = PageSection;
Page.Kpis = KpiGrid;

export default Page;
export { PageBody, PageSection, KpiGrid };
