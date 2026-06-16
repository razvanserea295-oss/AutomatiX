/**
 * CUSTOM HOOKS - Reusable logic extracted from components
 *
 * Replace scattered logic and useState calls with these!
 */

// ============================================================================
// src/hooks/useAuth.ts
// ============================================================================

import { useEffect } from 'react';
import { useAuthStore } from '@/store';
import { logger } from '@/core/logger';

/**
 * Require authentication - redirect to login if not authenticated
 * Usage in pages that need auth protection
 */
export function useRequireAuth() {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      logger.warn('Unauthorized access attempt');
      // Navigate to login (from your router)
    }
  }, [isAuthenticated]);

  return { user, isAuthenticated };
}

// ============================================================================
// src/hooks/useNavigation.ts
// ============================================================================

/**
 * Navigation helpers with role-based access
 */
export function useNavigation() {
  const { navigateTo } = useNavigationStore();
  const { user } = useAuthStore();

  const canAccess = (page: PageId): boolean => {
    if (!user) return false;
    // Add role-based checks here
    return true;
  };

  const goTo = (page: PageId): void => {
    if (canAccess(page)) {
      navigateTo(page);
    } else {
      logger.warn(`User cannot access page: ${page}`, { role: user?.role_name });
    }
  };

  return { navigateTo: goTo, canAccess };
}

// ============================================================================
// src/hooks/useApi.ts
// ============================================================================

/**
 * Simplified API calling with loading/error states
 * Replaces: useState(loading); try/catch blocks everywhere
 *
 * Usage:
 *   const { data, loading, error, execute } = useApi<Project[]>(
 *     'get_projects'
 *   );
 *   useEffect(() => { void execute(); }, [execute]);
 */

import { useState, useCallback } from 'react';
import { apiCommand } from '@/api/commands';
import { AppError } from '@/core/types';
import { logger } from '@/core/logger';

export function useApi<T>(command: string, initialData?: T) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const execute = useCallback(
    async (args?: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiCommand<T>(command, args);
        setData(result);
        return result;
      } catch (err) {
        const appError = AppError.fromUnknown(err);
        setError(appError);
        logger.error(`API call failed: ${command}`, appError);
        throw appError;
      } finally {
        setLoading(false);
      }
    },
    [command]
  );

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  return { data, loading, error, execute, refetch };
}

// ============================================================================
// BEFORE vs AFTER
// ============================================================================

/**
 * BEFORE: Scattered state and error handling
 * 
 * export function DashboardPage() {
 *   const [data, setData] = useState<DashboardData | null>(null);
 *   const [loading, setLoading] = useState(true);
 *   const [user, setUser] = useState<User | null>(null);
 *   const [theme, setTheme] = useState<'light' | 'dark'>('dark');
 *
 *   useEffect(() => {
 *     loadStats();
 *   }, []);
 *
 *   const loadStats = async () => {
 *     setLoading(true);
 *     try {
 *       const next = await invoke<DashboardData>('get_dashboard_data',
 *         { token: getPromixToken() }
 *       );
 *       setData(next);
 *     } catch (err) {
 *       console.error('Failed to load stats:', err);  // ❌ Scattered logging
 *       setData(null);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   // Theme toggle mixed in...
 *   const handleThemeChange = (newTheme: 'light' | 'dark') => {
 *     setTheme(newTheme);
 *     localStorage.setItem('promix_theme', newTheme);
 *     if (newTheme === 'dark') {
 *       document.documentElement.classList.add('dark');
 *     } else {
 *       document.documentElement.classList.remove('dark');
 *     }
 *   };
 * }
 *
 * AFTER: Clean with stores and custom hooks
 *
 * export function DashboardPage() {
 *   const { user } = useAuthStore();
 *   const { theme, toggleTheme } = useThemeStore();  // ✅ Centralized
 *   const { data, loading, error, refetch } = useApi<DashboardData>(
 *     'get_dashboard_data'
 *   );
 *
 *   useEffect(() => {
 *     void refetch();
 *   }, [refetch]);
 *
 *   if (loading) return <DashboardSkeleton />;
 *   if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
 *
 *   return (
 *     <div>
 *       <p>Welcome {user?.full_name}</p>
 *       <button onClick={() => toggleTheme()}>
 *         Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode
 *       </button>
 *     </div>
 *   );
 * }
 */
