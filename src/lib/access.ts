export type AppPage =
  | 'dashboard'
  | 'production'
  | 'create-project'
  | 'projects'
  | 'project-detail'
  | 'stations'
  | 'station-detail'
  | 'documents'
  | 'materials'
  | 'suppliers'
  | 'purchase-orders'
  | 'goods-receipts'
  | 'finance'
  | 'alerts'
  | 'users'
  | 'settings'
  | 'monitor'
  | 'moderation'
  | 'operatii-config'
  | 'parts-tree'
  | 'parts-ordering'
  | 'briefings'
  | 'fisa-templates'
  | 'contracts'
  | 'engineering'
  | 'libraries'
  | 'warehouse'
  | 'deplasari'
  | 'fisa-proiectant'
  | 'sales-hub'
  | 'clients'
  | 'chat'
  | 'email'
  | 'procurement'
  | 'reports'
  | 'calendar'
  | 'tasks'
  | 'maintenance'
  | 'tutorial'
  | 'remote-support'
  | 'manager-control';
















interface PageAccess {
  
  roles: string[];
  


  viewerOnly?: string[];
}

const pageAccess: Record<Exclude<AppPage, 'project-detail' | 'station-detail'>, PageAccess> = {
  
  chat:                     { roles: ['admin', 'manager', 'user'] },
  email:                    { roles: ['admin', 'manager', 'user'] },
  dashboard:                { roles: ['admin', 'manager', 'user'] },
  settings:                 { roles: ['admin', 'manager', 'user'] },
  alerts:                   { roles: ['admin', 'manager', 'user'] },
  procurement:              { roles: ['admin', 'manager', 'user'] },
  reports:                  { roles: ['admin', 'manager', 'user'] },
  calendar:                 { roles: ['admin', 'manager', 'user'] },
  tasks:                    { roles: ['admin', 'manager', 'user'] },
  maintenance:              { roles: ['admin', 'manager', 'user'] },
  tutorial:                 { roles: ['admin', 'manager', 'user'] },
  'remote-support':         { roles: ['admin', 'manager'] },

  
  'sales-hub':              { roles: ['admin', 'manager', 'user'] },
  contracts:                { roles: ['admin', 'manager', 'user'] },
  clients:                  { roles: ['admin', 'manager', 'user'] },
  projects:                 { roles: ['admin', 'manager', 'user'] },
  'create-project':         { roles: ['admin', 'manager', 'user'] },

  
  engineering:              { roles: ['admin', 'manager', 'user'] },
  'fisa-proiectant':        { roles: ['admin', 'manager', 'user'] },
  libraries:                { roles: ['admin', 'manager', 'user'] },
  'parts-tree':             { roles: ['admin', 'manager', 'user'] },
  'parts-ordering':         { roles: ['admin', 'manager', 'user'] },
  briefings:                { roles: ['admin', 'manager', 'user'] },
  'fisa-templates':         { roles: ['admin', 'manager', 'user'] },

  
  production:               { roles: ['admin', 'manager', 'user'] },
  'operatii-config':        { roles: ['admin', 'manager', 'user'] },

  
  warehouse:                { roles: ['admin', 'manager', 'user'] },
  materials:                { roles: ['admin', 'manager', 'user'] },
  suppliers:                { roles: ['admin', 'manager', 'user'] },
  'purchase-orders':        { roles: ['admin', 'manager', 'user'] },
  'goods-receipts':         { roles: ['admin', 'manager', 'user'] },

  
  finance:                  { roles: ['admin', 'manager', 'user'] },
  documents:                { roles: ['admin', 'manager', 'user'] },
  deplasari:                { roles: ['admin', 'manager', 'user'] },

  
  stations:                 { roles: ['admin', 'manager', 'user'] },

  
  'manager-control':        { roles: ['admin', 'manager', 'user'] },

  
  users:                    { roles: ['admin'] },
  monitor:                  { roles: ['admin'] },
  moderation:               { roles: ['admin'] },
};

export function normalizeRole(roleName?: string | null) {
  return (roleName || '').trim().toLowerCase();
}

export function getRoleExperience(roleName?: string | null) {
  const role = normalizeRole(roleName);
  if (role === 'admin') return 'admin';
  return 'registered_user';
}







function parseCustomPages(customPages: string | null | undefined): Record<string, string> | null {
  if (!customPages) return null;
  try {
    const parsed = JSON.parse(customPages);
    if (Array.isArray(parsed)) {
      const map: Record<string, string> = {};
      for (const p of parsed) map[p] = 'full';
      return Object.keys(map).length > 0 ? map : null;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.keys(parsed).length > 0 ? parsed : null;
    }
  } catch { }
  return null;
}

export function canAccessPage(roleName: string | null | undefined, page: AppPage, customPages?: string | null): boolean {
  const role = normalizeRole(roleName);
  if (page === 'project-detail') return canAccessPage(role, 'projects', customPages);
  if (page === 'station-detail') return canAccessPage(role, 'stations', customPages);
  if (role === 'admin') return true;
  
  
  
  
  
  if (role === 'manager' && page !== 'users' && page !== 'monitor' && page !== 'moderation') return true;
  
  
  
  if (role === 'viewer' && page !== 'users' && page !== 'monitor' && page !== 'moderation') return true;
  if (page === 'dashboard' || page === 'settings') return true;

  
  
  
  
  const cp = parseCustomPages(customPages);
  if (cp && page in cp) {
    return cp[page] !== 'denied';
  }

  const access = pageAccess[page];
  if (!access) return false;
  return access.roles.includes(role);
}


export function isViewerOnly(roleName: string | null | undefined, page: AppPage, customPages?: string | null): boolean {
  const role = normalizeRole(roleName);
  if (role === 'admin') return false;

  
  const cp = parseCustomPages(customPages);
  if (cp && page in cp) {
    return cp[page] === 'viewer' || cp[page] === 'denied';
  }

  
  
  if (role === 'viewer') return true;

  const access = pageAccess[page as keyof typeof pageAccess];
  if (!access) return true;
  return access.viewerOnly?.includes(role) ?? false;
}







export function isPageGated(pageId: string): boolean {
  return pageId in pageAccess;
}


export function getFullAccessPages(roleName: string | null | undefined): AppPage[] {
  const role = normalizeRole(roleName);
  const pages: AppPage[] = [];
  for (const [page, access] of Object.entries(pageAccess)) {
    if (access.roles.includes(role) && !(access.viewerOnly?.includes(role))) {
      pages.push(page as AppPage);
    }
  }
  return pages;
}
