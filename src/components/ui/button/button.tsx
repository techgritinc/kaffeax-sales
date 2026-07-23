import type { ButtonHTMLAttributes, JSX } from 'react';

import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/utils/cn';

type BoxVariant = 'primary' | 'approve' | 'reject' | 'send' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BoxVariant | 'link' | 'mini';
  size?: 'md' | 'sm';
  wide?: boolean;
  miniTone?: 'ghost' | 'primary';
  iconStart?: IconName;
  iconEnd?: IconName;
  iconSize?: number;
}

/** Shared box-button chrome (everything except geometry, which varies by size). */
const BASE = 'inline-flex items-center font-sans cursor-pointer transition';

const LOOK: Record<BoxVariant, string> = {
  primary:
    'bg-green text-white font-semibold uppercase shadow-btn hover:brightness-[0.92] hover:shadow-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-[0.55] disabled:shadow-none disabled:brightness-100 disabled:hover:shadow-none',
  approve:
    'bg-green-deep text-white font-semibold uppercase shadow-btn hover:brightness-[0.92] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:brightness-100 disabled:hover:brightness-100',
  reject: 'bg-white text-rust border-2 border-rust font-semibold uppercase hover:bg-rust-tint',
  send: 'bg-white text-midnight border border-midnight font-semibold uppercase hover:bg-page-bg',
  ghost:
    'bg-white text-midnight border border-border font-medium hover:bg-page-bg hover:border-border-strong',
};

const GEO_MD: Record<BoxVariant, string> = {
  primary: 'gap-[8px] px-[20px] py-[10px] text-[12.5px] tracking-[0.04em] rounded-btn',
  approve: 'gap-[8px] px-[20px] py-[10px] text-[12.5px] tracking-[0.04em] rounded-btn',
  reject: 'gap-[8px] px-[18px] py-[8px] text-[12.5px] tracking-[0.04em] rounded-btn',
  send: 'gap-[8px] px-[18px] py-[10px] text-[12px] tracking-[0.04em] rounded-btn',
  ghost: 'gap-[8px] px-[14px] py-[8px] text-[12px] rounded-btn',
};

const GEO_SM: Record<BoxVariant, string> = {
  primary:
    'gap-[5px] px-[10px] py-[6px] text-[10.5px] tracking-[0.02em] rounded-btn-sm whitespace-nowrap',
  approve:
    'gap-[5px] px-[10px] py-[6px] text-[10.5px] tracking-[0.02em] rounded-btn-sm whitespace-nowrap',
  reject:
    'gap-[5px] px-[10px] py-[4px] text-[10.5px] tracking-[0.02em] rounded-btn-sm whitespace-nowrap',
  send: 'gap-[5px] px-[10px] py-[6px] text-[10.5px] tracking-[0.02em] rounded-btn-sm whitespace-nowrap',
  ghost:
    'gap-[5px] px-[10px] py-[6px] text-[10.5px] tracking-[0.02em] rounded-btn-sm whitespace-nowrap',
};

const LINK =
  'inline-flex items-center cursor-pointer border-none bg-transparent p-0 font-sans text-[12px] font-semibold normal-case tracking-normal text-green-deep transition hover:text-green hover:underline';

const MINI_BASE =
  'inline-flex items-center gap-[5px] font-sans cursor-pointer uppercase transition text-[10.5px] font-bold tracking-[0.06em] px-[10px] py-[5px] rounded-btn-sm';
const MINI_TONE: Record<'ghost' | 'primary', string> = {
  ghost:
    'bg-transparent text-muted border border-transparent hover:text-midnight hover:bg-white hover:border-border',
  primary:
    'bg-green text-white border-none hover:brightness-[0.92] disabled:cursor-not-allowed disabled:opacity-50 disabled:brightness-100 disabled:hover:brightness-100',
};

function resolve(
  variant: BoxVariant | 'link' | 'mini',
  size: 'md' | 'sm',
  wide: boolean,
  miniTone: 'ghost' | 'primary',
): { classes: string; iconSize: number } {
  const wideClass = wide ? 'w-full justify-center' : undefined;
  if (variant === 'link') {
    return { classes: cn(LINK, wideClass), iconSize: 13 };
  }
  if (variant === 'mini') {
    return { classes: cn(MINI_BASE, MINI_TONE[miniTone], wideClass), iconSize: 12 };
  }
  const geo = size === 'sm' ? GEO_SM[variant] : GEO_MD[variant];
  return { classes: cn(BASE, geo, LOOK[variant], wideClass), iconSize: size === 'sm' ? 12 : 14 };
}

export function Button({
  variant = 'primary',
  size = 'md',
  wide = false,
  miniTone = 'ghost',
  iconStart,
  iconEnd,
  iconSize,
  className,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  const { classes, iconSize: derivedIconSize } = resolve(variant, size, wide, miniTone);
  const resolvedIconSize = iconSize ?? derivedIconSize;
  return (
    <button className={cn(classes, className)} {...rest}>
      {iconStart ? <Icon name={iconStart} size={resolvedIconSize} /> : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} size={resolvedIconSize} /> : null}
    </button>
  );
}
