import { Eye } from 'lucide-react';
import { useViewerMode } from '@/hooks/useViewerMode';
import type { AppPage } from '@/lib/access';





export function ViewerBanner({ page }: { page: AppPage }) {
  const isViewer = useViewerMode(page);
  if (!isViewer) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-0.5 border-b border-status-amber/15 text-status-amber/60 text-[11px]">
      <Eye className="h-3 w-3" />
      <span>Mod vizualizare</span>
    </div>
  );
}
