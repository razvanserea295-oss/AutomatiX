import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { getPageNavMeta, pathToActivePageId } from '@/config/pageNavMeta';

export function useRoutePageMeta() {
  const [location] = useLocation();
  const pageId = useMemo(() => pathToActivePageId(location), [location]);
  return useMemo(() => getPageNavMeta(pageId), [pageId]);
}
