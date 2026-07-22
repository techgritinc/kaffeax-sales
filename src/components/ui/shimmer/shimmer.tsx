import { cn } from '@/lib/utils/cn';

export interface ShimmerProps {
  className?: string;
}

/**
 * Loading shimmer bar — `.kx-shimmer` (prototype 2175–2184). Width is supplied
 * through `className` (e.g. `w-[85%]`).
 */
export function Shimmer({ className }: ShimmerProps) {
  return (
    <div
      className={cn(
        'rounded-tight from-shimmer-a via-shimmer-b to-shimmer-a animate-shimmer h-2 bg-linear-to-r bg-[length:200%_100%]',
        className,
      )}
    />
  );
}
