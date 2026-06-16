// No-auth standalone preview of Fiori Horizon pages, for visual verification with
// Playwright (no backend/login needed — data is mocked). Pick a page via ?page=…
import './ui5-config';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@ui5/webcomponents-react/ThemeProvider';
import { Modals } from '@ui5/webcomponents-react/Modals';
import { useReservationStore } from './store/reservationStore';
import { useTableStore } from './store/tableStore';
import { useMenuStore } from './store/menuStore';
import { useRecipeStore } from './store/recipeStore';
import ReservationsPage from './redesign/pages/ReservationsPage';
import TablesPage from './redesign/pages/TablesPage';
import MenuPage from './redesign/pages/MenuPage';
import RecipesPage from './redesign/pages/RecipesPage';
import AppShell from './components/shell/AppShell';
import './redesign/index.css';
import './redesign/theme.css';

document.body.classList.add('ui5-content-density-compact');

useReservationStore.setState({
  items: [
    { id: 1, code: 'REZ-0001', customer_name: 'Familia Pop', phone: '0721 000 111', party_size: 4, reservation_date: '2026-06-20', reservation_time: '20:00', table_label: 'Terasă 3', status: 'confirmata', notes: null, created_at: '', updated_at: '' },
    { id: 2, code: 'REZ-0002', customer_name: 'Andrei Ionescu', phone: '0744 222 333', party_size: 2, reservation_date: '2026-06-20', reservation_time: '19:30', table_label: 'Salon 5', status: 'asezata', notes: null, created_at: '', updated_at: '' },
    { id: 3, code: 'REZ-0003', customer_name: 'Grup Birou (team dinner)', phone: '0733 555 777', party_size: 8, reservation_date: '2026-06-21', reservation_time: '13:00', table_label: 'VIP', status: 'noua', notes: null, created_at: '', updated_at: '' },
    { id: 4, code: 'REZ-0004', customer_name: 'Maria Dumitru', phone: null, party_size: 3, reservation_date: '2026-06-19', reservation_time: '18:00', table_label: 'Salon 2', status: 'finalizata', notes: null, created_at: '', updated_at: '' },
    { id: 5, code: 'REZ-0005', customer_name: 'George Marin', phone: '0700 000 000', party_size: 5, reservation_date: '2026-06-22', reservation_time: '21:00', table_label: 'Bar 2', status: 'anulata', notes: null, created_at: '', updated_at: '' },
  ] as never, loaded: true, loading: false,
});
useTableStore.setState({
  items: [
    { id: 1, code: 'MESA-0001', label: 'Masa 1', zone: 'Salon', seats: 2, status: 'libera', notes: null, sort_order: 0, created_at: '', updated_at: '' },
    { id: 2, code: 'MESA-0002', label: 'Masa 2', zone: 'Salon', seats: 4, status: 'ocupata', notes: null, sort_order: 0, created_at: '', updated_at: '' },
    { id: 3, code: 'MESA-0003', label: 'Terasă 1', zone: 'Terasă', seats: 6, status: 'rezervata', notes: null, sort_order: 0, created_at: '', updated_at: '' },
    { id: 4, code: 'MESA-0004', label: 'Bar 1', zone: 'Bar', seats: 3, status: 'libera', notes: null, sort_order: 0, created_at: '', updated_at: '' },
    { id: 5, code: 'MESA-0005', label: 'VIP', zone: 'VIP', seats: 10, status: 'ocupata', notes: null, sort_order: 0, created_at: '', updated_at: '' },
  ] as never, loaded: true, loading: false,
});
useMenuStore.setState({
  items: [
    { id: 1, code: 'MENU-0001', name: 'Cheeseburger', description: 'Vită 180g, cheddar, sos casa', category: 'Burgeri', price: 32, currency: 'RON', available: 1, sort_order: 0, created_at: '', updated_at: '' },
    { id: 2, code: 'MENU-0002', name: 'Double Bacon', description: 'Dublu pattie, bacon crocant', category: 'Burgeri', price: 42, currency: 'RON', available: 1, sort_order: 0, created_at: '', updated_at: '' },
    { id: 3, code: 'MENU-0003', name: 'Cartofi prăjiți', description: 'Porție mare', category: 'Garnituri', price: 14, currency: 'RON', available: 1, sort_order: 0, created_at: '', updated_at: '' },
    { id: 4, code: 'MENU-0004', name: 'Limonadă', description: 'Mentă & lime', category: 'Băuturi', price: 12, currency: 'RON', available: 0, sort_order: 0, created_at: '', updated_at: '' },
    { id: 5, code: 'MENU-0005', name: 'Cheesecake', description: 'Fructe de pădure', category: 'Deserturi', price: 18, currency: 'RON', available: 1, sort_order: 0, created_at: '', updated_at: '' },
  ] as never, loaded: true, loading: false,
});

