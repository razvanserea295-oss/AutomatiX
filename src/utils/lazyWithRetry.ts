import { lazy, LazyExoticComponent, ComponentType } from 'react';

export function lazyWithRetry<T extends { default: ComponentType<any> }>(
  factory: () => Promise<T>,
  retries = 2,
  delayMs = 100,
): LazyExoticComponent<ComponentType<any>> {
  return lazy(() => retry(factory, retries, delayMs));
}

async function retry<T>(factory: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  try {
    return await factory();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return retry(factory, retries - 1, delayMs * 2);
  }
}
