import { create } from 'zustand';
import type { ComponentType, ReactNode } from 'react';

// Narrative Visualization — "clean on the surface, detailed underneath".
// Any widget can call openDrawer({...}) to slide in a right-hand context panel
// with the granular story (breakdown, causes, recommended action, source)
// WITHOUT a page reload. One global instance lives in <App/>.

export interface DrawerSection {
  id: string;
  label: string;
  body: ReactNode;
  /** optional one-line helper shown under the section label (the "?" story). */
  hint?: string;
}

export interface DrawerAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: ComponentType<{ className?: string }>;
}

export interface DrawerPayload {
  title: string;
  subtitle?: string;
  icon?: ComponentType<{ className?: string }>;
  /** semantic accent: 'green' | 'red' | 'amber' | 'blue' | 'teal' | 'purple' | 'accent' */
  accent?: 'green' | 'red' | 'amber' | 'blue' | 'teal' | 'purple' | 'accent';
  /** big headline value (e.g. the metric the user clicked). */
  headline?: ReactNode;
  headlineHint?: string;
  sections: DrawerSection[];
  actions?: DrawerAction[];
  /** provenance line — where this data comes from (builds trust). */
  source?: string;
}

interface ContextDrawerState {
  open: boolean;
  payload: DrawerPayload | null;
  openDrawer: (p: DrawerPayload) => void;
  close: () => void;
}

export const useContextDrawerStore = create<ContextDrawerState>((set) => ({
  open: false,
  payload: null,
  openDrawer: (payload) => set({ open: true, payload }),
  close: () => set({ open: false }),
}));

export const openContextDrawer = (p: DrawerPayload): void => useContextDrawerStore.getState().openDrawer(p);
