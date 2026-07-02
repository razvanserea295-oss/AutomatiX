import type { BreadcrumbSegment } from '@/redesign/ui/Breadcrumb';
import { PALETTE_PAGES } from '@/components/shell/palette-data';
import { PAGE_IDS, PAGE_TITLES, type PageId } from './constants';
import { WORKSPACE_SUBPAGES } from './workspaceNav';

export const TAB_PATH_ALIASES: Record<string, string> = {
  raports: 'reports',
  'pieces-ordering': 'parts-ordering',
};

export function resolveTabId(tabId: string): string {
  return TAB_PATH_ALIASES[tabId] ?? tabId;
}

/** Navigable page id from the URL path (tab id), not the workspace shell id. */
export function pathToActivePageId(path: string): string {
  if (path === '/' || path === '') return PAGE_IDS.DASHBOARD;
  if (/^\/stations\/\d+/.test(path)) return PAGE_IDS.STATION_DETAIL;
  if (/^\/parts-tree\/\d+/.test(path)) return PAGE_IDS.PARTS_TREE;
  if (/^\/sales-hub\/\d+/.test(path)) return PAGE_IDS.SALES_HUB;

  const seg = resolveTabId(path.split('/').filter(Boolean)[0] ?? '');
  return seg || PAGE_IDS.DASHBOARD;
}

export interface PageNavMeta {
  pageId: string;
  pageTitle: string;
  sectionLabel: string | null;
  breadcrumbSegments: BreadcrumbSegment[];
}

function workspaceIdForPage(pageId: string): string | null {
  for (const [workspaceId, subs] of Object.entries(WORKSPACE_SUBPAGES)) {
    if (subs.some((sub) => sub.id === pageId)) return workspaceId;
  }
  return null;
}

function buildBreadcrumbSegments(sectionLabel: string | null, pageTitle: string): BreadcrumbSegment[] {
  if (pageTitle === PAGE_TITLES[PAGE_IDS.DASHBOARD] || pageTitle === 'Dashboard') {
    return [{ label: 'Acasă' }];
  }
  if (sectionLabel && sectionLabel !== pageTitle) {
    return [{ label: sectionLabel }, { label: pageTitle }];
  }
  return [{ label: pageTitle }];
}

export function getPageNavMeta(pageId: string): PageNavMeta {
  const palettePage = PALETTE_PAGES.find((page) => page.id === pageId);
  if (palettePage) {
    const sectionLabel = pageId === PAGE_IDS.DASHBOARD ? null : palettePage.breadcrumb;
    const pageTitle = palettePage.title;
    return {
      pageId,
      pageTitle,
      sectionLabel,
      breadcrumbSegments: buildBreadcrumbSegments(sectionLabel, pageTitle),
    };
  }

  const workspaceId = workspaceIdForPage(pageId);
  const subLabel = workspaceId
    ? WORKSPACE_SUBPAGES[workspaceId]?.find((sub) => sub.id === pageId)?.label
    : undefined;
  const pageTitle =
    subLabel
    ?? PAGE_TITLES[pageId as PageId]
    ?? pageId;
  const sectionLabel = workspaceId
    ? (PAGE_TITLES[workspaceId as PageId] ?? null)
    : null;

  return {
    pageId,
    pageTitle,
    sectionLabel,
    breadcrumbSegments: buildBreadcrumbSegments(sectionLabel, pageTitle),
  };
}

export function breadcrumbEndsWithTitle(
  segments: BreadcrumbSegment[] | undefined,
  pageTitle: string,
): boolean {
  if (!segments?.length) return false;
  const last = segments[segments.length - 1];
  if (!last || typeof last.label !== 'string') return false;
  return last.label === pageTitle;
}
