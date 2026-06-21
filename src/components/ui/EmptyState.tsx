



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
    <div className={`enter-scale flex flex-1 flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      {Icon && (
        <div className="mb-5 h-16 w-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center border border-accent/15">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3 className="text-pm-lg font-semibold text-content-primary mb-1.5">{title}</h3>
      {description && <p className="text-pm-sm text-content-secondary max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
