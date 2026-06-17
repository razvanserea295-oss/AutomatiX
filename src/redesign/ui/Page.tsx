





import type { HTMLAttributes, ReactNode } from 'react';
import Card, { CardHeader, CardBody } from './Card';

interface PageProps extends HTMLAttributes<HTMLDivElement> {
  






  fit?: boolean;
  children: ReactNode;
}



function Page({ fit = false, children, className = '', ...rest }: PageProps) {
  return (
    <div
      className={`app-surface flex flex-1 flex-col min-h-0 ${fit ? 'overflow-hidden' : 'overflow-y-auto'} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

interface PageBodyProps extends HTMLAttributes<HTMLDivElement> {
  
  maxWidth?: 'narrow' | 'wide' | 'full';
  
  padding?: 'flush' | 'tight' | 'comfortable' | 'spacious';
  





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
  wide:   'max-w-[1920px]',
  full:   'max-w-none',
};

const padClass = {
  flush:       'px-0 py-0',
  tight:       'px-6 py-4',
  comfortable: 'px-6 py-6',
  spacious:    'px-6 py-8',
};


function PageBody({
  maxWidth = 'narrow',
  padding = 'comfortable',
  fit = false,
  className = '',
  children,
  ...rest
}: PageBodyProps) {
  const layout = fit ? 'flex flex-1 flex-col min-h-0 gap-6' : 'space-y-7';
  return (
    <div className={`mx-auto w-full ${maxWidthClass[maxWidth]} ${padClass[padding]} ${layout} ${className}`} {...rest}>
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
  2: 'grid grid-cols-2 gap-4',
  3: 'grid grid-cols-2 md:grid-cols-3 gap-4',
  4: 'grid grid-cols-2 md:grid-cols-4 gap-4',
  5: 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4',
  6: 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4',
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
