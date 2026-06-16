import { Eye } from 'lucide-react';
import { useViewerMode } from '@/hooks/useViewerMode';
import type { AppPage } from '@/lib/access';





export function ViewerBanner({ page }: { page: AppPage }) {
  const isViewer = useViewerMode(page);
  if (!isViewer) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-status-amber/10 border-b border-status-amber/20 text-status-amber text-xs">
      <Eye className="h-3.5 w-3.5" />
      <span>Mod vizualizare — nu poti edita pe aceasta pagina</span>
    </div>
  );
}
