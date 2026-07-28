import type { JSX, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean;
}

const BASE =
  'w-full resize-y rounded-btn border border-border-warm bg-white p-[12px] text-text outline-none transition-colors focus:border-green';

export function Textarea({ mono = false, className, ...rest }: TextareaProps): JSX.Element {
  return (
    <textarea
      className={cn(
        BASE,
        mono ? 'font-mono text-[11.5px] leading-[1.5]' : 'font-sans text-[12px] leading-[1.55]',
        className,
      )}
      {...rest}
    />
  );
}
