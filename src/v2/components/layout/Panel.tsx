import type { ReactNode } from 'react';
import Card from '@/v2/components/primitives/Card';
import {
  PANEL_BODY, PANEL_BODY_GROW, PANEL_BODY_SCROLL, PANEL_FILL, PANEL_FILL_GROW, PANEL_HEAD, SECTION_GAP,
} from './constants';

export interface PanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Panel fills its flex/grid track (`lg:flex-1 lg:min-h-0`).
   * Body grows — pair with an inner `overflow-auto` table or list.
   */
  fill?: boolean;
  /**
   * Panel body scrolls on lg+ (`lg:overflow-auto`).
   * Use for long single-column lists inside fit layouts.
   */
  scroll?: boolean;
}

/** Standard content surface — fixed header band + natural-height body (page scroll). */
export default function Panel({
  title, subtitle, actions, children, className = '', bodyClassName = '', padding = 'none',
  fill = false, scroll = false,
}: PanelProps) {
  const hasHead = !!(title || subtitle || actions);
  const fillCls = fill || scroll ? PANEL_FILL_GROW : PANEL_FILL;
  const bodyBase = scroll ? PANEL_BODY_SCROLL : fill ? PANEL_BODY_GROW : PANEL_BODY;
  const heightCls = fill || scroll ? 'lg:h-full' : '';
  return (
    <Card padding={padding} className={`pm-panel surface-panel anim-rise flex flex-col justify-start min-w-0 w-full overflow-hidden ${fillCls} ${heightCls} ${className}`}>
      {hasHead && (
        <div className={`shrink-0 ${PANEL_HEAD}`}>
          <div className={`flex flex-wrap items-center justify-between ${SECTION_GAP}`}>
            <div className="min-w-0 flex-1 basis-48">
              {title && <p className="truncate text-pm-md font-semibold leading-tight text-content-primary">{title}</p>}
              {subtitle && <p className="mt-1 text-pm-sm leading-relaxed text-content-muted">{subtitle}</p>}
            </div>
            {actions && <div className="flex max-w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end sm:pl-2">{actions}</div>}
          </div>
        </div>
      )}
      <div className={`${bodyBase} ${bodyClassName}`}>{children}</div>
    </Card>
  );
}
