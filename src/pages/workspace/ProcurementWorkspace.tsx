import { lazy, Suspense, useState, useEffect } from 'react';
import { Package, Boxes, ShoppingCart } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';
import WorkspaceSkeleton from '@/redesign/ui/WorkspaceSkeleton';



const WarehousePage = lazy(() => import('@/redesign/pages/warehouse/WarehousePage'));
const InventoryPage = lazy(() => import('@/redesign/pages/InventoryPage'));
const ProcurementWorkspacePage = lazy(() => import('@/redesign/pages/procurement/ProcurementWorkspacePage'));

const TABS: WorkspaceTab[] = [
  { id: 'warehouse',       label: 'Depozit',   icon: Package,      prefetch: () => import('@/redesign/pages/warehouse/WarehousePage') },
  { id: 'materials',       label: 'Inventar',  icon: Boxes,        prefetch: () => import('@/redesign/pages/InventoryPage') },
  { id: 'purchase-orders', label: 'Achiziții', icon: ShoppingCart, prefetch: () => import('@/redesign/pages/procurement/ProcurementWorkspacePage') },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function ProcurementWorkspace({ user, onNavigate, initialTab }: Props) {
  const REMOVED = ['three-way-match', 'goods-receipt', 'rfqs', 'receptii', 'furnizori', 'comenzi'];
  const safeInitial = (() => {
    if (!initialTab) return 'warehouse';
    if (initialTab === 'goods-receipt' || initialTab === 'rfqs') return 'purchase-orders';
    if (REMOVED.includes(initialTab)) return 'warehouse';
    return initialTab;
  })();
  const [tab, setTab] = useState(safeInitial);
  const [visited, setVisited] = useState(() => new Set([safeInitial]));

  useEffect(() => {
    if (initialTab && !REMOVED.includes(initialTab)) {
      setTab(initialTab);
      setVisited(p => { const s = new Set(p); s.add(initialTab); return s; });
    }
  }, [initialTab]);

  const handleTabChange = (t: string) => {
    setVisited(prev => { const s = new Set(prev); s.add(t); return s; });
    setTab(t);
    onNavigate(t);
  };

  return (
    <Page fit layout="row">
      <WorkspaceTabs tabs={TABS} active={tab} onChange={handleTabChange} />
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className={tab === 'warehouse' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('warehouse') && <WarehousePage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'materials' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('materials') && <InventoryPage user={user} />}
          </Suspense>
        </div>
        <div className={tab === 'purchase-orders' ? 'flex flex-1 flex-col min-h-0 overflow-hidden' : 'hidden'}>
          <Suspense fallback={<WorkspaceSkeleton />}>
            {visited.has('purchase-orders') && <ProcurementWorkspacePage user={user} />}
          </Suspense>
        </div>
      </div>
    </Page>
  );
}
