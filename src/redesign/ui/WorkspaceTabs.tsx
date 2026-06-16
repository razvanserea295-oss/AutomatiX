import type { ComponentType, ReactNode } from 'react';

export interface WorkspaceTab {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

interface WorkspaceTabsProps {
  tabs: WorkspaceTab[];
  active: string;
  onChange: (id: string) => void;
  title?: string;
  titleIcon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
}














export default function WorkspaceTabs({ actions }: WorkspaceTabsProps) {
  if (!actions) return null;
  return (
    <div className="shrink-0 border-b border-line/70 bg-surface-secondary">
      <div className="flex items-center justify-end gap-2 px-5 py-2.5">{actions}</div>
    </div>
  );
}
