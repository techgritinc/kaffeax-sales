import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/utils/cn';

export interface SectionTitleProps {
  icon?: IconName;
  children: ReactNode;
  className?: string;
}

/** Small mustard section heading — `.kx-section-title` (prototype 529–537). */
export function SectionTitle({ icon, children, className }: SectionTitleProps) {
  return (
    <div
      className={cn(
        'text-mustard flex items-center gap-2 font-sans text-[11px] font-extrabold tracking-[0.08em] uppercase',
        className,
      )}
    >
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </div>
  );
}
