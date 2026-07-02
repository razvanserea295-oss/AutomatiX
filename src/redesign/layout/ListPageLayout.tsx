import type { ReactNode } from 'react';
import Page from '@/redesign/ui/Page';
import PageToolbar from './PageToolbar';
import { DESKTOP_BODY_FIT, DESKTOP_CONTENT_GROW } from './constants';

export interface ListPageLayoutProps {
  chrome?: ReactNode;
  toolbar?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Single primary column — list/table pages. Body grows; put `Panel scroll` on the list surface. */
export default function ListPageLayout({
  chrome,
  toolbar,
  actions,
  leading,
  children,
  footer,
}: ListPageLayoutProps) {
  return (
    <Page fit>
      {chrome}
      <Page.Body
        fit
        maxWidth="full"
        padding="comfortable"
        className={`page-body-polish ${DESKTOP_BODY_FIT}`}
      >
        <PageToolbar leading={leading} toolbar={toolbar} actions={actions} />
        <div className={`${DESKTOP_CONTENT_GROW} page-content-grid`}>{children}</div>
        {footer && <div className="shrink-0">{footer}</div>}
      </Page.Body>
    </Page>
  );
}
