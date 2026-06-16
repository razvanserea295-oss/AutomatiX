/**
 * Global application types.
 * Move global types here instead of in App.tsx or scattered files.
 */





export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role_id: number;
  role_name: string;
  role_description: string;
  active: boolean;
  last_login: string | null;
  custom_pages: string | null;
  must_change_password?: boolean;
  





  job_title?: string | null;
  




  dashboard_config?: string | null;
  

  avatar_path?: string | null;
  created_at: string;
  updated_at: string;
}


export const DASHBOARD_WIDGETS = [
  { id: 'kpi_strip',         label: 'KPI strip (Profit / Venituri / Costuri / etc.)' },
  { id: 'time_range',        label: 'Selector interval timp' },
  { id: 'nav_grid',          label: 'Navigare rapidă (kanban-style)' },
  { id: 'ai_summary',        label: 'Sinteză AI' },
  { id: 'briefing',          label: 'Briefing lunar' },
  { id: 'revenue_chart',     label: 'Grafic venituri' },
  { id: 'inbox',             label: 'Inbox predări' },
  { id: 'active_projects',   label: 'Tabel proiecte active' },
  { id: 'alerts_panel',      label: 'Alerte recente' },
  { id: 'critical_stock',    label: 'Stoc critic' },
  { id: 'production_stages', label: 'Producție pe etape' },
  { id: 'activity',          label: 'Activitate (totaluri)' },
] as const;
export type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number]['id'];






export function parseDashboardConfig(json: string | null | undefined): Record<DashboardWidgetId, boolean> {
  const out = Object.fromEntries(DASHBOARD_WIDGETS.map(w => [w.id, true])) as Record<DashboardWidgetId, boolean>;
  if (!json) return out;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') {
      for (const w of DASHBOARD_WIDGETS) {
        if (typeof parsed[w.id] === 'boolean') out[w.id] = parsed[w.id];
      }
    }
  } catch {  }
  return out;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Session {
  token: string;
  user: User;
  expiresAt?: string;
}








export interface CommandError {
  code: number;
  message: string;
}




export class AppError extends Error {
  constructor(
    message: string,
    public code: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  static fromCommand(error: CommandError): AppError {
    return new AppError(error.message, error.code);
  }

  static fromUnknown(error: unknown, fallbackMessage = 'An unexpected error occurred'): AppError {
    if (error instanceof AppError) return error;
    if (error instanceof Error) return new AppError(error.message);
    return new AppError(fallbackMessage);
  }
}









export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function createInitialAsyncState<T>(): AsyncState<T> {
  return {
    data: null,
    loading: false,
    error: null,
  };
}





export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}





export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
  };
}





export interface Breadcrumb {
  label: string;
  page?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isActive?: boolean;
  onSelect?: () => void;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}





export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}





export interface Project {
  id: number;
  name: string;
  description: string;
  client_id: number;
  client_name?: string;
  status: string;
  stage: string;
  priority: string;
  
  
  estimated_value?: number;
  estimated_cost?: number;
  budget?: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}




