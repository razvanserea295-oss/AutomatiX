import type { LucideIcon } from '@/icons';
import {
  LayoutDashboard, Target, FileText, Users, FolderKanban, ScrollText,
  MessageCircle, ClipboardList, FileCog, Network, Truck, BookOpen,
  Factory, Wrench, AlertTriangle, Package, Boxes, ShoppingCart,
  DollarSign, BarChart3, Mail, Bell, CheckSquare, Calendar, MapPin,
  GraduationCap, MonitorDown, Printer, MonitorSmartphone, KeyRound,
  Settings, Activity, Sparkles, Gauge, Building2, Store,
} from '@/icons';

export type V2NavItem = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  page?: string;
};

export type V2NavGroup = {
  id: string;
  label: string;
  items: V2NavItem[];
};

export const V2_NAV: V2NavGroup[] = [
  {
    id: 'home',
    label: 'Acasă',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/v2', icon: LayoutDashboard, page: 'dashboard' },
      { id: 'manager-control', label: 'Birou control', path: '/v2/manager-control', icon: Gauge, page: 'manager-control' },
    ],
  },
  {
    id: 'sales',
    label: 'Vânzări',
    items: [
      { id: 'sales-hub', label: 'Pipeline', path: '/v2/sales-hub', icon: Target, page: 'sales-hub' },
      { id: 'quotations', label: 'Oferte', path: '/v2/quotations', icon: FileText, page: 'quotations' },
      { id: 'clients', label: 'Clienți', path: '/v2/clients', icon: Users, page: 'clients' },
    ],
  },
  {
    id: 'projects',
    label: 'Proiecte',
    items: [
      { id: 'projects', label: 'Proiecte', path: '/v2/projects', icon: FolderKanban, page: 'projects' },
      { id: 'contracts', label: 'Contracte', path: '/v2/contracts', icon: ScrollText, page: 'contracts' },
    ],
  },
  {
    id: 'engineering',
    label: 'Inginerie',
    items: [
      { id: 'briefings', label: 'Briefing', path: '/v2/briefings', icon: MessageCircle, page: 'briefings' },
      { id: 'fisa-proiectant', label: 'Fișă proiectant', path: '/v2/fisa-proiectant', icon: ClipboardList, page: 'fisa-proiectant' },
      { id: 'fisa-templates', label: 'Template-uri', path: '/v2/fisa-templates', icon: FileCog, page: 'fisa-templates' },
      { id: 'parts-tree', label: 'Arbore piese', path: '/v2/parts-tree', icon: Network, page: 'parts-tree' },
      { id: 'parts-ordering', label: 'De comandat', path: '/v2/parts-ordering', icon: Truck, page: 'parts-ordering' },
      { id: 'libraries', label: 'Biblioteci', path: '/v2/libraries', icon: BookOpen, page: 'libraries' },
    ],
  },
  {
    id: 'production',
    label: 'Producție',
    items: [
      { id: 'production', label: 'Kanban', path: '/v2/production', icon: Factory, page: 'production' },
      { id: 'stations', label: 'Stații', path: '/v2/stations', icon: Building2, page: 'maintenance' },
      { id: 'maintenance', label: 'Service', path: '/v2/maintenance', icon: Wrench, page: 'maintenance' },
      { id: 'service-tickets', label: 'Tichete', path: '/v2/service-tickets', icon: AlertTriangle, page: 'service-tickets' },
    ],
  },
  {
    id: 'procurement',
    label: 'Achiziții',
    items: [
      { id: 'warehouse', label: 'Depozit', path: '/v2/warehouse', icon: Package, page: 'warehouse' },
      { id: 'materials', label: 'Inventar', path: '/v2/materials', icon: Boxes, page: 'materials' },
      { id: 'purchase-orders', label: 'Achiziții', path: '/v2/purchase-orders', icon: ShoppingCart, page: 'purchase-orders' },
      { id: 'suppliers', label: 'Furnizori', path: '/v2/suppliers', icon: Store, page: 'purchase-orders' },
    ],
  },
  {
    id: 'finance',
    label: 'Financiar',
    items: [
      { id: 'finance', label: 'Financiar', path: '/v2/finance', icon: DollarSign, page: 'finance' },
      { id: 'documents', label: 'Documente', path: '/v2/documents', icon: FileText, page: 'documents' },
      { id: 'reports', label: 'Rapoarte', path: '/v2/reports', icon: BarChart3, page: 'reports' },
    ],
  },
  {
    id: 'comunicare',
    label: 'Comunicare',
    items: [
      { id: 'email', label: 'Email', path: '/v2/email', icon: Mail, page: 'email' },
      { id: 'chat', label: 'Mesaje', path: '/v2/chat', icon: MessageCircle, page: 'chat' },
      { id: 'alerts', label: 'Alerte', path: '/v2/alerts', icon: Bell, page: 'alerts' },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    items: [
      { id: 'tasks', label: 'Task-uri', path: '/v2/tasks', icon: CheckSquare, page: 'tasks' },
      { id: 'calendar', label: 'Calendar', path: '/v2/calendar', icon: Calendar, page: 'calendar' },
      { id: 'deplasari', label: 'Deplasări', path: '/v2/deplasari', icon: MapPin, page: 'deplasari' },
    ],
  },
  {
    id: 'instrumente',
    label: 'Instrumente',
    items: [
      { id: 'tutorial', label: 'Tutorial', path: '/v2/tutorial', icon: GraduationCap, page: 'tutorial' },
      { id: 'download-app', label: 'Aplicație desktop', path: '/v2/download-app', icon: MonitorDown, page: 'tutorial' },
      { id: 'print', label: 'Imprimare', path: '/v2/print', icon: Printer, page: 'tutorial' },
      { id: 'remote-support', label: 'Asistență', path: '/v2/remote-support', icon: MonitorSmartphone, page: 'remote-support' },
      { id: 'shared-files', label: 'Fișiere', path: '/v2/shared-files', icon: FileText, page: 'tutorial' },
      { id: 'arhiva', label: 'Arhivă', path: '/v2/arhiva', icon: FileText, page: 'users' },
      { id: 'licente', label: 'Licențe', path: '/v2/licente', icon: KeyRound, page: 'users' },
      { id: 'ai', label: 'AI Assistant', path: '/v2/ai', icon: Sparkles, page: 'dashboard' },
    ],
  },
  {
    id: 'sistem',
    label: 'Sistem',
    items: [
      { id: 'users', label: 'Utilizatori', path: '/v2/users', icon: Users, page: 'users' },
      { id: 'sessions', label: 'Sesiuni', path: '/v2/sessions', icon: Activity, page: 'users' },
      { id: 'settings', label: 'Setări', path: '/v2/settings', icon: Settings, page: 'settings' },
    ],
  },
];

export function flattenV2Nav(): V2NavItem[] {
  return V2_NAV.flatMap((g) => g.items);
}

export function titleForV2Path(path: string): string {
  const item = flattenV2Nav().find((i) => i.path === path || path.startsWith(i.path + '/'));
  return item?.label ?? 'automatiX';
}
