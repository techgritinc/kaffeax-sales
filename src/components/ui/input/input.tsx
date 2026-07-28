import type { InputHTMLAttributes, JSX } from 'react';

import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  warn?: boolean;
}

const BASE =
  'w-full rounded-input border px-[10px] py-[8px] text-[12px] text-text outline-none transition-colors';

export function Input({ warn = false, className, ...rest }: InputProps): JSX.Element {
  return (
    <input
      className={cn(
        BASE,
        warn ? 'border-rust bg-input-warn-bg' : 'border-border-warm focus:border-green bg-white',
        className,
      )}
      {...rest}
    />
  );
}
