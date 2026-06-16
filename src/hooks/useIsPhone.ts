import { useEffect, useState, useCallback } from 'react';











export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isPhone;
}

const STORAGE_KEY = 'promix_force_desktop_v1';
















let cached: boolean | null = null;
const subscribers = new Set<() => void>();

function readForceDesktop(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') return false;
  try { cached = window.localStorage.getItem(STORAGE_KEY) === '1'; }
  catch { cached = false; }
  return cached;
}

function writeForceDesktop(value: boolean): void {
  cached = value;
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0'); }
    catch {  }
  }
  
  
  subscribers.forEach(fn => fn());
}








export function useDesktopOverride(): readonly [boolean, () => void] {
  
  
  
  const [, force] = useState(0);
  const forceDesktop = readForceDesktop();

  useEffect(() => {
    const cb = () => force(v => v + 1);
    subscribers.add(cb);
    return () => { subscribers.delete(cb); };
  }, []);

  const toggle = useCallback(() => {
    writeForceDesktop(!readForceDesktop());
  }, []);

  
  
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      cached = e.newValue === '1';
      subscribers.forEach(fn => fn());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return [forceDesktop, toggle] as const;
}






export const PHONE_ALLOWED_PAGES: ReadonlySet<string> = new Set([
  'dashboard',
  'manager-control',
  'tasks',
  'calendar',
  'deplasari',
]);





export function isPagePhoneReachable(pageId: string, isPhone: boolean, forceDesktop: boolean): boolean {
  if (!isPhone) return true;
  if (forceDesktop) return true;
  return PHONE_ALLOWED_PAGES.has(pageId);
}
