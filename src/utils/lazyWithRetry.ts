import { lazy, LazyExoticComponent, ComponentType } from 'react';

const CHUNK_RELOAD_KEY = 'promix:chunk-reload-attempted';
let chunkReloadAttemptedInMemory = false;

export function lazyWithRetry<T extends { default: ComponentType<any> }>(
  factory: () => Promise<T>,
  retries = 2,
  delayMs = 100,
): LazyExoticComponent<ComponentType<any>> {
  return lazy(() => retry(factory, retries, delayMs));
}

function isDynamicImportChunkError(error: unknown): boolean {
  const parts: string[] = [];
  if (typeof error === 'string') parts.push(error);
  if (error instanceof Error) {
    parts.push(error.name);
    parts.push(error.message);
  }
  const text = parts.join(' ').toLowerCase();
  return (
    text.includes('failed to fetch dynamically imported module')
    || text.includes('importing a module script failed')
    || text.includes('error loading dynamically imported module')
    || text.includes('chunkloaderror')
    || text.includes('loading chunk')
  );
}

function shouldAttemptHardReload(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return false;
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    return true;
  } catch {
    if (chunkReloadAttemptedInMemory) return false;
    chunkReloadAttemptedInMemory = true;
    return true;
  }
}

function clearHardReloadMarker(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    chunkReloadAttemptedInMemory = false;
  }
}

async function retry<T>(factory: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  try {
    const loaded = await factory();
    clearHardReloadMarker();
    return loaded;
  } catch (error) {
    if (isDynamicImportChunkError(error) && shouldAttemptHardReload()) {
      window.location.reload();
      return new Promise<T>(() => {});
    }
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return retry(factory, retries - 1, delayMs * 2);
  }
}
