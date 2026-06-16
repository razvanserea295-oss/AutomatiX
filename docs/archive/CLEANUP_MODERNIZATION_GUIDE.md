# 🎯 COMPREHENSIVE CLEANUP & MODERNIZATION GUIDE

## Executive Summary

Your Promix Automatix application is a well-structured React/Tauri desktop app, but it suffers from **classic rapid-development patterns** that need cleanup:

- ❌ Monolithic 600-line `App.tsx`
- ❌ Magic strings scattered everywhere
- ❌ Empty stores/hooks directories (tools not utilized)
- ❌ No centralized error handling
- ❌ `console.error()` statements throughout
- ❌ No state management (despite Zustand in dependencies)

This guide transforms it into a **production-grade, maintainable codebase**.

---

## 📋 What Was Created

### **1. Configuration Layer** (`src/config/`)

| File | Purpose | Benefit |
|------|---------|---------|
| `constants.ts` | All magic strings (PAGE_IDS, ROLES, THEMES, etc.) | Type-safe, searchable, DRY |
| `localStorage.ts` | Storage key constants + helpers | Centralized, consistent naming |
| `navigation.ts` | Navigation configuration | _(To be expanded)_ |

**Before:**
```typescript
// Scattered throughout:
const pageTitles = { dashboard: 'Tablou de bord', ... };
localStorage.setItem('promix_token', token);
if (user.role_name === 'admin' || user.role_name === 'manager') {
```

**After:**
```typescript
// Import constants
import { PAGE_IDS, ROLES, STORAGE_KEYS } from '@/config';
import { setStorage } from '@/config/localStorage';

setStorage(STORAGE_KEYS.TOKEN, token);
if (user.role_name === ROLES.ADMIN || user.role_name === ROLES.MANAGER) {
```

### **2. Core Infrastructure** (`src/core/`)

| File | Purpose | Benefit |
|------|---------|---------|
| `logger.ts` | Centralized logging & error tracking | Consistent, easy to extend to Sentry/DataDog |
| `types.ts` | Global types moved from scattered files | Single source of truth, better IDE support |
| `errors.ts` | Error utilities _(to be created)_ | Type-safe error handling |

**Before:**
```typescript
// Everywhere:
try {
  const data = await invoke('get_projects', { token });
} catch (err) {
  console.error('Failed to load projects:', err);  // ❌ 18 places like this
}
```

**After:**
```typescript
import { logger } from '@/core/logger';

try {
  const data = await apiCommand('get_projects');
} catch (err) {
  logger.error('Failed to load projects', err, { endpoint: 'get_projects' });
  // Logs are tracked, can be sent to analytics
}
```

### **3. API Layer** (`src/api/`)

| File | Purpose | Benefit |
|------|---------|---------|
| `commands.ts` | Unified Tauri command wrapper | Error handling, logging, token management |
| `[resource]-api.ts` | Future API modules per resource | Scalable, organized |

**Before:**
```typescript
// Scattered in 20+ components:
const getProjectStages = async (projectId: number) => {
  const data = await invoke('get_project_stages_custom', {
    token: getPromixToken(),
    projectId,
  });
  return data;
};

// Manual error handling in each place
```

**After:**
```typescript
// One place to call from:
const stages = await apiCommand('get_project_stages_custom', { projectId });

// Errors are automatically logged, token included, etc.
```

### **4. State Management** (`src/store/`)

| Store | Purpose | Replaces |
|-------|---------|----------|
| `authStore.ts` | User session, login, logout | 5+ useState in App.tsx |
| `navigationStore.ts` | Page routing, selections | 8+ useState in App.tsx |
| `themeStore.ts` | Dark/light mode | 1 useState + manual DOM manipulation |
| `index.ts` | Central exports | Makes importing easier |

**Before:**
```typescript
// In App.tsx:
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [user, setUser] = useState<User | null>(null);
const [currentPage, setCurrentPage] = useState<string>('dashboard');
const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
const [productionPiecesFocusId, setProductionPiecesFocusId] = useState<number | null>(null);
const [theme, setTheme] = useState<'light' | 'dark'>('dark');

// ... 200+ lines of state logic
```

**After:**
```typescript
// In any component:
const { user, isAuthenticated, logout } = useAuthStore();
const { currentPage, navigateTo, selectProject } = useNavigationStore();
const { theme, toggleTheme } = useThemeStore();

// That's it! State is persistent, observable, debuggable with Zustand DevTools
```

---

## 🏗️ New Folder Structure

