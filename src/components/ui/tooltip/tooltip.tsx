import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className="rounded-input bg-midnight font-display shadow-evidence pointer-events-none invisible absolute bottom-[calc(100%+8px)] left-0 z-20 max-w-[320px] min-w-[220px] px-3 py-[10px] text-[13px] leading-[1.5] text-white italic opacity-0 transition group-hover:visible group-hover:opacity-100"
      >
        {content}
        <span className="border-t-midnight absolute top-full left-[18px] border-[6px] border-transparent" />
      </span>
    </span>
  );
}
