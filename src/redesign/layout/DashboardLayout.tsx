import type { ReactNode } from 'react';
import Page from '@/redesign/ui/Page';
import PageToolbar from './PageToolbar';
import { DESKTOP_BODY_FIT, DESKTOP_FOOTER_BAND, PAGE_CONTENT_SHELL } from './constants';

export interface DashboardLayoutProps {
  chrome?: ReactNode;
  toolbar?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  kpis?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  contentClassName?: string;
}

/** Dashboard shell — optional chrome header, KPI strip, main grid, optional footer. */
export default function DashboardLayout({
  chrome,
  toolbar,
  actions,
  leading,
  kpis,
  children,
  footer,
  bodyClassName = '',
  contentClassName = '',
}: DashboardLayoutProps) {
  return (
    <Page fit>
      {chrome}
      <Page.Body
        fit
        maxWidth="full"
        padding="comfortable"
        className={`page-body-polish ${DESKTOP_BODY_FIT} ${bodyClassName}`}
      >
        <PageToolbar leading={leading} toolbar={toolbar} actions={actions} />
        {kpis && <div className="kpi-strip shrink-0 stagger-in">{kpis}</div>}
        <div className={`${PAGE_CONTENT_SHELL} ${contentClassName}`}>
          {children}
        </div>
        {footer && <div className={`page-footer-band shrink-0 ${DESKTOP_FOOTER_BAND}`}>{footer}</div>}
      </Page.Body>
    </Page>
  );
}
