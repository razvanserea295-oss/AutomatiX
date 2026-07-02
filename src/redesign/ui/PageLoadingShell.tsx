import DashboardPageSkeleton from '@/redesign/ui/loading/DashboardPageSkeleton';
import TablePageSkeleton from '@/redesign/ui/loading/TablePageSkeleton';
import DetailFormPageSkeleton from '@/redesign/ui/loading/DetailFormPageSkeleton';
import MasterDetailPageSkeleton from '@/redesign/ui/loading/MasterDetailPageSkeleton';

interface PageLoadingShellProps {
  label?: string;
  className?: string;
  variant?: 'dashboard' | 'table' | 'detail' | 'master-detail';
}

const SHELLS = {
  dashboard: DashboardPageSkeleton,
  table: TablePageSkeleton,
  detail: DetailFormPageSkeleton,
  'master-detail': MasterDetailPageSkeleton,
} as const;

/** Page-level skeleton shell — no full-screen spinner. */
export default function PageLoadingShell({
  label = 'Se încarcă',
  className = '',
  variant = 'table',
}: PageLoadingShellProps) {
  const Shell = SHELLS[variant];
  return <Shell className={className} label={label} />;
}
