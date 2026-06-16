import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { debounce } from '@/lib/debounce';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';
export type Density = 'comfortable' | 'compact';

interface LayoutState {
  sidebarCollapsed: boolean;
  breakpoint: Breakpoint;
  density: Density;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
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
      breakpoint: 'desktop',
      density: 'comfortable',
      commandPaletteOpen: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),

      setBreakpoint: (breakpoint) =>
        set({ breakpoint }),

      setDensity: (density) =>
        set({ density }),

      toggleDensity: () =>
        set((state) => ({ density: state.density === 'comfortable' ? 'compact' : 'comfortable' })),

      openCommandPalette: () =>
        set({ commandPaletteOpen: true }),

      closeCommandPalette: () =>
        set({ commandPaletteOpen: false }),
    }),
    {
      name: 'promix-layout-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
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