```
src/
├── config/                       # ✨ NEW - All constants
│   ├── constants.ts             # PAGE_IDS, ROLES, THEMES, PAGE_TITLES
│   ├── localStorage.ts          # Storage key constants + helpers
│   └── navigation.ts            # Navigation map
│
├── core/                        # ✨ NEW - Core infrastructure
│   ├── logger.ts               # Centralized logging
│   ├── types.ts                # Global types (User, LoginResponse, etc.)
│   └── errors.ts               # Error utilities (future)
│
├── api/                         # ✨ REORGANIZED - Tauri API layer
│   ├── commands.ts             # Unified command wrapper (ERROR HANDLING!)
│   ├── client.ts               # API client factory (future)
│   ├── auth-api.ts             # Auth endpoints
│   ├── projects-api.ts         # Project endpoints
│   ├── pieces-api.ts           # Piece operations
│   └── ...
│
├── store/                       # ✨ NEW - Zustand stores (was empty!)
│   ├── authStore.ts            # Auth + session management
│   ├── navigationStore.ts       # Page routing state
│   ├── themeStore.ts           # Theme/appearance
│   └── index.ts                # Central exports
│
├── hooks/                       # ✨ ENHANCED - Custom hooks (was empty!)
│   ├── useAuth.ts              # Auth utilities
│   ├── useApi.ts               # Data fetching with loading/error
│   ├── useNavigation.ts        # Navigation helpers
│   ├── useTauri.ts             # Tauri environment
│   └── index.ts
│
├── lib/                         # ✓ KEEP - Utilities (reorganize)
│   ├── format.ts               # Date/currency formatting
│   ├── permissions.ts          # Permission checks
│   ├── roleWorkspace.ts        # Role-based logic
│   └── cn.ts
│
├── components/                  # ✓ REORGANIZE
│   ├── ui/                      # Base components (Button, Input, Modal)
│   ├── common/                  # Shared (DataTable, FilterBar, Badge)
│   ├── form/                    # Form components
│   ├── layout/                  # OperationsLayout, Header, Sidebar
│   └── settings/
│
├── pages/                       # ✓ CLEAN & REFACTOR
│   ├── auth/
│   ├── dashboard/
│   ├── projects/
│   └── ...
│
├── types/                       # ✓ CONSOLIDATE
│   ├── piece.ts
│   ├── project.ts              # ← Extract from pages
│   ├── worker.ts               # ← Extract from pages
│   └── api.ts
│
├── utils/                       # ✓ ORGANIZE
│   ├── excelImport.ts
│   ├── validation.ts           # ← NEW
│   └── date-utils.ts           # ← NEW
│
├── App.tsx                      # ← SIMPLIFIED 600→150 lines
├── AppRouter.tsx               # ← NEW - Routing logic extracted
└── main.tsx
```

---

## 🔄 BEFORE vs AFTER - Real Examples

### Example 1: Login Flow

**BEFORE - Ad-hoc:**
```typescript
const handleLogin = async (username: string, password: string): Promise<void> => {
  const response = await invoke<LoginResponse>('login', {
    request: { username, password }
  });
  
  localStorage.setItem('promix_token', response.token);
  localStorage.setItem('promix_user', JSON.stringify(response.user));
  
  setUser(response.user);
  setIsAuthenticated(true);
};
```

**AFTER - Centralized:**
```typescript
// In component:
const { login } = useAuthStore();

const handleLogin = async (username: string, password: string) => {
  try {
    await login(username, password);
    // Store handles token, user, persistence, logging!
  } catch (error) {
    logger.error('Login failed', error);
  }
};
```

### Example 2: Page Navigation

**BEFORE - Manual:**
```typescript
const handleProjectSelect = (id: number) => {
  setSelectedProjectId(id);
  setSelectedStationId(null);
  const r = normalizeRole(user?.role_name);
  if (r === 'admin' || r === 'manager' || r === 'project_manager') {
    setOperationsHubTab('projects');
    setCurrentPage('operations-hub');
  } else {
    setCurrentPage('projects');
  }
};
```

**AFTER - Store-based:**
```typescript
const { selectProject } = useNavigationStore();

const handleProjectSelect = (id: number) => {
  selectProject(id); // One call!
};
```

### Example 3: Error Handling

**BEFORE - Console scattered:**
```typescript
export default function DashboardPage() {
  const loadStats = async () => {
    setLoading(true);
    try {
      const next = await invoke<DashboardData>('get_dashboard_data', 
        { token: getPromixToken() }
      );
      setData(next);
    } catch (err) {
      console.error('Failed to load stats:', err);  // ❌ Just console
      setData(null);
    } finally {
      setLoading(false);
    }
  };
  // ...
}
```

**AFTER - Centralized logging:**
```typescript
export default function DashboardPage() {
  const { data, loading, error, refetch } = useApi<DashboardData>('get_dashboard_data');
  
  // Error is logged automatically, can show nice UI
  if (error) {
    return <ErrorBoundary error={error} onRetry={refetch} />;
  }
  // ...
}
```

