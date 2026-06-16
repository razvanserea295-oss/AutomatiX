import { useEffect, useRef, useCallback } from 'react';
import { useToastStore } from '@/store/toastStore';
import { isServerMode } from '@/config/server';









export interface AutoSyncOptions {
  interval?: number; 
  retryDelay?: number; 
  maxRetries?: number; 
  onSync?: () => Promise<void>; 
  onError?: (error: Error) => void; 
  onSuccess?: () => void; 
  enabled?: boolean; 
}

export function useAutoSync({
  interval: explicitInterval,
  retryDelay = 10000,
  maxRetries = 3,
  onSync,
  onError,
  onSuccess,
  enabled = true,
}: AutoSyncOptions) {
  
  const interval = explicitInterval ?? (isServerMode() ? 5000 : 30000);
  const toastStore = useToastStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const lastSyncRef = useRef<number>(0);

  const performSync = useCallback(async () => {
    if (!onSync) return;

    try {
      await onSync();
      retryCountRef.current = 0;
      lastSyncRef.current = Date.now();
      onSuccess?.();

      
      toastStore.addToast({
        type: 'info',
        message: 'Date actualizate',
        duration: 2000,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      retryCountRef.current += 1;

      if (retryCountRef.current <= maxRetries) {
        
        setTimeout(() => {
          performSync();
        }, retryDelay);
      } else {
        
        onError?.(err);
        toastStore.addToast({
          type: 'error',
          message: 'Eroare la sincronizare. Reîncercați mai târziu.',
          duration: 5000,
        });
      }
    }
  }, [onSync, onSuccess, onError, toastStore, retryDelay, maxRetries]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    
    performSync();

    
    intervalRef.current = setInterval(() => {
      performSync();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, performSync]);

  const manualSync = useCallback(() => {
    retryCountRef.current = 0;
    performSync();
  }, [performSync]);

  return {
    sync: manualSync,
    lastSync: lastSyncRef.current,
  };
}
