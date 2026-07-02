import { createContext, useContext, type ReactNode } from 'react';

interface PageLocationContextValue {
  /** Shell titlebar already exposes the page title. */
  shellShowsPageTitle: boolean;
}

const PageLocationContext = createContext<PageLocationContextValue>({
  shellShowsPageTitle: false,
});

export function PageLocationProvider({
  shellShowsPageTitle,
  children,
}: {
  shellShowsPageTitle: boolean;
  children: ReactNode;
}) {
  return (
    <PageLocationContext.Provider value={{ shellShowsPageTitle }}>
      {children}
    </PageLocationContext.Provider>
  );
}

export function useShellShowsPageTitle(): boolean {
  return useContext(PageLocationContext).shellShowsPageTitle;
}
