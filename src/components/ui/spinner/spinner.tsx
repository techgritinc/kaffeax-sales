import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils/cn';

export interface SpinnerProps {
  size?: number;
  className?: string;
}

/** Spinning loader — `Loader2` icon with `.kx-spin` (prototype 2190–2191). */
export function Spinner({ size = 16, className }: SpinnerProps) {
  return <Icon name="Loader2" size={size} className={cn('animate-spin', className)} />;
}
