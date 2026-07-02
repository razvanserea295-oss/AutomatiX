import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface PageHeaderActionsState {
  actions: ReactNode;
  secondaryActions: ReactNode;
  /** Page toolbar / tabs / filters, lifted into the top navbar. */
  toolbar: ReactNode;
}

interface PageHeaderActionsContextValue {
  state: PageHeaderActionsState;
  setActions: (actions: ReactNode, secondaryActions?: ReactNode, toolbar?: ReactNode) => void;
  clearActions: () => void;
}

const EMPTY_STATE: PageHeaderActionsState = {
  actions: null,
  secondaryActions: null,
  toolbar: null,
};

const PageHeaderActionsContext = createContext<PageHeaderActionsContextValue | null>(null);

export function PageHeaderActionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageHeaderActionsState>(EMPTY_STATE);

  const setActions = useCallback((actions: ReactNode, secondaryActions?: ReactNode, toolbar?: ReactNode) => {
    setState((prev) => {
      const nextSecondary = secondaryActions ?? null;
      const nextToolbar = toolbar ?? null;
      if (
        prev.actions === actions
        && prev.secondaryActions === nextSecondary
        && prev.toolbar === nextToolbar
      ) return prev;
      return { actions, secondaryActions: nextSecondary, toolbar: nextToolbar };
    });
  }, []);

  const clearActions = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  const value = useMemo(
    () => ({ state, setActions, clearActions }),
    [state, setActions, clearActions],
  );

  return (
    <PageHeaderActionsContext.Provider value={value}>
      {children}
    </PageHeaderActionsContext.Provider>
  );
}

export function usePageHeaderActions(): PageHeaderActionsContextValue {
  const ctx = useContext(PageHeaderActionsContext);
  if (!ctx) {
    throw new Error('usePageHeaderActions must be used within PageHeaderActionsProvider');
  }
  return ctx;
}

export function usePageHeaderActionsOptional(): PageHeaderActionsContextValue | null {
  return useContext(PageHeaderActionsContext);
}

export function usePageHeaderActionsState(): PageHeaderActionsState {
  const ctx = useContext(PageHeaderActionsContext);
  return ctx?.state ?? EMPTY_STATE;
}
