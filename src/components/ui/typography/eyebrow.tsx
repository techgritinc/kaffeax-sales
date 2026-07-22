import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface EyebrowProps {
  inline?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Mustard uppercase eyebrow label — `.kx-eyebrow` (prototype 492–498) with the
 * tighter-margin `.kx-eyebrow-inline` variant (1462–1468).
 */
export function Eyebrow({ inline = false, children, className }: EyebrowProps) {
  return (
    <div
      className={cn(
        'text-mustard font-sans text-[11px] font-extrabold tracking-[0.14em] uppercase',
        inline ? 'mb-1' : 'mb-[10px]',
        className,
      )}
    >
      {children}
    </div>
  );
}
