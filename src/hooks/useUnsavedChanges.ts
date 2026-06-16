import { useState, useCallback, useEffect } from 'react';
import { confirmDialog } from '@/components/ConfirmDialog';








export function useUnsavedChanges() {
  const [isDirty, setDirtyState] = useState(false);

  const setDirty = useCallback((dirty = true) => {
    setDirtyState(dirty);
  }, []);

  const markClean = useCallback(() => {
    setDirtyState(false);
  }, []);

  const confirmDiscard = useCallback(async (): Promise<boolean> => {
    if (!isDirty) return true;
    return confirmDialog({
      title: 'Modificări nesalvate',
      body: 'Ai modificări nesalvate. Sigur vrei să părăsești pagina?',
      confirmLabel: 'Renunță la modificări',
      cancelLabel: 'Continuă editarea',
      danger: true,
    });
  }, [isDirty]);

  
  
  
  
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return { isDirty, setDirty, markClean, confirmDiscard };
}
