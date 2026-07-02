import type { ReactNode } from 'react';
import { DESKTOP_PAGE_FIT } from '@/redesign/layout/constants';

/** Workspace content — single viewport-fit shell (no nested Page fit). */
export default function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <div className={`app-surface ${DESKTOP_PAGE_FIT} flex flex-col min-h-0`}>
      {children}
    </div>
  );
}
