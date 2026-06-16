












import { lazy, type ComponentType, type ReactNode } from 'react';
import {
  Target, FileText, Users, FolderKanban, ScrollText, MessageCircle,
  ClipboardList, FileCog, Network, Truck, BookOpen, Factory, Wrench,
  AlertTriangle, Package, Boxes, ShoppingCart, DollarSign, BarChart3,
  GraduationCap, Mail, Bot, Bell, Activity, Settings, CheckSquare,
  Calendar, MapPin, Gauge,
} from 'lucide-react';
import type { User } from '@/core/types';
import type { AppPage } from '@/lib/access';


const SalesHubPage = lazy(() => import('@/pages/sales/SalesHubPage'));
const QuotationsPage = lazy(() => import('@/pages/sales/QuotationsPage'));
const ClientsPage = lazy(() => import('@/pages/clients/ClientsPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ContractPage = lazy(() => import('@/pages/contract/ContractPage'));
const ProjectBriefingsPage = lazy(() => import('@/pages/ProjectBriefingsPage'));
const FisaProiectantPage = lazy(() => import('@/pages/checklist/FisaProiectantPage'));
const FisaTemplatesPage = lazy(() => import('@/pages/FisaTemplatesPage'));
const PartsTreePage = lazy(() => import('@/pages/PartsTreePage'));
const PiecesOrderingPage = lazy(() => import('@/pages/PiecesOrderingPage'));
const LibrariesPage = lazy(() => import('@/pages/libraries/LibrariesPage'));
const KanbanPage = lazy(() => import('@/pages/KanbanPage'));
const MaintenancePage = lazy(() => import('@/pages/maintenance/MaintenancePage'));
const ServiceTicketsPage = lazy(() => import('@/pages/service/ServiceTicketsPage'));
const WarehousePage = lazy(() => import('@/pages/warehouse/WarehousePage'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage'));
const ProcurementWorkspacePage = lazy(() => import('@/pages/procurement/ProcurementWorkspacePage'));
const FinancePage = lazy(() => import('@/pages/FinancePage'));
const DocumentsPage = lazy(() => import('@/pages/documents/DocumentsPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const TutorialPage = lazy(() => import('@/pages/tutorial/TutorialPage'));
const EmailPage = lazy(() => import('@/pages/email/EmailPage'));
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'));
const AIAssistantPage = lazy(() => import('@/pages/ai/AIAssistantPage'));
const AlertsPage = lazy(() => import('@/pages/alerts/AlertsPage'));
const UsersPage = lazy(() => import('@/pages/auth/UsersPage'));
const UserSessionsPage = lazy(() => import('@/pages/auth/UserSessionsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const PersonalTasksPage = lazy(() => import('@/pages/tasks/PersonalTasksPage'));
const CalendarPage = lazy(() => import('@/pages/calendar/CalendarPage'));
const DeplasariPage = lazy(() => import('@/pages/deplasari/DeplasariPage'));
const ManagerControlPage = lazy(() => import('@/pages/ManagerControlPage'));

export interface MobilePageCtx {
  user: User;
  
  onNavigate: (pageId: string) => void;
  theme: 'light' | 'dark';
  onThemeChange: (t: 'light' | 'dark') => void;
}

export interface MobilePageDef {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  
  gate: AppPage;
  render: (ctx: MobilePageCtx) => ReactNode;
}

export interface MobilePageGroup {
  title: string;
  pages: MobilePageDef[];
}


export const MOBILE_PAGE_GROUPS: MobilePageGroup[] = [
  { title: 'Control', pages: [
    { id: 'manager-control', label: 'Birou control', icon: Gauge, gate: 'manager-control', render: c => <ManagerControlPage user={c.user} /> },
  ]},
  { title: 'Personal', pages: [
    { id: 'tasks', label: 'Task-uri', icon: CheckSquare, gate: 'tasks', render: c => <PersonalTasksPage user={c.user} /> },
    { id: 'calendar', label: 'Calendar', icon: Calendar, gate: 'calendar', render: c => <CalendarPage user={c.user} /> },
    { id: 'deplasari', label: 'Deplasări', icon: MapPin, gate: 'deplasari', render: c => <DeplasariPage user={c.user} /> },
  ]},
  { title: 'Vânzări', pages: [
    { id: 'sales-hub', label: 'Pipeline', icon: Target, gate: 'sales-hub', render: c => <SalesHubPage user={c.user} /> },
    { id: 'quotations', label: 'Oferte', icon: FileText, gate: 'sales-hub', render: c => <QuotationsPage user={c.user} /> },
    { id: 'clients', label: 'Clienți', icon: Users, gate: 'clients', render: c => <ClientsPage user={c.user} /> },
  ]},
  { title: 'Proiecte & Contracte', pages: [
    { id: 'projects', label: 'Proiecte', icon: FolderKanban, gate: 'projects', render: c => <ProjectsPage user={c.user} onNavigate={c.onNavigate} /> },
    { id: 'contracts', label: 'Contracte', icon: ScrollText, gate: 'contracts', render: c => <ContractPage user={c.user} /> },
  ]},
  { title: 'Proiectare', pages: [
    { id: 'briefings', label: 'Briefing', icon: MessageCircle, gate: 'briefings', render: () => <ProjectBriefingsPage /> },
    { id: 'fisa-proiectant', label: 'Fișa proiectant', icon: ClipboardList, gate: 'fisa-proiectant', render: c => <FisaProiectantPage user={c.user} /> },
    { id: 'fisa-templates', label: 'Template-uri fișe', icon: FileCog, gate: 'fisa-templates', render: () => <FisaTemplatesPage /> },
    { id: 'parts-tree', label: 'Arbore piese', icon: Network, gate: 'parts-tree', render: c => <PartsTreePage user={c.user} /> },
    { id: 'parts-ordering', label: 'De comandat', icon: Truck, gate: 'parts-ordering', render: () => <PiecesOrderingPage /> },
    { id: 'libraries', label: 'Biblioteci', icon: BookOpen, gate: 'libraries', render: c => <LibrariesPage user={c.user} /> },
  ]},
  { title: 'Producție', pages: [
    { id: 'production', label: 'Producție', icon: Factory, gate: 'production', render: c => <KanbanPage user={c.user} onNavigate={c.onNavigate} /> },
    { id: 'maintenance', label: 'Service', icon: Wrench, gate: 'maintenance', render: c => <MaintenancePage user={c.user} /> },
    { id: 'service-tickets', label: 'Tichete', icon: AlertTriangle, gate: 'maintenance', render: c => <ServiceTicketsPage user={c.user} /> },
  ]},
  { title: 'Aprovizionare', pages: [
    { id: 'warehouse', label: 'Depozit', icon: Package, gate: 'warehouse', render: c => <WarehousePage user={c.user} /> },
    { id: 'materials', label: 'Inventar', icon: Boxes, gate: 'materials', render: c => <InventoryPage user={c.user} /> },
    { id: 'purchase-orders', label: 'Achiziții', icon: ShoppingCart, gate: 'purchase-orders', render: c => <ProcurementWorkspacePage user={c.user} /> },
  ]},
  { title: 'Financiar', pages: [
    { id: 'finance', label: 'Financiar', icon: DollarSign, gate: 'finance', render: c => <FinancePage user={c.user} /> },
    { id: 'documents', label: 'Documente', icon: FileText, gate: 'documents', render: c => <DocumentsPage user={c.user} /> },
    { id: 'reports', label: 'Rapoarte', icon: BarChart3, gate: 'reports', render: c => <ReportsPage user={c.user} /> },
  ]},
  { title: 'Instrumente', pages: [
    { id: 'tutorial', label: 'Tutorial', icon: GraduationCap, gate: 'tutorial', render: c => <TutorialPage user={c.user} onNavigate={c.onNavigate} /> },
    { id: 'email', label: 'Email', icon: Mail, gate: 'email', render: c => <EmailPage user={c.user} /> },
    { id: 'chat', label: 'Mesaje', icon: MessageCircle, gate: 'chat', render: c => <ChatPage user={c.user} /> },
    { id: 'ai', label: 'AI', icon: Bot, gate: 'ai', render: c => <AIAssistantPage user={c.user} /> },
    { id: 'alerts', label: 'Alerte', icon: Bell, gate: 'alerts', render: c => <AlertsPage user={c.user} /> },
  ]},
  { title: 'Sistem', pages: [
    { id: 'users', label: 'Utilizatori', icon: Users, gate: 'users', render: c => <UsersPage user={c.user} /> },
    { id: 'sessions', label: 'Sesiuni', icon: Activity, gate: 'users', render: c => <UserSessionsPage user={c.user} /> },
    { id: 'settings', label: 'Setări', icon: Settings, gate: 'settings', render: c => <SettingsPage user={c.user} currentTheme={c.theme} onThemeChange={c.onThemeChange} /> },
  ]},
];


export const MOBILE_PAGES: Record<string, MobilePageDef> = Object.fromEntries(
  MOBILE_PAGE_GROUPS.flatMap(g => g.pages).map(p => [p.id, p]),
);
