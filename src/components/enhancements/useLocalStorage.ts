import { useCallback, useEffect, useState } from 'react';






export function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const read = (): T => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  };

  const [state, setState] = useState<T>(read);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setState(prev => {
      const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {  }
      return value;
    });
  }, [key]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try { setState(e.newValue == null ? initialValue : JSON.parse(e.newValue)); }
      catch {  }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, initialValue]);

  return [state, set];
}
