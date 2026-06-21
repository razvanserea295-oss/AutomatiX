





import type { ReactNode, ComponentType } from 'react';

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`anim-scale-in flex flex-1 flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      {Icon && (
        <span className="anim-scale-in mb-4 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-muted text-accent">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <p className="max-w-sm text-pm-md font-semibold text-content-primary break-words">{title}</p>
      {description && <p className="mt-1 max-w-sm text-pm-sm text-content-muted break-words">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
