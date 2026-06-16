







export const PAGE_IDS = {
  DASHBOARD: 'dashboard',
  PROJECTS: 'projects',
  PROJECT_DETAIL: 'project-detail',
  CLIENTS: 'clients',
  PRODUCTION: 'production',
  CREATE_PROJECT: 'create-project',
  STATIONS: 'stations',
  STATION_DETAIL: 'station-detail',
  MATERIALS: 'materials',
  SUPPLIERS: 'suppliers',
  PURCHASE_ORDERS: 'purchase-orders',
  GOODS_RECEIPTS: 'goods-receipts',
  DOCUMENTS: 'documents',
  FINANCE: 'finance',
  ALERTS: 'alerts',
  AI: 'ai',
  USERS: 'users',
  SETTINGS: 'settings',
  OPERATII_CONFIG: 'operatii-config',
  PARTS_TREE: 'parts-tree',
  PARTS_ORDERING: 'parts-ordering',
  BRIEFINGS: 'briefings',
  FISA_TEMPLATES: 'fisa-templates',
  CONTRACTS: 'contracts',
  ENGINEERING: 'engineering',
  LIBRARIES: 'libraries',
  WAREHOUSE: 'warehouse',
  DEPLASARI: 'deplasari',
  FISA_PROIECTANT: 'fisa-proiectant',
  SALES_HUB: 'sales-hub',
  CHAT: 'chat',
  EMAIL: 'email',
  MAINTENANCE: 'maintenance',

  MENU: 'menu',
  ORDERS: 'orders',
  RECIPES: 'recipes',
  RESERVATIONS: 'reservations',
  TABLES: 'tables',
  QUOTATIONS: 'quotations',
  CALENDAR: 'calendar',
  TIME_TRACKING: 'time-tracking',
  SERVICE_TICKETS: 'service-tickets',
  THREE_WAY_MATCH: 'three-way-match',
  RFQS: 'rfqs',
  REPORTS: 'reports',
  TASKS: 'tasks',
  GOODS_RECEIPT: 'goods-receipt',
  TABLET: 'tablet',
  TUTORIAL: 'tutorial',
  MANAGER_CONTROL: 'manager-control',
  
  SALES_WORKSPACE: 'sales-workspace',
  ENGINEERING_WORKSPACE: 'engineering-workspace',
  PRODUCTION_WORKSPACE: 'production-workspace',
  PROCUREMENT_WORKSPACE: 'procurement-workspace',
  FINANCE_WORKSPACE: 'finance-workspace',
  PROJECTS_CONTRACTS_WORKSPACE: 'projects-contracts-workspace',
  INSTRUMENTE_WORKSPACE: 'instrumente-workspace',
  PERSONAL_WORKSPACE: 'personal-workspace',
  SISTEM_WORKSPACE: 'sistem-workspace',
  RESTAURANT_WORKSPACE: 'restaurant-workspace',
} as const;

export type PageId = (typeof PAGE_IDS)[keyof typeof PAGE_IDS];




export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];
export const DEFAULT_THEME: Theme = THEMES.DARK;




