import type { ReactNode } from 'react';
import Page from '@/redesign/ui/Page';
import PageToolbar from './PageToolbar';
import CardSlot from './CardSlot';
import { DESKTOP_BODY_FIT, DESKTOP_FOOTER_BAND, DESKTOP_GRID_FILL, LAYOUT_GRID } from './constants';

export interface MasterDetailLayoutProps {
  chrome?: ReactNode;
  toolbar?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  main: ReactNode;
  side: ReactNode;
  footer?: ReactNode;
}

/** Two-column master/detail — main (lg) + side (md) on the 12-col grid. */
export default function MasterDetailLayout({
  chrome,
  toolbar,
  actions,
  leading,
  main,
  side,
  footer,
}: MasterDetailLayoutProps) {
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
        <div className={`${LAYOUT_GRID} ${DESKTOP_GRID_FILL} grid-cols-1 items-stretch lg:grid-cols-12 page-content-grid`}>
          <CardSlot size="lg" as="div" className="max-lg:min-h-[22rem]">{main}</CardSlot>
          <CardSlot size="md" as="div">{side}</CardSlot>
        </div>
        {footer && <div className={DESKTOP_FOOTER_BAND}>{footer}</div>}
      </Page.Body>
    </Page>
  );
}
