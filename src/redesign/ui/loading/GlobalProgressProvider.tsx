import type { ReactNode } from 'react';
import GlobalProgressBar from './GlobalProgressBar';
import { progressBarStore } from './progressBarStore';

export interface GlobalProgressApi {
  start: () => void;
  inc: (n?: number) => void;
  done: () => void;
  error: () => void;
}

/** Context-free hook — wraps `progressBarStore` (same API as provider). */
export function useGlobalProgress(): GlobalProgressApi {
  return {
    start: () => progressBarStore.start(),
    inc: (n = 8) => progressBarStore.inc(n),
    done: () => progressBarStore.done(),
    error: () => progressBarStore.error(),
  };
}

export interface GlobalProgressProviderProps {
  children: ReactNode;
}

/** Mounts viewport progress bar; state lives in `progressBarStore`. */
export default function GlobalProgressProvider({ children }: GlobalProgressProviderProps) {
  return (
    <>
      {children}
      <GlobalProgressBar />
    </>
  );
}
