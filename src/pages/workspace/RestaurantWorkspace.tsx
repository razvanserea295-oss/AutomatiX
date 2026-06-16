import { lazy, Suspense, useState, useEffect } from 'react';
import { UtensilsCrossed, ClipboardList, BookOpen, Loader2, CalendarCheck, LayoutGrid } from 'lucide-react';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import WorkspaceTabs, { type WorkspaceTab } from '@/components/ui/WorkspaceTabs';

const MenuPage = lazy(() => import('@/redesign/pages/MenuPage'));
const OrdersPage = lazy(() => import('@/redesign/pages/OrdersPage'));
const RecipesPage = lazy(() => import('@/redesign/pages/RecipesPage'));
const ReservationsPage = lazy(() => import('@/redesign/pages/ReservationsPage'));
const TablesPage = lazy(() => import('@/redesign/pages/TablesPage'));

const TABS: WorkspaceTab[] = [
  { id: 'orders', label: 'Comenzi', icon: ClipboardList },
  { id: 'menu', label: 'Meniu', icon: UtensilsCrossed },
  { id: 'recipes', label: 'Rețete', icon: BookOpen },
  { id: 'reservations', label: 'Rezervări', icon: CalendarCheck },
  { id: 'tables', label: 'Mese', icon: LayoutGrid },
];

interface Props {
  user: User | null;
  onNavigate: (page: string, opts?: Record<string, unknown>) => void;
  initialTab?: string;
}

export default function RestaurantWorkspace({ user, onNavigate, initialTab }: Props) {
  const safeInitial = initialTab && TABS.some(t => t.id === initialTab) ? initialTab : 'orders';
  const [tab, setTab] = useState(safeInitial);
  useEffect(() => {
    if (initialTab && TABS.some(t => t.id === initialTab)) setTab(initialTab);
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
          {tab === 'orders' && <OrdersPage user={user} />}
          {tab === 'menu' && <MenuPage user={user} />}
          {tab === 'recipes' && <RecipesPage user={user} />}
          {tab === 'reservations' && <ReservationsPage user={user} />}
          {tab === 'tables' && <TablesPage user={user} />}
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
