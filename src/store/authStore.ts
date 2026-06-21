








import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { User, LoginResponse, AppError } from '@/core/types';
import { STORAGE_KEYS, getStorageJson, setStorageJson, setStorage, removeStorage } from '@/config/localStorage';
import { logger } from '@/core/logger';
import { apiCommand, isSessionExpired } from '@/api/commands';
import { isBrowserWeb } from '@/config/server';
import { addSessionExpiredListener } from '@/store/sessionEvents';

/**
 * User-based tenant routing. In a browser tab we don't ask the user to pick a
 * firm — we POST credentials to the host broker (`/api/auth/login` on the bare
 * origin), which finds the firm the user belongs to and returns its slug plus
 * the already-issued session. Desktop builds talk to one configured server, so
 * they keep using the plain `login` command.
 */
type BrokerLogin = (LoginResponse | { requires_2fa: true; challenge: string }) & { tenant_slug?: string };
async function resolveLogin(username: string, password: string): Promise<BrokerLogin> {
  if (!isBrowserWeb()) {
    return apiCommand<BrokerLogin>('login', { request: { username, password } });
  }
  const res = await fetch(`${window.location.origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new AppError(data?.message || 'Username sau parolă incorectă', res.status);
  return data as BrokerLogin;
}





interface AuthState {
  
  user: User | null;
  token: string | null;

  
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  sessionError: Error | null;

  
  pending2FAChallenge: string | null;

  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;

  
  
  login: (username: string, password: string) => Promise<{ requires2FA: boolean }>;
  
  verify2FA: (code: string) => Promise<void>;
  cancel2FA: () => void;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}





export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    
    user: null,
    token: null,
    isAuthenticated: false,
    isLoadingSession: false,
    sessionError: null,
    pending2FAChallenge: null,

    
    
    

    setUser: (user) => {
      set({ user });
      if (user) {
        setStorageJson(STORAGE_KEYS.USER, user);
      } else {
        removeStorage(STORAGE_KEYS.USER);
      }
    },

    setToken: (token) => {
      set({ token });
      if (token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      } else {
        removeStorage(STORAGE_KEYS.TOKEN);
      }
    },

    
    
    

    login: async (username: string, password: string) => {
      set({ isLoadingSession: true, sessionError: null, pending2FAChallenge: null });
      try {
        const response = await resolveLogin(username, password);

        // Persist the firm the broker resolved this user to. From now on every
        // request (incl. the 2FA verify) routes to that tenant via /t/<slug>.
        // Empty/absent slug = bare origin (single-tenant / desktop) — leave the
        // stored slug untouched in that case.
        const resolvedSlug = response.tenant_slug;
        if (isBrowserWeb() && resolvedSlug) setStorage(STORAGE_KEYS.TENANT_SLUG, resolvedSlug);




        if ('requires_2fa' in response && response.requires_2fa) {
          set({
            pending2FAChallenge: response.challenge,
            isLoadingSession: false,
            sessionError: null,
          });
          return { requires2FA: true };
        }

        const { token, user } = response as LoginResponse;


        set({
          token,
          user,
          isAuthenticated: true,
          isLoadingSession: false,
          sessionError: null,
          pending2FAChallenge: null,
        });


        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        setStorageJson(STORAGE_KEYS.USER, user);

        logger.info('User logged in', { userId: user.id, username: user.username });
        // When the firm was just resolved, reload so the whole app re-boots
        // through /t/<slug>: business_type, navigation and workspaces all
        // reflect the resolved firm.
        if (isBrowserWeb() && resolvedSlug) { window.location.reload(); }
        return { requires2FA: false };
      } catch (error) {
        const err = AppError.fromUnknown(error, 'Login failed');
        set({
          isLoadingSession: false,
          sessionError: err,
          isAuthenticated: false,
          pending2FAChallenge: null,
        });
        logger.error('Login failed', err);
        throw err;
      }
    },

    verify2FA: async (code: string) => {
      const challenge = get().pending2FAChallenge;
      if (!challenge) throw new AppError('Niciun challenge 2FA în așteptare', 400);
      set({ isLoadingSession: true, sessionError: null });
      try {
        const response = await apiCommand<LoginResponse>('login_verify_2fa', {
          request: { challenge, code },
        });
        const { token, user } = response;
        set({
          token,
          user,
          isAuthenticated: true,
          isLoadingSession: false,
          sessionError: null,
          pending2FAChallenge: null,
        });
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        setStorageJson(STORAGE_KEYS.USER, user);
        logger.info('User completed 2FA', { userId: user.id, username: user.username });
        // Reload so the app re-boots through the firm's /t/<slug> (the slug was
        // persisted during the login step that issued this 2FA challenge).
        if (isBrowserWeb() && (window.localStorage.getItem(STORAGE_KEYS.TENANT_SLUG) || '').trim()) {
          window.location.reload();
        }
      } catch (error) {
        const err = AppError.fromUnknown(error, '2FA verification failed');
        set({ isLoadingSession: false, sessionError: err });
        throw err;
      }
    },

    cancel2FA: () => {
      set({ pending2FAChallenge: null, sessionError: null });
    },

    logout: async () => {
      try {
        const token = get().token;
        if (token) {
          await apiCommand('logout', { token });
        }
      } catch (error) {
        logger.warn('Logout API call failed, clearing local session anyway', { error: String(error) });
      } finally {
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          sessionError: null,
        });


        removeStorage(STORAGE_KEYS.TOKEN);
        removeStorage(STORAGE_KEYS.USER);
        // Drop the resolved firm so the NEXT login re-resolves from scratch via
        // the broker — a different user can log into a different firm on the
        // same browser without a stale slug pinning them to the old one.
        if (isBrowserWeb()) removeStorage(STORAGE_KEYS.TENANT_SLUG);

        logger.info('User logged out');
      }
    },

    validateSession: async () => {
      const token = get().token;
      if (!token) {
        return false;
      }

      try {
        
        const user = await apiCommand<LoginResponse['user']>('validate_session', {
          token,
        });

        set({
          user,
          isAuthenticated: true,
          sessionError: null,
        });

        return true;
      } catch (error) {
        const isExpired = isSessionExpired(error);
        const err = AppError.fromUnknown(error);

        set({
          isAuthenticated: false,
          sessionError: isExpired ? new Error('Session expired') : err,
        });

        
        if (isExpired) {
          set({
            user: null,
            token: null,
          });
          removeStorage(STORAGE_KEYS.TOKEN);
          removeStorage(STORAGE_KEYS.USER);
        }

        logger.warn('Session validation failed', { error: err.message });
        return false;
      }
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      const token = get().token;
      if (!token) throw new AppError('Not authenticated', 401);

      const updatedUser = await apiCommand<User>('change_password', {
        token,
        current_password: currentPassword,
        new_password: newPassword,
      });

      set({ user: updatedUser });
      setStorageJson(STORAGE_KEYS.USER, updatedUser);
      logger.info('Password changed', { userId: updatedUser.id });
    },

    restoreSession: async () => {
      set({ isLoadingSession: true });
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const storedUser = getStorageJson<User>(STORAGE_KEYS.USER);

        if (!storedToken || !storedUser) {
          set({ isLoadingSession: false });
          return false;
        }

        
        set({
          token: storedToken,
          user: storedUser,
          isAuthenticated: true,
          isLoadingSession: false,
        });

        
        get().validateSession().catch(() => {
          set({ user: null, token: null, isAuthenticated: false });
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
        });

        return true;
      } catch (error) {
        logger.error('Failed to restore session', error);
        set({ isLoadingSession: false });
        return false;
      }
    },
  }))
);








if (typeof window !== 'undefined') {
  addSessionExpiredListener(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      sessionError: new Error('Session expired'),
      pending2FAChallenge: null,
    });

    removeStorage(STORAGE_KEYS.TOKEN);
    removeStorage(STORAGE_KEYS.USER);
    logger.info('Session expired, clearing stored authentication');
  });
}

export function useIsAuthenticated(): boolean {
  return useAuthStore(state => state.isAuthenticated);
}




export function useUser(): User | null {
  return useAuthStore(state => state.user);
}




export function useAuthToken(): string | null {
  return useAuthStore(state => state.token);
}
