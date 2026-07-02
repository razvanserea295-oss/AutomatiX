// Minimal, self-contained API client for the standalone manager portal.
// Deliberately independent of the app's heavy authStore / command pipeline:
// the portal logs in via the broker (/api/auth/login), remembers which tenant
// owns the user, and drives the existing per-tenant commands via /t/<slug>.

const TOKEN_KEY = 'automatix_mgr_token';
const SLUG_KEY = 'automatix_mgr_slug';
const USER_KEY = 'automatix_mgr_user';

export interface MgrUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role_id: number;
  role_name: string;
  must_change_password?: boolean;
}

export interface LoginOk { kind: 'ok'; user: MgrUser; slug: string }
export interface Login2FA { kind: '2fa'; challenge: string; slug: string }
export type LoginResult = LoginOk | Login2FA;

// Commands whose server handlers read args from `{ request: {...} }`.
const WRAP = new Set(['create_user', 'update_user', 'delete_user']);

let token = localStorage.getItem(TOKEN_KEY) || '';
let slug = localStorage.getItem(SLUG_KEY) || '';
let user: MgrUser | null = readUser();

function readUser(): MgrUser | null {
  try { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) as MgrUser : null; }
  catch { return null; }
}

function persist(): void {
  if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(SLUG_KEY, slug);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user)); else localStorage.removeItem(USER_KEY);
}

function base(): string {
  return slug ? `/t/${slug}` : '';
}

export function isAuthed(): boolean { return !!token; }
export function currentUser(): MgrUser | null { return user; }
export function currentSlug(): string { return slug; }

export function logout(): void {
  token = '';
  user = null;
  // keep slug hint cleared too
  slug = '';
  persist();
}

export class PortalError extends Error {
  code: number;
  constructor(message: string, code: number) { super(message); this.code = code; }
}

/** Authenticate against the broker; returns either a session or a 2FA challenge. */
export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PortalError(data?.message || 'Autentificare eșuată', res.status);
  }
  slug = data.tenant_slug || '';
  if (data.requires_2fa && data.challenge) {
    persist();
    return { kind: '2fa', challenge: data.challenge, slug };
  }
  token = data.token || '';
  user = (data.user || null) as MgrUser | null;
  persist();
  return { kind: 'ok', user: user as MgrUser, slug };
}

/** Complete a 2FA challenge started by login(). */
export async function verify2fa(challenge: string, code: string): Promise<LoginOk> {
  const data = await cmdRaw<{ token: string; user: MgrUser }>('login_verify_2fa', { challenge, code });
  token = data.token || '';
  user = (data.user || null) as MgrUser | null;
  persist();
  return { kind: 'ok', user: user as MgrUser, slug };
}

// Low-level command call that does NOT require an existing token header to be
// present (used for the 2FA step which carries its own challenge).
async function cmdRaw<T>(command: string, body?: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const payload = WRAP.has(command) ? { request: body ?? {} } : (body ?? {});
  const res = await fetch(`${base()}/api/cmd/${command}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ code: res.status, message: res.statusText }));
    throw new PortalError(err?.message || res.statusText, err?.code ?? res.status);
  }
  return res.json() as Promise<T>;
}

/** Authenticated command call scoped to the logged-in user's tenant. */
export async function cmd<T>(command: string, body?: Record<string, unknown>): Promise<T> {
  if (!token) throw new PortalError('Sesiune expirată', 401);
  return cmdRaw<T>(command, body);
}

export interface TenantInfo { slug: string; name: string }
export async function listTenants(): Promise<TenantInfo[]> {
  try {
    const res = await fetch('/api/tenants');
    if (!res.ok) return [];
    return (await res.json()) as TenantInfo[];
  } catch { return []; }
}

export interface TenantState { licensed: boolean; gate: boolean; company_name: string }
export async function tenantState(forSlug: string): Promise<TenantState | null> {
  try {
    const b = forSlug ? `/t/${forSlug}` : '';
    const res = await fetch(`${b}/api/license/tenant-state`);
    if (!res.ok) return null;
    return (await res.json()) as TenantState;
  } catch { return null; }
}
