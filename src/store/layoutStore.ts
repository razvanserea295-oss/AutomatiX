import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { debounce } from '@/lib/debounce';
import { applyDensity, readPersistedDensity, type UiDensity } from '@/lib/density';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';
export type Density = UiDensity;
export type SidebarVariant = 'enterprise' | 'contrast';
/** Primary navigation surface. Alternatives to the left sidebar are admin-only. */
export type NavLayout = 'sidebar' | 'launchpad' | 'radial';

interface LayoutState {
  sidebarCollapsed: boolean;
  sidebarVariant: SidebarVariant;
  navLayout: NavLayout;
  navbarCollapsed: boolean;
  breakpoint: Breakpoint;
  density: Density;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarVariant: (variant: SidebarVariant) => void;
  setNavLayout: (layout: NavLayout) => void;
  toggleNavbar: () => void;
  setBreakpoint: (breakpoint: Breakpoint) => void;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarVariant: 'enterprise',
      navLayout: 'sidebar',
      navbarCollapsed: false,
      breakpoint: 'desktop',
      density: readPersistedDensity(),
      commandPaletteOpen: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setNavLayout: (layout) => set({ navLayout: layout }),

      toggleNavbar: () =>
        set((state) => ({ navbarCollapsed: !state.navbarCollapsed, sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),

      setSidebarVariant: (variant) =>
        set({ sidebarVariant: variant }),

      setBreakpoint: (breakpoint) =>
        set({ breakpoint }),

      setDensity: (density) => {
        set({ density });
        applyDensity(density);
      },

      toggleDensity: () =>
        set((state) => {
          const next: Density =
            state.density === 'comfortable' ? 'compact' : state.density === 'compact' ? 'dense' : 'comfortable';
          applyDensity(next);
          return { density: next };
        }),

      openCommandPalette: () =>
        set({ commandPaletteOpen: true }),

      closeCommandPalette: () =>
        set({ commandPaletteOpen: false }),
    }),
    {
      name: 'promix-layout-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarVariant: state.sidebarVariant,
        navLayout: state.navLayout,
        navbarCollapsed: state.navbarCollapsed,
        density: state.density,
      }),
    }
  )
);

export function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function useBreakpointDetection() {
  const setBreakpoint = useLayoutStore((state) => state.setBreakpoint);

  if (typeof window !== 'undefined') {
    setBreakpoint(getBreakpoint());

    
    
    const handleResize = debounce(() => {
      setBreakpoint(getBreakpoint());
    }, 100);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }
}
