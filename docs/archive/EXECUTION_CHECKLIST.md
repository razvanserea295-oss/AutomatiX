# ✅ PROMIX AUTOMATIX - REFACTORING EXECUTION CHECKLIST

## 📋 Pre-Implementation

- [ ] Create new branch: `git checkout -b refactor/modernize-codebase`
- [ ] Read `CLEANUP_MODERNIZATION_GUIDE.md` (understand rationale)
- [ ] Read `ARCHITECTURE_DIAGRAM.md` (visualize structure)
- [ ] Ensure Git is clean: `git status` (all committed)
- [ ] Setup IDE extensions (ESLint, Prettier if not present)

---

## 🏗️ Phase 1: Foundation (Days 1-3)

### Create Directory Structure
```bash
# In project root:
mkdir -p src/config
mkdir -p src/core
mkdir -p src/api
mkdir -p src/store
mkdir -p src/hooks
```

### Copy New Infrastructure Files
- [ ] Copy provided `src/config/constants.ts`
- [ ] Copy provided `src/config/localStorage.ts`
- [ ] Copy provided `src/core/logger.ts`
- [ ] Copy provided `src/core/types.ts`
- [ ] Copy provided `src/api/commands.ts`
- [ ] Copy provided `src/store/authStore.ts`
- [ ] Copy provided `src/store/navigationStore.ts`
- [ ] Copy provided `src/store/themeStore.ts`
- [ ] Copy provided `src/store/index.ts`

### Install/Verify Dependencies
```bash
# Should already be in package.json:
npm list zustand react-router-dom @tauri-apps/api

# If missing Zustand:
npm install zustand
```

### Test Build
```bash
npm run build
# Should compile without errors
```

### Create Backup
```bash
git add .
git commit -m "feat: add infrastructure layer (config, core, api, stores)"
```

---

## 🎨 Phase 2: App Shell (Days 4-7)

### Update Top-Level Imports
- [ ] In `src/App.tsx`: Add imports from new modules
  ```typescript
  import { useAuthStore, useNavigationStore, useThemeStore } from '@/store';
  import { PAGE_IDS } from '@/config/constants';
  import { logger } from '@/core/logger';
  ```

### Move Global Types
- [ ] Remove `User` and `LoginResponse` interfaces from `App.tsx`
- [ ] Verify they're in `src/core/types.ts`
- [ ] Update imports in `App.tsx`: `import { User } from '@/core/types'`

### Refactor App.tsx
- [ ] Replace multiple `useState` with store hooks:
  ```typescript
  // Remove these useState:
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  // ...
  
  // Replace with:
  const { user, isAuthenticated } = useAuthStore();
  const { currentPage, navigateTo } = useNavigationStore();
  const { theme, setTheme } = useThemeStore();
  ```

- [ ] Replace `handleLogin` to use `useAuthStore`:
  ```typescript
  const { login } = useAuthStore();
  
  const handleLogin = async (username: string, password: string) => {
    try {
      await login(username, password);
      // Store handles everything!
    } catch (error) {
      logger.error('Login failed', error);
    }
  };
  ```

- [ ] Replace initialization logic:
  ```typescript
  useEffect(() => {
    const init = async () => {
      restoreTheme();
      await restoreSession();
    };
    void init();
  }, []);
  ```

- [ ] Replace `console.error` with `logger.error`:
  ```typescript
  // Find: console.error(
  // Replace: logger.error(
  ```

### Extract PageRouter
- [ ] Create component that has giant if/else for pages
- [ ] Separate from App.tsx rendering concerns

### Commit Progress
```bash
git add .
git commit -m "feat: refactor App.tsx with Zustand stores"
```

---

## 🧩 Phase 3: API & Services (Days 8-10)

### Update Existing Services
- [ ] In `src/services/pieceService.ts`:
  ```typescript
  // Remove:
  import { invoke } from '@/invoke';
  import { getPromixToken } from '@/lib/session';
  
  // Add:
  import { apiCommand } from '@/api/commands';
  
  // Replace each call:
  // Was: await invoke('get_project_stages_custom', { token, projectId })
  // Now: await apiCommand('get_project_stages_custom', { projectId })
  ```

- [ ] Test each API call after updating

### Create Additional API Modules (as needed)
- [ ] `src/api/auth-api.ts` (if extracting auth calls)
- [ ] `src/api/projects-api.ts`
- [ ] `src/api/workers-api.ts`
- [ ] etc.

### Replace All Scattered `invoke()` Calls
```bash
# Search for all invoke calls:
grep -r "invoke(" src/ --include="*.ts" --include="*.tsx"

# Replace each one with apiCommand()
```

### Commit Progress
```bash
git add .
git commit -m "feat: migrate API calls to centralized apiCommand wrapper"
```

---

## 📄 Phase 4: Components & Pages (Days 11-15)

### Update Page Components
For each page in `src/pages/*/`:

- [ ] Replace `useState` with stores where applicable
- [ ] Replace API calls: `invoke()` → `apiCommand()`
- [ ] Replace logging: `console.error()` → `logger.error()`
- [ ] Replace constants: hardcoded strings → `constants.ts`

