import { create } from 'zustand';

/**
 * Global "edit layout" toggle for in-page card positioning. One page-wide
 * switch drives every <CardGrid> on the current page (drag / resize / hide).
 * Reset to false on route change (see App.tsx) so you never land on a new page
 * already in edit mode.
 */
interface LayoutEditState {
  editMode: boolean;
  toggle: () => void;
  set: (v: boolean) => void;
}

export const useLayoutEditStore = create<LayoutEditState>((set) => ({
  editMode: false,
  toggle: () => set((s) => ({ editMode: !s.editMode })),
  set: (v) => set({ editMode: v }),
}));
