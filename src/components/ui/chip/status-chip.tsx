import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export type StatusChipTone = 'draft' | 'saved';

export interface StatusChipProps {
  tone: StatusChipTone;
  children?: ReactNode;
  className?: string;
}

const TONE_CLASS: Record<StatusChipTone, string> = {
  draft: 'bg-mustard/[0.18] border-mustard/40 text-sidebar-status-draft-text',
  saved: 'bg-green/[0.18] border-green/[0.35] text-sidebar-status-saved-text',
};

/** Sidebar row status indicator — `.kx-side-status.*` (prototype 428–435). */
export function StatusChip({ tone, children, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-[3px] border px-1.5 py-0.5 font-sans text-[8.5px] font-extrabold tracking-[0.06em] uppercase',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
