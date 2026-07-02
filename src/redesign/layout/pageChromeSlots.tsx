import { isValidElement, type ReactElement, type ReactNode } from 'react';
import PageChrome from './PageChrome';
import type { PageChromeProps } from './PageChrome';

export function isPageChromeElement(node: ReactNode): node is ReactElement<PageChromeProps> {
  return isValidElement(node) && node.type === PageChrome;
}

export interface PageLayoutSlotOptions {
  toolbar?: ReactNode;
  actions?: ReactNode;
}

export interface PageLayoutSlots {
  chromeEffects: ReactNode;
  toolbar?: ReactNode;
  bodyActions?: ReactNode;
}

/** Pull toolbar + mobile actions out of PageChrome; keep headless chrome mounted for titlebar effects. */
export function resolvePageLayoutSlots(
  chrome?: ReactNode,
  options: PageLayoutSlotOptions = {},
): PageLayoutSlots {
  const { toolbar: explicitToolbar, actions: explicitActions } = options;

  if (!isPageChromeElement(chrome)) {
    return {
      chromeEffects: chrome,
      toolbar: explicitToolbar,
      bodyActions: explicitActions,
    };
  }

  const { toolbar: chromeToolbar, actions, secondaryActions } = chrome.props;

  const bodyActions = explicitActions ?? (
    actions || secondaryActions ? (
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        {secondaryActions}
        {actions}
      </div>
    ) : undefined
  );

  return {
    chromeEffects: chrome,
    toolbar: explicitToolbar ?? chromeToolbar,
    bodyActions,
  };
}
