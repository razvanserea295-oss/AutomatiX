/**
 * Automatix motion system — JS/TS helpers
 * Mirrors motion/tokens.css. Use with Framer Motion or inline styles.
 */

import type { Transition } from 'framer-motion';

/** Duration scale in seconds (Framer Motion convention) */
export const DURATION = {
  instant: 0.08,
  snappy: 0.15,
  responsive: 0.28,
  deliberate: 0.42,
  cinematic: 0.6,
  pageOut: 0.18,
  pageIn: 0.28,
  modalBackdrop: 0.22,
  modalPanelIn: 0.28,
  modalPanelOut: 0.2,
  dropdownIn: 0.16,
  dropdownOut: 0.12,
  toastOut: 0.2,
  drawerOut: 0.26,
  tooltipDelay: 0.12,
  tooltipIn: 0.14,
  tooltipOut: 0.08,
  commandIn: 0.32,
  commandOut: 0.2,
  buttonHover: 0.12,
  buttonActive: 0.08,
  buttonRelease: 0.2,
  navColor: 0.15,
  tabOut: 0.12,
  tabIn: 0.2,
  spin: 1,
  spinSlow: 3,
} as const;

/** Legacy alias — v2 consumers */
export const MOTION = {
  instant: DURATION.instant,
  fast: DURATION.snappy,
  ui: DURATION.responsive,
  enter: DURATION.deliberate,
  page: DURATION.deliberate,
  ambient: DURATION.spinSlow,
} as const;

export const EASE = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  inExpo: [0.7, 0, 0.84, 0] as const,
  inOutExpo: [0.87, 0, 0.13, 1] as const,
  /** @deprecated use outExpo */
  out: [0.16, 1, 0.3, 1] as const,
  /** @deprecated use inExpo */
  in: [0.7, 0, 0.84, 0] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
};

/** Stagger interval presets in seconds */
export const STAGGER_INTERVAL = {
  xs: 0.03,
  sm: 0.05,
  md: 0.08,
  lg: 0.12,
  dropdown: 0.02,
} as const;

/** Legacy stagger aliases */
export const STAGGER = {
  kpi: STAGGER_INTERVAL.md,
  row: STAGGER_INTERVAL.xs,
  dialog: STAGGER_INTERVAL.dropdown,
} as const;

export const MIN_SKELETON_MS = 200;

/** Framer Motion spring configs — match CSS token documentation */
export const SPRING = {
  soft: { type: 'spring' as const, stiffness: 280, damping: 28, mass: 1 },
  bounce: { type: 'spring' as const, stiffness: 400, damping: 20, mass: 0.8 },
  snappy: { type: 'spring' as const, stiffness: 600, damping: 35, mass: 0.9 },
  nav: { type: 'spring' as const, stiffness: 380, damping: 30, mass: 1 },
} satisfies Record<string, Transition>;

/**
 * Dynamic list stagger delay. Index is 0-based.
 * Caps multiplier at 9 per design spec.
 */
export function getStaggerDelay(index: number, intervalMs: number): string {
  return `${Math.min(index, 9) * intervalMs}ms`;
}

/** Framer Motion staggerChildren helper */
export function getStaggerChildren(intervalMs: number, maxIndex = 9) {
  return {
    staggerChildren: intervalMs / 1000,
    delayChildren: 0,
    staggerDirection: 1 as const,
    // Cap handled per-child via custom variant or getStaggerDelay
    _maxIndex: maxIndex,
  };
}

/** Page transition sequence: out duration before in starts */
export const PAGE_TRANSITION_SEQUENCE_MS =
  DURATION.pageOut * 1000 + DURATION.pageIn * 1000;

/** Measure accordion content height for JS-driven height animation */
export function measureAccordionHeight(element: HTMLElement): number {
  const prev = element.style.height;
  element.style.height = 'auto';
  const height = element.scrollHeight;
  element.style.height = prev;
  return height;
}

/** Preset motion variants for common overlays */
export const motionPresets = {
  modal: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: DURATION.modalBackdrop, ease: EASE.outExpo } },
      exit: { opacity: 0, transition: { duration: DURATION.modalPanelOut, ease: EASE.inExpo } },
    },
    panel: {
      initial: { opacity: 0, scale: 0.94 },
      animate: { opacity: 1, scale: 1, transition: SPRING.soft },
      exit: { opacity: 0, scale: 0.94, transition: { duration: DURATION.modalPanelOut, ease: EASE.inExpo } },
    },
  },
  dropdown: {
    initial: { opacity: 0, scaleY: 0.9 },
    animate: { opacity: 1, scaleY: 1, transition: { duration: DURATION.dropdownIn, ease: EASE.outExpo } },
    exit: { opacity: 0, scaleY: 0.9, transition: { duration: DURATION.dropdownOut, ease: EASE.inExpo } },
  },
  toast: {
    initial: { opacity: 0, x: 32 },
    animate: { opacity: 1, x: 0, transition: SPRING.snappy },
    exit: { opacity: 0, x: 20, transition: { duration: DURATION.toastOut, ease: EASE.inExpo } },
  },
  drawer: {
    initial: { x: '100%' },
    animate: { x: 0, transition: SPRING.soft },
    exit: { x: '100%', transition: { duration: DURATION.drawerOut, ease: EASE.inExpo } },
  },
  command: {
    initial: { opacity: 0, scale: 0.5 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: DURATION.commandIn, ease: EASE.spring },
    },
    exit: { opacity: 0, scale: 0.96, transition: { duration: DURATION.commandOut, ease: EASE.inExpo } },
  },
  tab: {
    initial: { opacity: 0, x: 8 },
    animate: { opacity: 1, x: 0, transition: { duration: DURATION.tabIn, ease: EASE.outExpo } },
    exit: { opacity: 0, x: -8, transition: { duration: DURATION.tabOut, ease: EASE.inExpo } },
  },
  page: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: DURATION.pageIn, ease: EASE.outExpo } },
    exit: { opacity: 0, y: -6, transition: { duration: DURATION.pageOut, ease: EASE.inExpo } },
  },
} as const;
