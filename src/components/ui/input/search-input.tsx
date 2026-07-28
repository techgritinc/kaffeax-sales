import type { InputHTMLAttributes, JSX } from 'react';

import { Icon } from '@/components/ui/icon/icon';
import { cn } from '@/lib/utils/cn';

export type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

const BASE =
  'w-full rounded-input border border-white/[0.14] bg-white/[0.06] py-2 pr-3 pl-8 text-[12px] text-sidebar-text-strong outline-none placeholder:text-sidebar-muted';

export function SearchInput({ className, ...rest }: SearchInputProps): JSX.Element {
  return (
    <div className="relative">
      <Icon
        name="Search"
        size={14}
        className="text-sidebar-muted pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
      />
      <input type="text" className={cn(BASE, className)} {...rest} />
    </div>
  );
}
