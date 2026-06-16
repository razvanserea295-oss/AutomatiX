# 🏗️ NEW APPLICATION ARCHITECTURE

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          REACT COMPONENTS                               │
│  (App.tsx, Pages, Layout, UI Components)                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
         ┌──────────▼─────────┐    ┌─────────▼──────────┐
         │   ZUSTAND STORES   │    │   CUSTOM HOOKS     │
         ├────────────────────┤    ├────────────────────┤
         │ • authStore        │    │ • useAuth          │
         │ • navigationStore  │    │ • useApi           │
         │ • themeStore       │    │ • useNavigation    │
         └──────────┬─────────┘    │ • useTauri         │
                    │              └─────────┬──────────┘
                    │                        │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   CONFIG LAYER         │
                    ├────────────────────────┤
                    │ constants.ts           │ ← PAGE_IDS, ROLES, THEMES
                    │ localStorage.ts        │ ← Storage helpers
                    │ navigation.ts          │ ← Route config
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼────────────────────┐
                    │   CORE INFRASTRUCTURE          │
                    ├────────────────────────────────┤
                    │ logger.ts        - Logging     │
                    │ types.ts         - Global types│
                    │ errors.ts        - Error utils │
                    └────────────┬────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   API LAYER            │
                    ├────────────────────────┤
                    │ commands.ts            │ ← Tauri wrapper + errors
                    │ auth-api.ts            │
                    │ projects-api.ts        │
                    │ ...                    │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼────────────────────┐
                    │   TAURI BACKEND (Rust)         │
                    ├────────────────────────────────┤
                    │ • Commands (login, get_*, ...)│
                    │ • Error handling + logging     │
                    │ • SQLite database              │
                    └────────────────────────────────┘
```

## Component Interaction

```
┌──────────────────────────────────────────────────────┐
│ App.tsx (150 lines)                                  │
│  ├─ Initialize stores (auth, navigation, theme)    │
│  ├─ Render OperationsLayout                        │
│  └─ Route to current page                          │
└──────────────┬───────────────────────────────────────┘
               │
       ┌───────▼────────┐
       │ Current Page   │
       │ (e.g., Dashboard)
       └───────┬────────┘
               │
       ┌───────▼──────────────────┐
       │ useAuthStore()           │  ← Get user, auth status
       │ useNavigationStore()     │  ← Get current page, navigate
       │ useApi(command)          │  ← Fetch data
       └───────┬──────────────────┘
               │
       ┌───────▼──────────────────┐
       │ apiCommand(command, {..})│
       ├──────────────────────────┤
       │ • Gets token from store  │
       │ • Logs operation         │
       │ • Handles errors         │
       │ • Calls Tauri backend    │
       └───────┬──────────────────┘
               │
       ┌───────▼──────────────────┐
       │ Tauri Backend            │
       │ • Routes command         │
       │ • Queries database       │
       │ • Returns result/error   │
       └──────────────────────────┘
```

## File Structure at a Glance

```
src/
├── config/
│   ├── constants.ts        [Type-safe constants]
│   └── localStorage.ts     [Storage helpers]
│
├── core/
│   ├── logger.ts          [Centralized logging]
│   ├── types.ts           [Global interfaces]
│   └── errors.ts          [Error utilities]
│
├── api/
│   ├── commands.ts        [Tauri wrapper + error handling] ⭐ KEY
│   ├── auth-api.ts
│   └── projects-api.ts
│
├── store/
│   ├── authStore.ts       [Auth + session state]
│   ├── navigationStore.ts [Navigation + page state]
│   ├── themeStore.ts      [Theme state]
│   └── index.ts           [Central exports]
│
├── hooks/
│   ├── useAuth.ts
│   ├── useApi.ts
│   ├── useNavigation.ts
│   └── useTauri.ts
│
├── lib/
│   ├── format.ts
│   ├── permissions.ts
│   └── roleWorkspace.ts
│
├── components/
│   ├── ui/                [Button, Input, Modal, etc.]
│   ├── common/            [DataTable, FilterBar, etc.]
│   ├── form/              [Form fields]
│   ├── layout/            [OperationsLayout, Header, etc.]
│   └── settings/
│
├── pages/
│   ├── auth/
│   ├── dashboard/
│   ├── projects/
│   └── ...
│
├── types/
│   ├── piece.ts
│   ├── project.ts
│   └── api.ts
│
├── utils/
│   ├── excelImport.ts
│   └── validation.ts
│
├── App.tsx               [150 lines, simplified] ⭐ REFACTORED
├── AppRouter.tsx         [Page routing]
└── main.tsx
```

## State Management Flow

```
Initial Load
    │
    ├─→ App.tsx useEffect
    │   └─→ restoreTheme() [themeStore]
    │   └─→ restoreSession() [authStore]
    │       ├─ Check localStorage.promix_token
    │       ├─ Validate with backend
    │       └─ Set user in store
    │
    └─→ If authenticated:
        └─→ Render OperationsLayout + Page
            │
            └─→ Page component
                ├─ useAuthStore() → Get user
                ├─ useNavigationStore() → Get current page
                ├─ useApi() → Fetch data
                │   └─ apiCommand() with error handling
                └─ Render UI
```

## Error Handling Flow

```
Component calls:
    └─ await apiCommand('get_projects')
       │
       └─→ apiCommand() wrapper
           ├─ Validates Tauri env
           ├─ Adds token from store
           ├─ Calls Tauri invoke()
           │
           └─→ Success:
               ├─ logger.debug()
               └─ Return data
           
           └─→ Error:
               ├─ Extract CommandError
               ├─ logger.error()
               ├─ Convert to AppError
               └─ Throw AppError

Component catches:
    └─ catch (error: AppError)
       ├─ logger.error() [duplicate safe]
       ├─ Can show error UI
       └─ Can retry or recover
```

## Before vs After: At a Glance

```
BEFORE:                          │  AFTER:
─────────────────────────────────┼──────────────────────────────
600-line App.tsx                 │  150-line App.tsx
Scattered useState               │  Centralized stores
console.error() everywhere       │  logger.error() with tracking
Magic strings ('admin', etc.)    │  Constants in src/config/
No hooks                         │  Custom hooks for logic
Direct invoke() calls            │  Wrapped apiCommand()
localStorage.setItem() scattered │  Central storage helpers
No error boundary                │  Proper error handling
Prop drilling                    │  Zustand + providers
Hard to test                     │  Easy to test (stores)
Difficult to debug               │  Zustand DevTools support
```

---

**Created**: 2026-04-05  
**Stack**: React 18 + TypeScript + Vite + Tauri + Zustand + Tailwind
