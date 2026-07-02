import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import CardSlot from './CardSlot';
import Panel, { type PanelProps } from './Panel';
import type { CardSlotSize } from './cardSizes';

export interface TablePanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  size?: CardSlotSize;
  className?: string;
  bodyClassName?: string;
  padding?: PanelProps['padding'];
  slotClassName?: string;
  /** Fixed content above the scrollable table region (filters, tabs). */
  toolbar?: ReactNode;
}

/** Standardized table card — fill + inner scroll on lg+. */
export default function TablePanel({
  title,
  subtitle,
  actions,
  children,
  size = 'lg',
  className = '',
  bodyClassName = '',
  padding = 'none',
  slotClassName = '',
  toolbar,
}: TablePanelProps) {
  return (
    <CardSlot size={size} className={slotClassName}>
      <Panel
        fill
        scroll={!toolbar}
        padding={padding}
        title={title}
        subtitle={subtitle}
        actions={actions}
        className={cn('pm-table-panel w-full', className)}
        bodyClassName={cn(toolbar ? 'flex min-h-0 flex-col p-0' : 'p-0', bodyClassName)}
      >
        {toolbar && <div className="shrink-0">{toolbar}</div>}
        <div className={cn('pm-table-scroll', toolbar && 'min-h-0 flex-1')}>
          {children}
        </div>
      </Panel>
    </CardSlot>
  );
}
