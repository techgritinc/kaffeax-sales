import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';
import type { Band } from '@/types/rubric.types';

export interface BandDotProps {
  band: Band;
  children?: ReactNode;
  className?: string;
}

const BAND_CLASS: Record<Band, string> = {
  hot: 'bg-green-deep',
  warm: 'bg-mustard',
  cold: 'bg-dark-teal',
};

/** 28px band medallion — `.kx-band-dot` (prototype 1424–1434). */
export function BandDot({ band, children, className }: BandDotProps) {
  return (
    <span
      className={cn(
        'font-display inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white',
        BAND_CLASS[band],
        className,
      )}
    >
      {children}
    </span>
  );
}
