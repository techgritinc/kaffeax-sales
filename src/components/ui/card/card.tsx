import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  navy?: boolean;
}

/** Surface card — `.kx-card` (prototype 518–528), with a navy variant. */
export function Card({ navy = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card p-[16px]',
        navy ? 'bg-midnight text-white' : 'border-border-warm bg-card-bg shadow-card border',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