**Example (Dashboard):**
```typescript
// BEFORE:
import { getPromixToken } from '@/lib/session';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  
  const loadStats = async () => {
    try {
      const next = await invoke('get_dashboard_data', { 
        token: getPromixToken() 
      });
      setData(next);
    } catch (err) {
      console.error('Failed:', err);
    }
  };
}

// AFTER:
import { apiCommand } from '@/api/commands';
import { logger } from '@/core/logger';

export default function DashboardPage() {
  const { data, loading, refetch } = useApi('get_dashboard_data');
  
  // That's it! Error handling + logging handled
}
```

### Update Component Constants
- [ ] Replace magic strings with `constants.ts`
  ```typescript
  // BEFORE: if (page === 'dashboard') navigateTo('dashboard')
  // AFTER: if (page === PAGE_IDS.DASHBOARD) navigateTo(PAGE_IDS.DASHBOARD)
  ```

### Update Component Logging
- [ ] Replace all `console.error()` with `logger.error()`
  ```bash
  # Find all console.error:
  grep -r "console\\.error" src/ --include="*.ts" --include="*.tsx"
  
  # Replace with logger.error
  ```

### Clean Up Comment Blocks
- [ ] Remove dead code comments
- [ ] Remove old TODO/FIXME that are no longer relevant
- [ ] Add JSDoc to exported functions

### Commit Incrementally
```bash
# After each page is updated:
git add .
git commit -m "refactor: update [PageName] with new architecture"
```

---

## 🧪 Phase 5: Testing & Validation (Days 16-18)

### Functional Testing
- [ ] Login flow works
- [ ] Navigation between pages works
- [ ] Data loading works
- [ ] Error handling works (try breaking API)
- [ ] Logout works
- [ ] Theme toggle works
- [ ] Window controls (F11 fullscreen) work

### Code Quality
```bash
# Check for remaining console calls:
grep -r "console\\." src/ --include="*.ts" --include="*.tsx"

# Should return: 0 (zero results)

# Check for remaining console.log:
grep -r "console\\.log" src/ --include="*.ts" --include="*.tsx"

# Should return: 0
```

### Type Checking
```bash
npm run build
# Should complete with zero errors
```

### Performance Check
```bash
npm run dev
# Open DevTools → Performance → Record
# Open each page, check for unnecessary renders
# Look at Zustand DevTools (should show state updates)
```

### Commit Final Version
```bash
git add .
git commit -m "refactor: complete modernization and cleanup"
```

---

## 📊 Verification Checklist

### Architecture
- [ ] `src/config/` exists with constants
- [ ] `src/core/` exists with logger and types
- [ ] `src/api/` exists with commands wrapper
- [ ] `src/store/` exists with Zustand stores
- [ ] `src/hooks/` could be created for custom hooks

### Code Quality
- [ ] Zero `console.log()` in code
- [ ] Zero `console.error()` in code
- [ ] Zero `console.warn()` in code
- [ ] All magic strings replaced with constants
- [ ] All `localStorage.setItem` replaced with helpers
- [ ] All `invoke()` replaced with `apiCommand()`

### Functionality
- [ ] App builds without errors
- [ ] App builds without warnings
- [ ] Login works
- [ ] Pages load correctly
- [ ] Navigation works
- [ ] Data fetching works
- [ ] Error handling works
- [ ] Theme switching works
- [ ] Logout works

### Documentation
- [ ] Updated README with new architecture
- [ ] Added comments/JSDoc to key files
- [ ] Created DEVELOPMENT.md (optional)

---

## 🚀 Final Steps

### Merge to Main
```bash
# Create PR:
git push origin refactor/modernize-codebase

# In GitHub/GitLab:
# 1. Create pull request
# 2. Request code review
# 3. Address review comments
# 4. Merge to main
```

### Post-Merge
- [ ] Pull latest `main`
- [ ] Run full test suite
- [ ] Deploy to staging
- [ ] Get team sign-off
- [ ] Update team documentation

### Celebrate! 🎉
You've successfully modernized Promix Automatix!

---

## 📱 Troubleshooting

### Build Errors After Changes
```bash
# Clear cache and rebuild:
rm -rf node_modules/.vite
npm run build

# If still fails, check:
# 1. All imports are correct
# 2. No circular dependencies
# 3. TypeScript errors (npm run build output)
```

### Runtime Errors
- Check browser console (F12) for errors
- Check Rust backend logs if available
- Use logger to understand flow

### Tests Failing
- If you have tests, update imports
- Mock `apiCommand` in test setup
- Mock stores with test values

---

## 📞 Need Help?

**If stuck on:**
- **Constants**: Check `CLEANUP_MODERNIZATION_GUIDE.md`
- **Zustand**: Check `CUSTOM_HOOKS_GUIDE.md`
- **API layer**: Check `src/api/commands.ts` JSDoc
- **Architecture**: Check `ARCHITECTURE_DIAGRAM.md`

---

## ✅ Done!

After completing all phases:
- Your codebase is modern and maintainable
- New developers can onboard in 1 day
- Debugging is easier (Zustand DevTools)
- Error tracking is centralized
- Performance is maintained or improved
- Tests are easier to write
- Code is easier to refactor

**Estimated time**: 2-3 weeks for one developer  
**Estimated time**: 1 week for two developers
