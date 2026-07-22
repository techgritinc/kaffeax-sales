import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export type TagTone = 'owner' | 'due' | 'kaffea' | 'prospect';

export interface TagProps {
  tone: TagTone;
  children?: ReactNode;
  className?: string;
}

/**
 * Small pill covering the prototype's table/side tags:
 * `owner` (.kx-owner-pill 2094–2102), `due` (.kx-due-tag 2117–2125),
 * `kaffea`/`prospect` (.kx-side-tag.* 2107–2116).
 */
const TONE_CLASS: Record<TagTone, string> = {
  owner: 'gap-[6px] bg-midnight/[0.06] text-[11.5px] font-bold text-midnight',
  due: 'bg-mustard/[0.14] text-[11.5px] font-bold text-mustard',
  kaffea:
    'gap-[6px] bg-midnight/[0.08] text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-midnight',
  prospect:
    'gap-[6px] bg-green/[0.14] text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-green-deep',
};

export function Tag({ tone, children, className }: TagProps) {
  return (
    <span
      className={cn(
        'rounded-pill inline-flex items-center px-[10px] py-[3px] font-sans whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      {tone === 'owner' && (
        <span className="bg-green-deep h-[6px] w-[6px] flex-shrink-0 rounded-full" />
      )}
      {children}
    </span>
  );
}
