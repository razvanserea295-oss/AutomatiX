import type { ReactNode } from 'react';

export interface PageChromeProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
}

/** Canonical page header — title left, actions right, optional filter toolbar below. */
export default function PageChrome({ title, subtitle, icon, actions, toolbar }: PageChromeProps) {
  return (
    <header className="page-chrome shrink-0 border-b border-line/60 bg-surface-page/95 backdrop-blur-sm">
      <div className="page-chrome-inner anim-fade-slide-in flex flex-wrap items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-6">
        {icon && (
          <span className="page-chrome-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-muted text-accent sm:h-11 sm:w-11 [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-pm-lg font-semibold leading-tight tracking-tight text-content-primary sm:text-pm-xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-pm-sm leading-relaxed text-content-muted sm:mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex w-full max-w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end">
            {actions}
          </div>
        )}
      </div>
      {toolbar && (
        <div className="page-chrome-toolbar border-t border-line/50 px-3 py-3 sm:px-4 lg:px-6">
          {toolbar}
        </div>
      )}
    </header>
  );
}
