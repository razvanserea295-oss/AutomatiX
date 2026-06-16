




export const STORAGE_KEYS = {
  
  TOKEN: 'promix_token',
  
  
  USER: 'promix_user',
  
  
  THEME: 'promix_theme',
  
  
  LAST_PAGE: 'promix_last_page',
  
  
  PREFERENCES: 'promix_preferences',
  
  
  NOTIFICATION_SETTINGS: 'promix_notification_settings',

  
  SERVER_URL: 'promix_server_url',

  
  AI_SERVICE_URL: 'promix_ai_url',

  
  AI_SERVICE_TOKEN: 'promix_ai_token',

  
  REMEMBER_USERNAME: 'promix_remember_user',

  
  REMEMBER_ME: 'promix_remember_me',

  // Multi-tenant: which firm (path prefix /t/<slug>) the browser talks to.
  TENANT_SLUG: 'promix_tenant_slug',
} as const;






export function getStorage(key: string): string {
  return localStorage.getItem(key) || '';
}






export function getStorageJson<T>(key: string): T | null {
  const value = localStorage.getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}






export function setStorage(key: string, value: string): void {
  localStorage.setItem(key, value);
}






export function setStorageJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}






export function removeStorage(key: string): void {
  localStorage.removeItem(key);
}




export function clearAllStorage(): void {
  // Keep TENANT_SLUG across logout so the user returns to their firm's login
  // (not the chooser). It's cleared explicitly via "Schimbă firma".
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    if (name !== 'TENANT_SLUG') removeStorage(key);
  });
}
