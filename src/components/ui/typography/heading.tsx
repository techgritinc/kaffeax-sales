import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface HeadingProps {
  level: 1 | 2;
  sm?: boolean;
  smallLabel?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Display headings — `.kx-h1` (prototype 499–505, `sm` → 28px), `.kx-h2`
 * (1469–1473), and the mustard label treatment `.kx-h2-sm` (1476–1483).
 */
export function Heading({
  level,
  sm = false,
  smallLabel = false,
  children,
  className,
}: HeadingProps) {
  if (level === 1) {
    return (
      <h1
        className={cn(
          'font-display text-midnight leading-[1.1] font-black tracking-[-0.03em]',
          sm ? 'text-[28px]' : 'text-[32px]',
          className,
        )}
      >
        {children}
      </h1>
    );
  }

  if (smallLabel) {
    return (
      <h2
        className={cn(
          'text-mustard mb-2 font-sans text-[11px] font-extrabold tracking-[0.14em] uppercase',
          className,
        )}
      >
        {children}
      </h2>
    );
  }

  return (
    <h2
      className={cn(
        'font-display text-midnight text-[22px] font-bold tracking-[-0.01em]',
        className,
      )}
    >
      {children}
    </h2>
  );
}