useRecipeStore.setState({
  overview: [
    { menu_item_id: 1, code: 'MENU-0001', name: 'Cheeseburger', category: 'Burgeri', price: 32, currency: 'RON', ingredient_count: 3, cost: 11, margin: 21, food_cost_pct: 34 },
    { menu_item_id: 2, code: 'MENU-0002', name: 'Double Bacon', category: 'Burgeri', price: 42, currency: 'RON', ingredient_count: 0, cost: 0, margin: 0, food_cost_pct: 0 },
    { menu_item_id: 3, code: 'MENU-0003', name: 'Cartofi prăjiți', category: 'Garnituri', price: 14, currency: 'RON', ingredient_count: 2, cost: 8, margin: 6, food_cost_pct: 57 },
  ] as never,
  items: {
    1: [
      { id: 1, menu_item_id: 1, material_id: null, name: 'Chiflă', quantity: 1, unit: 'buc', unit_cost: 2, line_cost: 2 },
      { id: 2, menu_item_id: 1, material_id: null, name: 'Carne vită', quantity: 0.18, unit: 'kg', unit_cost: 40, line_cost: 7.2 },
      { id: 3, menu_item_id: 1, material_id: null, name: 'Cheddar', quantity: 2, unit: 'felii', unit_cost: 0.9, line_cost: 1.8 },
    ],
  } as never,
  loaded: true, loading: false,
});

const page = new URLSearchParams(window.location.search).get('page') || 'reservations';
const Comp = page === 'tables' ? TablesPage : page === 'menu' ? MenuPage : page === 'recipes' ? RecipesPage : ReservationsPage;
const title = page === 'tables' ? 'Mese' : page === 'menu' ? 'Meniu' : page === 'recipes' ? 'Rețete' : 'Rezervări';

// Exercise the REAL AppShell restaurant branch (→ FioriShell) with mock nav.
const NAV = [
  { id: 'dashboard', label: 'Dashboard', isActive: false },
  { id: 'restaurant-workspace', label: 'Restaurant', isActive: true },
  { id: 'procurement-workspace', label: 'Aprovizionare', isActive: false },
  { id: 'finance-workspace', label: 'Financiar', isActive: false },
  { id: 'instrumente-workspace', label: 'Instrumente', isActive: false },
  { id: 'sistem-workspace', label: 'Sistem', isActive: false },
];

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ThemeProvider>
    <Modals />
    <div style={{ height: '100vh' }}>
      <AppShell
        businessType="restaurant"
        title={title}
        userName="Razvan Serea"
        roleName="admin"
        notificationCount={2}
        navbarItems={NAV as never}
        sidebarItems={[]}
        routeKey="preview"
        onNavigateToPage={(id) => { window.location.search = `?page=${id === 'tables' ? 'tables' : 'reservations'}`; }}
        onLogout={() => { /* preview */ }}
      >
        <Comp user={null} />
      </AppShell>
    </div>
  </ThemeProvider>,
);
