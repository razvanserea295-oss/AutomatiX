import type { ReactNode } from 'react';
import type { OptimisticRowState } from '@/redesign/lib/optimistic';

export interface RowLoadingStateProps {
  children: ReactNode;
  updating?: boolean;
  optimisticState?: OptimisticRowState;
  className?: string;
}

function rowClass(updating: boolean, state?: OptimisticRowState): string {
  const parts: string[] = [];
  if (updating) parts.push('ix-row-updating');
  if (state === 'new' || state === 'undo') parts.push(state === 'new' ? 'ix-row-new' : 'ix-row-undo');
  if (state === 'deleting') parts.push('ix-row-deleting');
  return parts.join(' ');
}

/** Row wrapper — pulse while updating; slide/collapse for optimistic mutations. */
export default function RowLoadingState({
  children,
  updating = false,
  optimisticState,
  className = '',
}: RowLoadingStateProps) {
  const stateCls = rowClass(updating, optimisticState);
  return (
    <div className={`${stateCls} ${className}`.trim()}>
      {children}
    </div>
  );
}
