





import '@testing-library/jest-dom';






const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();
  const api = {
    get length() { return store.size; },
    clear() { store.clear(); },
    getItem(key: string) { return store.has(key) ? store.get(key)! : null; },
    setItem(key: string, value: string) { store.set(key, String(value)); },
    removeItem(key: string) { store.delete(key); },
    key(i: number) { return Array.from(store.keys())[i] ?? null; },
  };
  return new Proxy(api as unknown as Storage, {
    ownKeys: () => Array.from(store.keys()),
    getOwnPropertyDescriptor: (_target, prop) => {
      if (typeof prop === 'string' && store.has(prop)) {
        return { enumerable: true, configurable: true, writable: true, value: store.get(prop) };
      }
      return undefined;
    },
    get: (target, prop, receiver) => {
      if (typeof prop === 'string' && store.has(prop) && !(prop in target)) return store.get(prop);
      return Reflect.get(target, prop, receiver);
    },
    set: (target, prop, value) => {
      if (typeof prop === 'string' && !(prop in target)) { store.set(prop, String(value)); return true; }
      return Reflect.set(target, prop, value);
    },
    has: (target, prop) => (typeof prop === 'string' && store.has(prop)) || prop in target,
    deleteProperty: (target, prop) => {
      if (typeof prop === 'string' && store.has(prop)) { store.delete(prop); return true; }
      return Reflect.deleteProperty(target, prop);
    },
  });
};

const installStorage = (name: 'localStorage' | 'sessionStorage') => {
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, name, { value: storage, configurable: true, writable: true });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, name, { value: storage, configurable: true, writable: true });
  }
};

installStorage('localStorage');
installStorage('sessionStorage');
