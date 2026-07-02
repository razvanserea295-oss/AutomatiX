import type { ReactNode } from 'react';
import { CARD_SLOT_CLASS, type CardSlotSize } from './cardSizes';

export interface CardSlotProps {
  size: CardSlotSize;
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'aside';
}

/** Grid placement wrapper — applies standard col-span and equal-height stretch for Panel children. */
export default function CardSlot({
  size,
  children,
  className = '',
  as: Tag = 'div',
}: CardSlotProps) {
  return (
    <Tag className={`${CARD_SLOT_CLASS[size]} flex min-h-0 min-w-0 flex-col lg:min-h-0 lg:h-full ${className}`}>
      {children}
    </Tag>
  );
}
