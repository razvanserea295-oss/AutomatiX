# Promix Automatix - Comprehensive Refactor Plan

## Overview
This document outlines the complete cleanup, organization, and modernization of the Promix Automatix React desktop application.

## Current State Assessment

### Strengths ✅
- Modern tech stack (React 18, TypeScript, Vite, Tailwind, Tauri)
- Feature-based folder structure
- Type safety with TypeScript
- Good use of modern libraries (React Router, Zustand, React Query)
- Tauri backend well-structured

### Issues Found 🔴

#### 1. **Monolithic App.tsx (600+ lines)**
- Handles routing, state management, authentication, UI logic all in one file
- Multiple useState hooks that should be in Zustand stores
- Complex navigation logic mixed with rendering
- Difficult to test and maintain

#### 2. **Empty Store & Hooks Directories**
- No state management with Zustand (despite being in package.json)
- Could benefit from: authStore, navigationStore, themeStore, appStateStore
- No custom hooks for reusable logic

#### 3. **No Error Handling Layer**
- `console.error()` scattered throughout files (18 instances found)
- No centralized error handling or logging
- Error messages not user-friendly
- No error recovery strategies

#### 4. **Missing API/Command Abstraction**
- Tauri commands called directly with inline token fetching
- No centralized request wrapper or error handling
- Difficult to refactor API contracts
- No request caching or deduplication

#### 5. **Magic Strings Everywhere**
- Page IDs: 'dashboard', 'operations-hub', 'projects', etc. (not in constants)
- localStorage keys: 'promix_token', 'promix_user', 'promix_theme'
- Role names: 'admin', 'manager', 'hala', 'muncitor', etc.
- All scattered throughout components

#### 6. **Page Titles & Nav Config Not Centralized**
```javascript
// Currently in App.tsx:
const pageTitles: Record<string, string> = {
  dashboard: 'Tablou de bord',
  'operations-hub': 'Management & operațiuni',
  // ... 20 more entries scattered
};
```

#### 7. **Weak Component Encapsulation**
- Notification, theme toggle, quit button mixed in header
- Could be extracted to individual components
- UI components (Button, Input, Modal) not abstracted
- Reusability limited

#### 8. **No Centralized Configuration**
- No .env.example or config file
- Tauri command names hardcoded
- No feature flags or toggle switches

---

## Refactor Phases

### ✅ Phase 1: Infrastructure (Core Files)
1. Create `config/` with all constants
2. Create `core/` with error handling & logging
3. Create `api/` with centralized command wrapper
4. Create Zustand stores
5. Extract custom hooks

### 🔄 Phase 2: App Shell
1. Refactor `App.tsx` (600→150 lines)
2. Create `AppRouter.tsx` (routing logic)
3. Extract layout components
4. Implement proper state management

### 🎨 Phase 3: Components
1. Create base UI components (Button, Input, Modal, etc.)
2. Extract reusable component patterns
3. Improve component documentation
4. Add Storybook/Showcase (optional)

### 📄 Phase 4: Pages
1. Clean each page component
2. Replace inline API calls with store/hooks
3. Add proper error boundaries
4. Improve loading/empty states

### 🧪 Phase 5: Testing & Documentation
1. Add JSDoc comments
2. Create type documentation
3. Add usage examples for key utilities
4. ESLint + Prettier configuration

---

## New Folder Structure

```
src/
├── config/                    # ← NEW
│   ├── constants.ts
│   ├── localStorage.ts
│   └── navigation.ts
├── core/                      # ← NEW
│   ├── types.ts
│   ├── errors.ts
│   └── logger.ts
├── api/                       # ← NEW
│   ├── commands.ts
│   ├── client.ts
│   └── [resource]-api.ts
├── store/                     # ← NEW (replaces empty stores/)
│   ├── authStore.ts
│   ├── navigationStore.ts
│   ├── themeStore.ts
│   └── index.ts
├── hooks/                     # ← ENHANCED
│   ├── useAuth.ts
│   ├── useNavigation.ts
│   └── index.ts
├── lib/                       # ← KEEP (reorganized)
├── components/                # ← REORGANIZED
│   ├── ui/
│   ├── common/
│   ├── form/
│   ├── layout/
│   └── settings/
├── pages/                     # ← CLEANED
├── types/                     # ← CENTRALIZED
├── utils/                     # ← ORGANIZED
├── styles/
├── assets/
├── App.tsx                    # ← SIMPLIFIED
├── AppRouter.tsx              # ← NEW
└── main.tsx
```

---

## Key Changes & Benefits

| Old | New | Benefit |
|-----|-----|---------|
| `console.error()` everywhere | Centralized `logger.ts` | Consistent logging, easier debugging, can redirect to analytics |
| Inline Tauri commands | `api/commands.ts` wrapper | Centralized error handling, request deduplication, easier mocking |
| `useState` for everything | Zustand stores | Better performance, easier debugging with DevTools, better testability |
| 600+ line App.tsx | 150 line App.tsx + AppRouter.tsx | Easier to understand, easier to extend, easier to test |
| Magic strings everywhere | `config/constants.ts` | Type-safe, searchable, easier refactoring, autocomplete |
| No error boundaries | Error boundaries included | Better error recovery, user-friendly messages |
| Inline localStorage | `config/localStorage.ts` | Centralized, easier to change keys, consistent naming |
| No custom hooks | `useAuth`, `useNavigation`, etc. | Reusable logic, DRY principle, easier testing |

---

## Implementation Checklist

- [ ] Create config/ directory structure
- [ ] Create core/ error handling & logging
- [ ] Create api/ command wrapper
- [ ] Create Zustand stores
- [ ] Refactor App.tsx
- [ ] Create AppRouter.tsx
- [ ] Extract UI components
- [ ] Clean page components
- [ ] Update documentation
- [ ] Add ESLint + Prettier
- [ ] Setup pre-commit hooks (husky)
- [ ] Create development guide
