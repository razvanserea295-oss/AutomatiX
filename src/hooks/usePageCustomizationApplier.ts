import { useEffect } from 'react';
import { usePageCustomizationStore, applyPageCustomization } from '@/store/pageCustomizationStore';

/**
 * Keeps <html>'s data-pc-* attributes in sync with the ACTIVE page's saved
 * appearance overrides. Re-runs whenever the route (pageId) changes — so stale
 * attrs from the previous page are cleared — and whenever the store changes —
 * so a Save in the wizard repaints the page you're currently on.
 *
 * Call once, at the single place that knows `currentPage` (App.tsx).
 */
export function usePageCustomizationApplier(pageId: string): void {
  const pages = usePageCustomizationStore((s) => s.pages);
  useEffect(() => {
    applyPageCustomization(pageId, pages);
  }, [pageId, pages]);
}
