import { useState, useCallback, useRef, useEffect } from 'react';
import type { SaveState } from '@/components/ui/SaveButton';
import { toast } from '@/store/toastStore';

interface UseSaveActionOptions {
  onSuccess?: () => void;
  successMessage?: string;
  errorMessage?: string;
  revertDelay?: number;
}





export function useSaveAction(
  saveFn: () => Promise<void>,
  options: UseSaveActionOptions = {},
) {
  const {
    onSuccess,
    successMessage = 'Salvat cu succes',
    errorMessage = 'Eroare la salvare',
    revertDelay = 2500,
  } = options;

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const savingRef = useRef(false);
  const saveFnRef = useRef(saveFn);
  const onSuccessRef = useRef(onSuccess);
  saveFnRef.current = saveFn;
  onSuccessRef.current = onSuccess;

  
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;

    clearTimeout(timerRef.current);
    setSaveState('saving');
    setError(null);

    try {
      await saveFnRef.current();
      setSaveState('saved');
      toast.success(successMessage);
      onSuccessRef.current?.();
      timerRef.current = setTimeout(() => setSaveState('idle'), revertDelay);
    } catch (e) {
      const msg = e instanceof Error ? e.message : errorMessage;
      setSaveState('error');
      setError(msg);
      toast.error(msg);
      timerRef.current = setTimeout(() => setSaveState('idle'), 3000);
    } finally {
      savingRef.current = false;
    }
  }, [successMessage, errorMessage, revertDelay]);

  return { save, saveState, error };
}
