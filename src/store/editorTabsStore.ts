import { create } from 'zustand';

// Open "editor" tabs for the VS Code shell (CodeShell). A tab is just a route
// path + a display title; the icon is resolved at render time from the workspace
// nav config so we never have to serialise a React component. The ACTIVE tab is
// derived from the current router location, not stored here — CodeShell calls
// `ensure()` on every navigation so the visited page always has a tab.
export interface EditorTab {
  path: string;   // wouter location, e.g. '/finance' or '/'
  title: string;  // label shown on the tab
}

const KEY = 'promix_code_tabs';

function read(): EditorTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as EditorTab[]) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => t && typeof t.path === 'string') : [];
  } catch { return []; }
}

function persist(tabs: EditorTab[]): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, JSON.stringify(tabs.slice(0, 24))); } catch { /* quota */ }
}

interface EditorTabsState {
  tabs: EditorTab[];
  /** Add a tab for this path if missing (called on every navigation). */
  ensure: (path: string, title: string) => void;
  /** Close a tab. Returns the path to navigate to next (neighbour), or null. */
  close: (path: string) => string | null;
  closeOthers: (path: string) => void;
  closeAll: () => void;
}

export const useEditorTabsStore = create<EditorTabsState>((set, get) => ({
  tabs: read(),

  ensure: (path, title) => {
    set((prev) => {
      const i = prev.tabs.findIndex((t) => t.path === path);
      let tabs: EditorTab[];
      if (i === -1) tabs = [...prev.tabs, { path, title }];
      else if (prev.tabs[i].title !== title) {
        tabs = prev.tabs.slice();
        tabs[i] = { path, title };
      } else return prev;
      persist(tabs);
      return { tabs };
    });
  },

  close: (path) => {
    const { tabs } = get();
    const i = tabs.findIndex((t) => t.path === path);
    if (i === -1) return null;
    const next = tabs.filter((t) => t.path !== path);
    persist(next);
    set({ tabs: next });
    if (next.length === 0) return '/';
    // Navigate to the neighbour (prefer the one to the left, VS Code-style).
    const neighbour = next[Math.min(i, next.length - 1)];
    return neighbour ? neighbour.path : '/';
  },

  closeOthers: (path) => {
    const keep = get().tabs.filter((t) => t.path === path);
    persist(keep);
    set({ tabs: keep });
  },

  closeAll: () => { persist([]); set({ tabs: [] }); },
}));
