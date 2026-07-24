import type { InputHTMLAttributes, JSX } from 'react';

import { cn } from '@/lib/utils/cn';

export interface InlineInputProps extends InputHTMLAttributes<HTMLInputElement> {
  warn?: boolean;
}

/** Dashed-underline inline field — transparent, borderless except the bottom rule. */
const BASE =
  'min-w-[120px] border-b border-dashed bg-transparent px-[2px] py-[1px] font-sans text-[13px] text-midnight outline-none transition-colors placeholder:italic placeholder:text-border-strong';

export function InlineInput({ warn = false, className, ...rest }: InlineInputProps): JSX.Element {
  return (
    <input
      className={cn(
        BASE,
        warn ? 'border-rust' : 'border-border-strong focus:border-green',
        className,
      )}
      {...rest}
    />
  );
}
