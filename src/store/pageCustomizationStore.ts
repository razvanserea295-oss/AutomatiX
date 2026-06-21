import { create } from 'zustand';
import { STORAGE_KEYS, getStorageJson, setStorageJson } from '@/config/localStorage';

/**
 * Per-page APPEARANCE overrides. Each field is optional — when absent, the page
 * inherits the global shell-layout preset. Keyed by the resolved page id
 * (App.tsx `pathToPageId(location)` → the same string passed as `routeKey`).
 * Only one page is mounted at a time, so the active page's overrides live on
 * <html> as data-pc-* attributes; CSS in src/redesign/index.css reacts to them.
 */
export interface PageCustom {
  cardRadius?:   'sharp' | 'normal' | 'rounded';
  cardPadding?:  'tight' | 'normal' | 'loose';
  cardHeight?:   'auto' | 'short' | 'tall';            // card min-height ("lungime carduri")
  cardShadow?:   'none' | 'subtle' | 'normal' | 'dramatic';
  cardBorder?:   'hidden' | 'subtle' | 'normal';
  cardBg?:       'solid' | 'transparent' | 'ghost' | 'glass';
  contentWidth?: 'narrow' | 'normal' | 'full';
  sectionGap?:   'tight' | 'normal' | 'relaxed';
  heroMode?:     'full' | 'compact' | 'hidden';
}

export type PageCustomMap = Record<string, PageCustom>;

/** All the keys, so the applier can iterate and reliably clear stale attrs. */
export const PAGE_CUSTOM_KEYS: (keyof PageCustom)[] = [
  'cardRadius', 'cardPadding', 'cardHeight', 'cardShadow', 'cardBorder',
  'cardBg', 'contentWidth', 'sectionGap', 'heroMode',
];

export function readPersistedPageCustom(): PageCustomMap {
  return getStorageJson<PageCustomMap>(STORAGE_KEYS.PAGE_CUSTOM) ?? {};
}

// Maps each PageCustom field to its <html> dataset key + the value treated as
// "default" (which clears the attr so the global preset shows through).
const ATTR: Record<keyof PageCustom, { ds: string; def: string }> = {
  cardRadius:   { ds: 'pcCardRadius',   def: 'normal' },
  cardPadding:  { ds: 'pcCardPad',      def: 'normal' },
  cardHeight:   { ds: 'pcCardHeight',   def: 'auto' },
  cardShadow:   { ds: 'pcCardShadow',   def: 'normal' },
  cardBorder:   { ds: 'pcCardBorder',   def: 'normal' },
  cardBg:       { ds: 'pcCardBg',       def: 'solid' },
  contentWidth: { ds: 'pcContentWidth', def: 'normal' },
  sectionGap:   { ds: 'pcSectionGap',   def: 'normal' },
  heroMode:     { ds: 'pcHero',         def: 'full' },
};

/**
 * Write the active page's overrides to <html> as data-pc-* attributes.
 * Deletes any attribute the page does NOT override (or that equals the default),
 * so navigating to a non-customized page leaves a clean root.
 */
export function applyPageCustomization(pageId: string, map?: PageCustomMap): void {
  if (typeof document === 'undefined') return;
  const pc = (map ?? readPersistedPageCustom())[pageId] ?? {};
  const d = document.documentElement.dataset;
  for (const key of PAGE_CUSTOM_KEYS) {
    const { ds, def } = ATTR[key];
    const val = pc[key];
    if (val == null || val === def) delete d[ds];
    else d[ds] = val;
  }
}

interface PageCustomState {
  pages: PageCustomMap;
  setPageCustom: (pageId: string, patch: Partial<PageCustom>) => void;
  resetPage: (pageId: string) => void;
  getPageCustom: (pageId: string) => PageCustom;
}

export const usePageCustomizationStore = create<PageCustomState>((set, get) => ({
  pages: readPersistedPageCustom(),

  setPageCustom: (pageId, patch) => {
    set((prev) => {
      const merged = { ...prev.pages[pageId], ...patch } as PageCustom;
      // Drop nullish keys so the stored object stays minimal.
      (Object.keys(merged) as (keyof PageCustom)[]).forEach((k) => {
        if (merged[k] == null) delete merged[k];
      });
      const pages = { ...prev.pages, [pageId]: merged };
      setStorageJson(STORAGE_KEYS.PAGE_CUSTOM, pages);
      applyPageCustomization(pageId, pages);
      return { pages };
    });
  },

  resetPage: (pageId) => {
    set((prev) => {
      const pages = { ...prev.pages };
      delete pages[pageId];
      setStorageJson(STORAGE_KEYS.PAGE_CUSTOM, pages);
      applyPageCustomization(pageId, pages); // clears all data-pc-* for this page
      return { pages };
    });
  },

  getPageCustom: (pageId) => get().pages[pageId] ?? {},
}));
