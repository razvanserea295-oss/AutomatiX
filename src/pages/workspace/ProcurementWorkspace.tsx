import { lazy, Suspense, useState, useEffect } from 'react';
import { Package, Boxes, ShoppingCart, Loader2 } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';






const WarehousePage = lazy(() => import('@/redesign/pages/warehouse/WarehousePage'));
const InventoryPage = lazy(() => import('@/redesign/pages/InventoryPage'));
const ProcurementWorkspacePage = lazy(() => import('@/redesign/pages/procurement/ProcurementWorkspacePage'));

const TABS: WorkspaceTab[] = [
  { id: 'warehouse', label: 'Depozit', icon: Package },
  { id: 'materials', label: 'Inventar', icon: Boxes },
  { id: 'purchase-orders', label: 'Achiziții', icon: ShoppingCart },
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
  useEffect(() => {
    if (initialTab && !REMOVED.includes(initialTab)) setTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (t: string) => {
    setTab(t);
    onNavigate(t);
  };

  return (
    <Page fit>
      <WorkspaceTabs
        tabs={TABS}
        active={tab}
        onChange={handleTabChange}
      />
      <Suspense fallback={<Loading />}>
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {tab === 'warehouse' && <WarehousePage user={user} />}
          {tab === 'materials' && <InventoryPage user={user} />}
          {tab === 'purchase-orders' && <ProcurementWorkspacePage user={user} />}
        </div>
      </Suspense>
    </Page>
  );
}

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
    </div>
  );
}