---

## ✅ Implementation Checklist

### Phase 1: Foundation (2-3 days)
- [x] Create `config/` with constants
- [x] Create `core/` with logger & types
- [x] Create `api/` with command wrapper
- [x] Create Zustand stores
- [ ] Move existing types to `core/types.ts`
- [ ] Replace `console.error()` with `logger.error()`
- [ ] Test auth flow works with new stores

### Phase 2: Refactor App Shell (2-3 days)
- [ ] Refactor `App.tsx` (600→150 lines)
- [ ] Create `AppRouter.tsx`
- [ ] Extract layout components
- [ ] Update all hooks to use stores
- [ ] Test navigation still works

### Phase 3: Extract & Create UI Components (2-3 days)
- [ ] Create base components (`Button`, `Input`, `Modal`, etc.)
- [ ] Extract reusable patterns
- [ ] Add Storybook? (optional)

### Phase 4: Clean Page Components (3-5 days)
- [ ] Replace API calls: `invoke()` → `apiCommand()`
- [ ] Replace state: `useState()` → stores/hooks
- [ ] Remove console.error() calls
- [ ] Fix TypeScript errors if any

### Phase 5: Testing & Docs (2-3 days)
- [ ] Add JSDoc comments
- [ ] Create `COMPONENT_GUIDE.md`
- [ ] Setup ESLint + Prettier
- [ ] Create pre-commit hooks

---

## 📚 File Organization Decision Tree

**When adding a new feature, ask:**

> **1. Is it a magic string/constant?** → Put in `src/config/`
> **2. Is it a global type/interface?** → Put in `src/core/types.ts`
> **3. Is it state that multiple components need?** → Create a Zustand store in `src/store/`
> **4. Is it reusable logic?** → Create a custom hook in `src/hooks/`
> **5. Is it a Tauri command call?** → Use `apiCommand()` from `src/api/commands.ts`
> **6. Is it a UI component?** → Create in `src/components/` (categorized by type)
> **7. Is it data fetching?** → Create an API module in `src/api/[resource]-api.ts`

---

## 🚀 Benefits After Refactoring

| Metric | Before | After |
|--------|--------|-------|
| **App.tsx lines** | 600+ | 150 ✅ |
| **State scattered** | 8+ places | 1 place (stores) ✅ |
| **Error handling** | `console.error()` x18 | Centralized logger ✅ |
| **Magic strings** | Everywhere | `constants.ts` ✅ |
| **localStorage consistency** | Manual in each place | Helpers + typing ✅ |
| **Code reusability** | Low | High (hooks, stores) ✅ |
| **Testability** | Difficult | Easy (stores are testable) ✅ |
| **Onboarding time** | High | Low (clear structure) ✅ |
| **Debugging** | console.log hunting | Zustand DevTools ✅ |
| **IDE autocomplete** | Weak (strings) | Strong (types) ✅ |

---

## 🎓 Development Guidelines

### Always Use

✅ `logger.error()` instead of `console.error()`
✅ Zustand stores for shared state
✅ Custom hooks for reusable logic
✅ `apiCommand()` for Tauri calls
✅ Constants from `src/config/` for magic strings
✅ `getStorage()` / `setStorage()` for localStorage

### Never Use

❌ `console.log()`, `console.error()`, `console.warn()`
❌ Multiple `useState` for related state (put in store)
❌ Direct `localStorage.setItem()` (use helpers)
❌ Direct `invoke()` from Tauri (use `apiCommand()`)
❌ Magic strings like `'admin'`, `'promix_token'`

---

## 📖 Next Steps

1. **Create the new folder structure** (config, core, api, store in src/)
2. **Implement the files provided** above
3. **Update imports** throughout the codebase to use new modules
4. **Refactor App.tsx** using the template provided
5. **Clean page components** one by one
6. **Add tests** for stores and hooks
7. **Document** with JSDoc comments

---

## 🤝 Questions Answered

**Q: Should I migrate everything at once?**
A: No! Migration in phases minimizes risk. Implement stores first, then refactor components gradually.

**Q: Is Zustand overkill for this app?**
A: No. Even with 1-2 stores, having centralized state gives you DevTools, time-travel debugging, and easier testing.

**Q: Should I use Redux instead?**
A: Zustand is simpler and lighter. Redux is overkill unless you have 10+ stores.

**Q: Can I keep the old invoke() calls?**
A: Yes, during migration. But gradually replace with `apiCommand()`.

**Q: What about performance?**
A: Zustand is performant. Wrap store in `subscribeWithSelector()` to ensure components only re-render when their specific state changes.

---

**Written**: 2026-04-05  
**Format**: React 18 + TypeScript + Vite + Tauri  
**Status**: Ready for implementation
