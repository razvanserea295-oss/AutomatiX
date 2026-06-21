











import type { ComponentType } from 'react';
import {
  Target, FileText, Users, FolderKanban, ScrollText, MessageCircle,
  ClipboardList, FileCog, Network, Truck, BookOpen, Factory, Wrench,
  AlertTriangle, Package, Boxes, ShoppingCart, DollarSign, BarChart3,
  GraduationCap, Mail, Bell, Activity, Settings,
  CheckSquare, Calendar, MapPin,
  LayoutDashboard, MonitorDown,
} from 'lucide-react';
import { PAGE_IDS } from './constants';

export interface WorkspaceSubpage {
  
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export const WORKSPACE_SUBPAGES: Record<string, WorkspaceSubpage[]> = {
  [PAGE_IDS.SALES_WORKSPACE]: [
    { id: 'sales-hub', label: 'Pipeline', icon: Target },
    { id: 'quotations', label: 'Oferte', icon: FileText },
    { id: 'clients', label: 'Clienți', icon: Users },
  ],
  [PAGE_IDS.PROJECTS_CONTRACTS_WORKSPACE]: [
    { id: 'projects', label: 'Proiecte', icon: FolderKanban },
    { id: 'contracts', label: 'Contracte', icon: ScrollText },
  ],
  [PAGE_IDS.ENGINEERING_WORKSPACE]: [
    { id: 'briefings', label: 'Briefing', icon: MessageCircle },
    { id: 'fisa-proiectant', label: 'Fișa proiectant', icon: ClipboardList },
    { id: 'fisa-templates', label: 'Template-uri fișe', icon: FileCog },
    { id: 'parts-tree', label: 'Arbore piese', icon: Network },
    { id: 'parts-ordering', label: 'De comandat', icon: Truck },
    { id: 'libraries', label: 'Biblioteci', icon: BookOpen },
  ],
  [PAGE_IDS.PRODUCTION_WORKSPACE]: [
    { id: 'production', label: 'Producție', icon: Factory },
    { id: 'maintenance', label: 'Service', icon: Wrench },
    { id: 'service-tickets', label: 'Tichete', icon: AlertTriangle },
  ],
  [PAGE_IDS.PROCUREMENT_WORKSPACE]: [
    { id: 'warehouse', label: 'Depozit', icon: Package },
    { id: 'materials', label: 'Inventar', icon: Boxes },
    { id: 'purchase-orders', label: 'Achiziții', icon: ShoppingCart },
  ],
  [PAGE_IDS.FINANCE_WORKSPACE]: [
    { id: 'finance', label: 'Financiar', icon: DollarSign },
    { id: 'documents', label: 'Documente', icon: FileText },
    { id: 'reports', label: 'Rapoarte', icon: BarChart3 },
  ],
  [PAGE_IDS.INSTRUMENTE_WORKSPACE]: [
    { id: 'birou-control', label: 'Birou de control', icon: LayoutDashboard },
    { id: 'tutorial', label: 'Tutorial', icon: GraduationCap },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'chat', label: 'Mesaje', icon: MessageCircle },
    { id: 'alerts', label: 'Alerte', icon: Bell },
    { id: 'download-app', label: 'Aplicație desktop', icon: MonitorDown },
  ],
  [PAGE_IDS.PERSONAL_WORKSPACE]: [
    { id: 'tasks', label: 'Task-uri', icon: CheckSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'deplasari', label: 'Deplasări', icon: MapPin },
  ],
  
  
  
  [PAGE_IDS.SISTEM_WORKSPACE]: [
    { id: 'users', label: 'Utilizatori', icon: Users },
    { id: 'sessions', label: 'Sesiuni', icon: Activity },
    { id: 'settings', label: 'Setări', icon: Settings },
  ],
};






export function getWorkspaceSubpages(workspaceId: string | null, role: string): WorkspaceSubpage[] {
  if (!workspaceId) return [];
  const subs = WORKSPACE_SUBPAGES[workspaceId];
  if (!subs) return [];
  if (workspaceId === PAGE_IDS.SISTEM_WORKSPACE && role !== 'admin') {
    return subs.filter((s) => s.id === 'settings');
  }
  return subs;
}







export function workspaceIdForNav(id: string): string | null {
  if (id in WORKSPACE_SUBPAGES) return id;
  if (id === PAGE_IDS.SETTINGS) return PAGE_IDS.SISTEM_WORKSPACE;
  return null;
}
