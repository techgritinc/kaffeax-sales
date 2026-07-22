import { Fragment } from 'react';

import { cn } from '@/lib/utils/cn';

export interface BreadcrumbItem {
  key: string;
  label: string;
  active: boolean;
  disabled: boolean;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** Breadcrumb trail — `.kx-breadcrumb`/`.kx-crumb`/`.kx-crumb-sep` (prototype 116–141). */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      className={cn('text-muted inline-flex items-center gap-2 font-sans text-[14.5px]', className)}
    >
      {items.map((item, index) => (
        <Fragment key={item.key}>
          <button
            type="button"
            disabled={item.disabled}
            onClick={item.active || item.disabled ? undefined : item.onClick}
            className={cn(
              'bg-transparent p-0 py-[2px] font-sans text-[14.5px] tracking-[0.01em] transition-colors',
              item.active ? 'text-midnight cursor-default font-bold' : 'text-muted',
              item.disabled
                ? 'cursor-not-allowed opacity-50'
                : !item.active && 'hover:text-midnight cursor-pointer',
            )}
          >
            {item.label}
          </button>
          {index < items.length - 1 ? (
            <span className="text-border-strong text-[11px] select-none">›</span>
          ) : null}
        </Fragment>
      ))}
    </nav>
  );
}
