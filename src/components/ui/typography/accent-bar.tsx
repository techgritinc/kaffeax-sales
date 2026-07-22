import { cn } from '@/lib/utils/cn';

export interface AccentBarProps {
  variant?: 'h1' | 'h2';
  className?: string;
}

/**
 * Decorative accent bar — `.kx-accent-bar`/`.kx-bar-h1` (prototype 506–510 /
 * 1393–1397) and the smaller bright-blue `.kx-bar-h2` (1398–1402).
 */
export function AccentBar({ variant = 'h1', className }: AccentBarProps) {
  return (
    <div
      className={cn(
        'rounded-tight',
        variant === 'h2' ? 'bg-bright-blue h-[6px] w-[72px]' : 'bg-midnight h-[10px] w-[112px]',
        className,
      )}
    />
  );
}
