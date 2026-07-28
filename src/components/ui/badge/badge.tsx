import type { ReactNode } from 'react';

import { BAND_LABEL } from '@/constants/bands';
import { cn } from '@/lib/utils/cn';
import type { Band } from '@/types/rubric.types';

export interface BadgeProps {
  band: Band;
  children?: ReactNode;
  className?: string;
}

const BAND_CLASS: Record<Band, string> = {
  hot: 'bg-green text-white',
  warm: 'bg-mustard text-white',
  cold: 'bg-dark-teal text-cream',
};

/** Uppercase band badge — `.kx-badge` (prototype 632–641). */
export function Badge({ band, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'rounded-pill inline-flex items-center gap-[5px] px-3 py-1 font-sans text-[11px] font-extrabold tracking-[0.06em] uppercase',
        BAND_CLASS[band],
        className,
      )}
    >
      {children ?? BAND_LABEL[band]}
    </span>
  );
}
