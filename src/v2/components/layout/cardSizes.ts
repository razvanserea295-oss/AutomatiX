/** Standard card slot sizes on the 12-column page grid. */
export type CardSlotSize = 'xs' | 'sm' | 'md' | 'lg' | 'half' | 'xl';

/** xs = 2/12 — narrow rails (email folders) */
/** sm = 3/12 (25%) — compact widgets, narrow side panels */
/** md = 4/12 (33%) — detail sidebar, secondary content */
/** lg = 8/12 (66%) — primary table/list (master in master-detail) */
/** half = 6/12 (50%) — equal split columns */
/** xl = 12/12 (100%) — full-width table/list/form band */

export const CARD_SLOT_COL_SPAN: Record<CardSlotSize, string> = {
  xs: 'lg:col-span-2 xl:col-span-2',
  sm: 'lg:col-span-3 xl:col-span-3',
  md: 'lg:col-span-4 xl:col-span-4',
  lg: 'lg:col-span-8 xl:col-span-8',
  half: 'lg:col-span-6 xl:col-span-6',
  xl: 'lg:col-span-12 xl:col-span-12',
};

export const CARD_SLOT_CLASS: Record<CardSlotSize, string> = {
  xs: `card-slot card-slot-xs ${CARD_SLOT_COL_SPAN.xs}`,
  sm: `card-slot card-slot-sm ${CARD_SLOT_COL_SPAN.sm}`,
  md: `card-slot card-slot-md ${CARD_SLOT_COL_SPAN.md}`,
  lg: `card-slot card-slot-lg ${CARD_SLOT_COL_SPAN.lg}`,
  half: `card-slot card-slot-half ${CARD_SLOT_COL_SPAN.half}`,
  xl: `card-slot card-slot-xl ${CARD_SLOT_COL_SPAN.xl}`,
};

/** Complementary pair for master-detail rows (lg ↔ md). */
export function getComplementarySize(size: CardSlotSize): CardSlotSize {
  switch (size) {
    case 'lg':
      return 'md';
    case 'md':
      return 'lg';
    case 'sm':
      return 'xl';
    case 'xl':
      return 'sm';
    case 'xs':
      return 'half';
    case 'half':
      return 'xs';
    default: {
      const _exhaustive: never = size;
      return _exhaustive;
    }
  }
}
