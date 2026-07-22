import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';
import type { Band } from '@/types/rubric.types';

export interface SignalChipProps {
  band: Band;
  children?: ReactNode;
  className?: string;
}

const BAND_CLASS: Record<Band, string> = {
  hot: 'bg-rust/[0.14] text-rust',
  warm: 'bg-mustard/[0.14] text-mustard',
  cold: 'bg-midnight/[0.06] text-midnight',
};

/** Colored inline signal chip — `.kx-signal-chip.*` (prototype 1908–1917). */
export function SignalChip({ band, children, className }: SignalChipProps) {
  return (
    <span
      className={cn(
        'rounded-pill inline-flex items-center px-[10px] py-[3px] font-sans text-[11.5px] font-bold whitespace-nowrap',
        BAND_CLASS[band],
        className,
      )}
    >
      {children}
    </span>
  );
}
