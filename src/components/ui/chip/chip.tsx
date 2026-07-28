import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface ChipProps {
  children?: ReactNode;
  className?: string;
}

/** Neutral signal chip — `.kx-chip` (prototype 644–652). */
export function Chip({ children, className }: ChipProps) {
  return (
    <span
      className={cn(
        'rounded-pill border-tan bg-chip-bg text-midnight inline-flex items-center border px-3 py-[5px] font-sans text-[11px] font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}
