





import type { ReactNode, ComponentType } from 'react';

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Vertically center inside a tall panel — default is top-aligned */
  centered?: boolean;
}

export default function EmptyState({ icon: Icon, title, description, action, centered = false, className = '' }: EmptyStateProps) {
  const alignCls = centered ? 'justify-center' : 'justify-start';
  return (
    <div className={`anim-scale-in flex min-h-[168px] w-full flex-col items-center ${alignCls} px-6 py-10 text-center ${className}`}>
      {Icon && (
        <span className="mb-4 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-muted text-accent">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="max-w-sm text-pm-md font-semibold text-content-primary break-words">{title}</p>
      {description && <p className="mt-1 max-w-sm text-pm-sm text-content-muted break-words">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
