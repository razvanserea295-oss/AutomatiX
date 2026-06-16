







import type { ReactNode, ComponentType, CSSProperties } from 'react';

export interface HeroHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  
  eyebrow?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function HeroHeader({
  title, subtitle, eyebrow, icon: Icon, breadcrumb, actions, children, className = '', style,
}: HeroHeaderProps) {
  return (
    






    <header
      className={`shrink-0 flex flex-col justify-center px-0.5 pt-0.5 pb-3.5 border-b border-line/60 ${className}`}
      style={style}
    >
      {breadcrumb && <div className="mb-2 text-pm-xs text-content-muted">{breadcrumb}</div>}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {Icon && (
            <span className="h-11 w-11 rounded-2xl bg-accent-muted flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-accent" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-pm-eyebrow text-accent mb-0.5 flex items-center gap-2">
                <span className="inline-block h-px w-3.5 bg-accent/50" aria-hidden />
                {eyebrow}
              </p>
            )}
            <h1 className="text-pm-2xl font-semibold text-content-primary leading-tight truncate">{title}</h1>
            {subtitle && <p className="mt-1 text-pm-sm text-content-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 self-start">{actions}</div>}
      </div>
      {children && <div className="mt-3 pt-3 border-t border-line/60">{children}</div>}
    </header>
  );
}
