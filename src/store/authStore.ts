








import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { User, LoginResponse, AppError } from '@/core/types';
import { STORAGE_KEYS, getStorageJson, setStorageJson, setStorage, removeStorage } from '@/config/localStorage';
import { logger } from '@/core/logger';
import { apiCommand, isSessionExpired } from '@/api/commands';
import { isCloudClient, getServerUrl, getServerOrigin } from '@/config/server';
import { addSessionExpiredListener } from '@/store/sessionEvents';
import { addLicenseRequiredListener } from '@/store/licenseEvents';

// Persisted across reloads so the activation screen survives a refresh and the
// first paint after a tenant-routed reload is correct (no dashboard flash).
const LICENSE_REQUIRED_KEY = 'promix_requires_license';
function readLicenseRequired(): boolean {
  try { return typeof window !== 'undefined' && localStorage.getItem(LICENSE_REQUIRED_KEY) === '1'; }
  catch { return false; }
}
function writeLicenseRequired(v: boolean): void {
  try {
    if (v) localStorage.setItem(LICENSE_REQUIRED_KEY, '1');
    else localStorage.removeItem(LICENSE_REQUIRED_KEY);
  } catch { /* ignore */ }
}

/**
 * User-based tenant routing. A cloud client (browser tab OR a desktop pointed at
 * the remote cloud) doesn't ask the user to pick a firm — it POSTs credentials
 * to the host broker (`/api/auth/login`), which finds the firm the user belongs
 * to and returns its slug plus the already-issued session. A classic desktop
 * pointed at a single localhost/LAN server uses the plain `login` command.
 */
type BrokerLogin = (LoginResponse | { requires_2fa: true; challenge: string }) & { tenant_slug?: string; requires_license?: boolean };
async function resolveLogin(username: string, password: string): Promise<BrokerLogin> {
  if (!isCloudClient()) {
    return apiCommand<BrokerLogin>('login', { request: { username, password } });
  }
  // Broker lives at the SERVER origin — for the web that's window.location.origin,
  // for a cloud desktop that's the configured cloud base (NOT the tauri:// origin).
  const res = await fetch(`${getServerOrigin()}/api/auth/login`, {
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

  // Per-tenant license gate: true → this firm's instance needs activation, the
  // app shows the activation screen instead of the shell.
  requiresLicense: boolean;


  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearLicenseRequirement: () => void;
  refreshLicenseState: () => Promise<void>;

  
  
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
    requiresLicense: readLicenseRequired(),


    
    

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

    clearLicenseRequirement: () => {
      writeLicenseRequired(false);
      set({ requiresLicense: false });
    },

    // Ask the firm's instance whether it's licensed. Only forces activation when
    // the server gate is actually armed (gate=true), so a deployment with the
    // gate off behaves exactly as before. Desktop builds skip this (gated locally).
    refreshLicenseState: async () => {
      if (!isCloudClient()) return;
      try {
        const res = await fetch(`${getServerUrl()}/api/license/tenant-state`, { cache: 'no-store' });
        if (!res.ok) return;
        const d = await res.json() as { licensed?: boolean; gate?: boolean };
        const need = !!d.gate && !d.licensed;
        writeLicenseRequired(need);
        set({ requiresLicense: need });
      } catch { /* keep current state on network error */ }
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
        if (isCloudClient() && resolvedSlug) setStorage(STORAGE_KEYS.TENANT_SLUG, resolvedSlug);




        if ('requires_2fa' in response && response.requires_2fa) {
          set({
            pending2FAChallenge: response.challenge,
            isLoadingSession: false,
            sessionError: null,
          });
          return { requires2FA: true };
        }

        const { token, user } = response as LoginResponse;
        // Broker tells us up front if this firm's instance still needs a license
        // (only when the gate is armed). If so, show the activation screen in
        // place — do NOT reload (the activation page uses this token to import).
        const requiresLicense = !!(response as { requires_license?: boolean }).requires_license;
        writeLicenseRequired(requiresLicense);

        set({
          token,
          user,
          isAuthenticated: true,
          isLoadingSession: false,
          sessionError: null,
          pending2FAChallenge: null,
          requiresLicense,
        });


        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        setStorageJson(STORAGE_KEYS.USER, user);

        logger.info('User logged in', { userId: user.id, username: user.username });
        // When the firm was just resolved, reload so the whole app re-boots
        // through /t/<slug>: business_type, navigation and workspaces all
        // reflect the resolved firm. Skip the reload while activation is pending.
        if (isCloudClient() && resolvedSlug && !requiresLicense) { window.location.reload(); }
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
        if (isCloudClient() && (window.localStorage.getItem(STORAGE_KEYS.TENANT_SLUG) || '').trim()) {
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
          requiresLicense: false,
        });


        removeStorage(STORAGE_KEYS.TOKEN);
        removeStorage(STORAGE_KEYS.USER);
        writeLicenseRequired(false);
        // Drop the resolved firm so the NEXT login re-resolves from scratch via
        // the broker — a different user can log into a different firm on the
        // same browser without a stale slug pinning them to the old one.
        if (isCloudClient()) removeStorage(STORAGE_KEYS.TENANT_SLUG);

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

        // Resolve the firm's license state BEFORE first paint so an unlicensed
        // tenant lands straight on the activation screen (no dashboard flash).
        await get().refreshLicenseState();

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
      requiresLicense: false,
    });

    removeStorage(STORAGE_KEYS.TOKEN);
    removeStorage(STORAGE_KEYS.USER);
    writeLicenseRequired(false);
    logger.info('Session expired, clearing stored authentication');
  });

  // Any command blocked by the per-tenant license gate (HTTP 402) flips the app
  // into the activation screen — a safety net for paths the broker hint missed.
  addLicenseRequiredListener(() => {
    writeLicenseRequired(true);
    useAuthStore.setState({ requiresLicense: true });
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
