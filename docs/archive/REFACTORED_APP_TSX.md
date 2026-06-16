/**
 * REFACTORED App.tsx
 *
 * BEFORE: 600+ lines, mixing routing, state, auth, UI
 * AFTER: 150 lines, focused on layout and store initialization
 *
 * This is what your App.tsx should look like after refactoring!
 */

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OperationsLayout } from '@/components/layout/OperationsLayout';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { useAuthStore, useNavigationStore, useThemeStore } from '@/store';
import { PAGE_IDS, OPS_HUB_TABS, PAGE_TITLES } from '@/config/constants';
import { TauriEnvironment } from '@/api/commands';
import { logger } from '@/core/logger';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

// Lazy load pages for better performance
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import OperationsHubPage from '@/pages/operations/OperationsHubPage';
import ProjectsWorkspacePage from '@/pages/projects/ProjectsWorkspacePage';
// ... import other pages

import type { PageId } from '@/config/constants';

export default function App() {
  // ========================================
  // HOOKS
  // ========================================

  const { user, isAuthenticated, isLoadingSession, restoreSession, logout } = useAuthStore();
  const { currentPage, navigateTo } = useNavigationStore();
  const { restoreTheme } = useThemeStore();

  // ========================================
  // INITIALIZATION
  // ========================================

  useEffect(() => {
    // Initialize app on mount
    const initApp = async () => {
      // Restore theme from storage
      restoreTheme();

      // Restore session from storage
      const sessionRestored = await restoreSession();
      if (!sessionRestored) {
        logger.info('No valid session found, redirecting to login');
      }
    };

    void initApp();
  }, [restoreSession, restoreTheme]);

  // ========================================
  // FULLSCREEN TOGGLE (F11 / Alt+Enter)
  // ========================================

  useEffect(() => {
    if (!TauriEnvironment.isTauri()) return;

    const toggleBorderlessFullscreen = async () => {
      try {
        const w = getCurrentWebviewWindow();
        const fs = await w.isFullscreen();
        if (fs) {
          await w.setFullscreen(false);
          await w.setDecorations(true);
          await w.maximize();
        } else {
          await w.setDecorations(false);
          await w.setFullscreen(true);
        }
      } catch (err) {
        logger.error('Failed to toggle fullscreen', err);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const toggle = e.key === 'F11' || (e.altKey && e.key === 'Enter');
      if (!toggle) return;
      e.preventDefault();
      void toggleBorderlessFullscreen();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ========================================
  // LOADING STATE
  // ========================================

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-bg)] text-[var(--app-text)]">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600 dark:border-slate-700 dark:border-t-primary-500" />
        <p className="mt-5 text-sm font-medium text-slate-600 dark:text-slate-400">Se încarcă aplicația…</p>
      </div>
    );
  }

  // ========================================
  // NOT AUTHENTICATED
  // ========================================

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // ========================================
  // MAIN APP
  // ========================================

  return (
    <OperationsLayout
      user={user}
      currentPage={currentPage}
      onNavigate={navigateTo}
      onLogout={() => void logout()}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <PageRouter currentPage={currentPage} user={user} />
        </motion.div>
      </AnimatePresence>
    </OperationsLayout>
  );
}

// ============================================================================
// PAGE ROUTER (extracted from App.tsx for clarity)
// ============================================================================

interface PageRouterProps {
  currentPage: PageId;
  user: any; // Import User type from core/types
}

/**
 * Renders the current page based on currentPage ID
 * Much cleaner than a giant if-else chain in App.tsx!
 */
function PageRouter({ currentPage, user }: PageRouterProps) {
  const { navigateTo } = useNavigationStore();

  switch (currentPage) {
    case PAGE_IDS.DASHBOARD:
      return <DashboardPage user={user} onNavigate={navigateTo} />;

    case PAGE_IDS.OPERATIONS_HUB:
      return <OperationsHubPage user={user} onNavigate={navigateTo} />;

    case PAGE_IDS.PROJECTS:
      return <ProjectsWorkspacePage user={user} onNavigate={navigateTo} />;

    // ... add other pages

    default:
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <p className="text-gray-600 dark:text-gray-400">Page not found: {currentPage}</p>
        </div>
      );
  }
}
