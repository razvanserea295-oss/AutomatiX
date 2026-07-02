import { create } from 'zustand';
import { STORAGE_KEYS, getStorageJson, setStorageJson } from '@/config/localStorage';

export interface ShellLayout {
  layoutPreset:  'standard' | 'compact' | 'spacious' | 'focus' | 'custom';
  navbarHeight:  'compact' | 'normal' | 'relaxed';
  statusBar:     'on' | 'off';
  titlebar:      'on' | 'off';
  heroMode:      'full' | 'compact' | 'hidden';
  /** Where each page's title + controls live: lifted into the top navbar, or a classic on-page header band. */
  pageHeader:    'navbar' | 'classic';
  toastPos:      'bottom-right' | 'top-right' | 'bottom-center';
  sectionGap:    'tight' | 'normal' | 'relaxed';
  cardShadow:    'none' | 'subtle' | 'normal' | 'dramatic';
  borderVis:     'hidden' | 'subtle' | 'normal';
  contentWidth:  'narrow' | 'normal' | 'full';
  cardRadius:    'sharp' | 'normal' | 'rounded';
  cardPadding:   'tight' | 'normal' | 'loose';
}

export type LayoutPresetKey = 'standard' | 'compact' | 'spacious' | 'focus';

// pageHeader is a standalone preference, not part of the visual presets — choosing
// a preset must not silently flip the user's classic/navbar choice.
type PresetValues = Omit<ShellLayout, 'layoutPreset' | 'pageHeader'>;

export const LAYOUT_PRESETS: Record<LayoutPresetKey, PresetValues> = {
  standard: {
    navbarHeight: 'normal',
    statusBar:    'on',
    titlebar:     'on',
    heroMode:     'full',
    toastPos:     'bottom-right',
    sectionGap:   'normal',
    cardShadow:   'normal',
    borderVis:    'normal',
    contentWidth: 'normal',
    cardRadius:   'normal',
    cardPadding:  'normal',
  },
  compact: {
    navbarHeight: 'compact',
    statusBar:    'off',
    titlebar:     'on',
    heroMode:     'compact',
    toastPos:     'bottom-right',
    sectionGap:   'tight',
    cardShadow:   'none',
    borderVis:    'subtle',
    contentWidth: 'normal',
    cardRadius:   'sharp',
    cardPadding:  'tight',
  },
  spacious: {
    navbarHeight: 'relaxed',
    statusBar:    'on',
    titlebar:     'on',
    heroMode:     'full',
    toastPos:     'bottom-right',
    sectionGap:   'relaxed',
    cardShadow:   'dramatic',
    borderVis:    'normal',
    contentWidth: 'normal',
    cardRadius:   'rounded',
    cardPadding:  'loose',
  },
  focus: {
    navbarHeight: 'compact',
    statusBar:    'off',
    titlebar:     'off',
    heroMode:     'hidden',
    toastPos:     'top-right',
    sectionGap:   'tight',
    cardShadow:   'none',
    borderVis:    'hidden',
    contentWidth: 'full',
    cardRadius:   'sharp',
    cardPadding:  'tight',
  },
};

const DEFAULTS: ShellLayout = {
  layoutPreset: 'standard',
  pageHeader: 'navbar',
  ...LAYOUT_PRESETS.standard,
};

export function readPersistedShellLayout(): ShellLayout {
  const saved = getStorageJson<Partial<ShellLayout>>(STORAGE_KEYS.SHELL_LAYOUT);
  return { ...DEFAULTS, ...(saved ?? {}) };
}

export function applyShellLayout(l: ShellLayout): void {
  if (typeof document === 'undefined') return;
  const d = document.documentElement.dataset;

  if (l.navbarHeight === 'normal') delete d.navbarH;
  else d.navbarH = l.navbarHeight;

  if (l.statusBar === 'on') delete d.statusBar;
  else d.statusBar = 'off';

  if (l.titlebar === 'on') delete d.titlebar;
  else d.titlebar = 'off';

  if (l.heroMode === 'full') delete d.hero;
  else d.hero = l.heroMode;

  if (l.pageHeader === 'navbar') delete d.pageHeader;
  else d.pageHeader = l.pageHeader;

  if (l.toastPos === 'bottom-right') delete d.toastPos;
  else d.toastPos = l.toastPos;

  if (l.sectionGap === 'normal') delete d.sectionGap;
  else d.sectionGap = l.sectionGap;

  if (l.cardShadow === 'normal') delete d.cardShadow;
  else d.cardShadow = l.cardShadow;

  if (l.borderVis === 'normal') delete d.borderVis;
  else d.borderVis = l.borderVis;

  if (l.contentWidth === 'normal') delete d.contentWidth;
  else d.contentWidth = l.contentWidth;

  if (l.cardRadius === 'normal') delete d.cardRadius;
  else d.cardRadius = l.cardRadius;

  if (l.cardPadding === 'normal') delete d.cardPad;
  else d.cardPad = l.cardPadding;
}

interface ShellLayoutState {
  layout: ShellLayout;
  setLayout: (patch: Partial<Omit<ShellLayout, 'layoutPreset'>>) => void;
  setPreset: (preset: LayoutPresetKey) => void;
}

export const useShellLayoutStore = create<ShellLayoutState>((set) => ({
  layout: readPersistedShellLayout(),

  setLayout: (patch) => {
    set((prev) => {
      const next: ShellLayout = { ...prev.layout, ...patch, layoutPreset: 'custom' };
      setStorageJson(STORAGE_KEYS.SHELL_LAYOUT, next);
      applyShellLayout(next);
      return { layout: next };
    });
  },

  setPreset: (preset) => {
    set((prev) => {
      const next: ShellLayout = { ...prev.layout, ...LAYOUT_PRESETS[preset], layoutPreset: preset };
      setStorageJson(STORAGE_KEYS.SHELL_LAYOUT, next);
      applyShellLayout(next);
      return { layout: next };
    });
  },
}));
