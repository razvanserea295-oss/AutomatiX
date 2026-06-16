





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

const maxWidthClass = {
  narrow: 'max-w-[1120px]',
  wide:   'max-w-[1400px]',
  full:   'max-w-none',
};

const padClass = {
  flush:       'px-0 py-0',
  tight:       'px-5 py-5',
  comfortable: 'px-6 py-6',
  spacious:    'px-8 py-7',
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
