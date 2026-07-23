import { cn } from '@/lib/utils/cn';

export interface ShimmerProps {
  className?: string;
}

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