export const PAGE_TITLES: Record<PageId, string> = {
  [PAGE_IDS.DASHBOARD]: 'Dashboard',
  [PAGE_IDS.PROJECTS]: 'Proiecte',
  [PAGE_IDS.PROJECT_DETAIL]: 'Proiect',
  [PAGE_IDS.CLIENTS]: 'Clienți',
  [PAGE_IDS.PRODUCTION]: 'Producție',
  [PAGE_IDS.CREATE_PROJECT]: 'Creare',
  [PAGE_IDS.STATIONS]: 'Stații',
  [PAGE_IDS.STATION_DETAIL]: 'Stație',
  [PAGE_IDS.MATERIALS]: 'Inventar',
  [PAGE_IDS.SUPPLIERS]: 'Furnizori',
  [PAGE_IDS.PURCHASE_ORDERS]: 'Comenzi',
  [PAGE_IDS.GOODS_RECEIPTS]: 'Recepții',
  [PAGE_IDS.DOCUMENTS]: 'Documente',
  [PAGE_IDS.FINANCE]: 'Financiar',
  [PAGE_IDS.ALERTS]: 'Alerte',
  [PAGE_IDS.AI]: 'AI',
  [PAGE_IDS.USERS]: 'Utilizatori',
  [PAGE_IDS.SETTINGS]: 'Setări',
  [PAGE_IDS.OPERATII_CONFIG]: 'Operații',
  [PAGE_IDS.PARTS_TREE]: 'Arbore',
  [PAGE_IDS.PARTS_ORDERING]: 'De comandat',
  [PAGE_IDS.BRIEFINGS]: 'Briefing',
  [PAGE_IDS.FISA_TEMPLATES]: 'Template-uri fișe',
  [PAGE_IDS.CONTRACTS]: 'Contracte',
  [PAGE_IDS.ENGINEERING]: 'Proiectare',
  [PAGE_IDS.LIBRARIES]: 'Biblioteci',
  [PAGE_IDS.WAREHOUSE]: 'Depozit',
  [PAGE_IDS.DEPLASARI]: 'Deplasări',
  [PAGE_IDS.FISA_PROIECTANT]: 'Fișa',
  [PAGE_IDS.SALES_HUB]: 'Vânzări',
  [PAGE_IDS.CHAT]: 'Mesaje',
  [PAGE_IDS.EMAIL]: 'Email',
  [PAGE_IDS.MAINTENANCE]: 'Service',
  [PAGE_IDS.MENU]: 'Meniu',
  [PAGE_IDS.ORDERS]: 'Comenzi',
  [PAGE_IDS.RECIPES]: 'Rețete',
  [PAGE_IDS.QUOTATIONS]: 'Oferte',
  [PAGE_IDS.CALENDAR]: 'Calendar',
  [PAGE_IDS.TIME_TRACKING]: 'Pontaj',
  [PAGE_IDS.SERVICE_TICKETS]: 'Tichete service',
  [PAGE_IDS.THREE_WAY_MATCH]: '3-way match',
  [PAGE_IDS.RFQS]: 'RFQ',
  [PAGE_IDS.REPORTS]: 'Rapoarte',
  [PAGE_IDS.TASKS]: 'Task-urile mele',
  [PAGE_IDS.GOODS_RECEIPT]: 'Recepție marfă',
  [PAGE_IDS.TABLET]: 'Stație tabletă',
  [PAGE_IDS.TUTORIAL]: 'Tutorial',
  [PAGE_IDS.MANAGER_CONTROL]: 'Birou control',
  [PAGE_IDS.SALES_WORKSPACE]: 'Vânzări',
  [PAGE_IDS.ENGINEERING_WORKSPACE]: 'Proiectare',
  [PAGE_IDS.PRODUCTION_WORKSPACE]: 'Producție',
  [PAGE_IDS.PROCUREMENT_WORKSPACE]: 'Aprovizionare',
  [PAGE_IDS.FINANCE_WORKSPACE]: 'Financiar',
  [PAGE_IDS.PROJECTS_CONTRACTS_WORKSPACE]: 'Proiecte & Contracte',
  [PAGE_IDS.INSTRUMENTE_WORKSPACE]: 'Instrumente',
  [PAGE_IDS.PERSONAL_WORKSPACE]: 'Personal',
  [PAGE_IDS.SISTEM_WORKSPACE]: 'Sistem',
  [PAGE_IDS.RESTAURANT_WORKSPACE]: 'Restaurant',
  [PAGE_IDS.RESERVATIONS]: 'Rezervări',
  [PAGE_IDS.TABLES]: 'Mese',
};




export const ANIMATION_DURATION = {
  FAST: 0.15,
  NORMAL: 0.2,
  SLOW: 0.5,
} as const;




export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px',
} as const;




export const API = {
  REQUEST_TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  CACHE_TTL_MS: 5 * 60 * 1000, 
} as const;




export const FEATURES = {
  ENABLE_AI_FEATURES: true,
  ENABLE_ADVANCED_ANALYTICS: true,
  ENABLE_DARK_MODE: true,
  ENABLE_NOTIFICATIONS: true,
} as const;
