



import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}

export default function ErrorState({
  title = 'Ceva nu a mers', description, onRetry, action, className = '',
}: ErrorStateProps) {
  return (
    <div className={`enter-scale flex flex-1 flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      <span className="mb-4 h-14 w-14 rounded-2xl bg-status-red/10 text-status-red flex items-center justify-center">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <p className="text-pm-md font-semibold text-content-primary">{title}</p>
      {description && <p className="mt-1 text-pm-sm text-content-muted max-w-sm">{description}</p>}
      {(onRetry || action) && (
        <div className="mt-4">
          {action ?? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface-tertiary/40 px-4 text-pm-sm font-medium text-content-secondary hover:bg-surface-tertiary active:scale-[0.97] transition-all"
            >
              Reîncearcă
            </button>
          )}
        </div>
      )}
    </div>
  );
}
