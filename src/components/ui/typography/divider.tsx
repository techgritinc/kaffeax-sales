import { cn } from '@/lib/utils/cn';

export interface DividerProps {
  className?: string;
}

/** Horizontal rule — `.kx-divider` (prototype 763). */
export function Divider({ className }: DividerProps) {
  return <div className={cn('border-border-warm my-3 border-t', className)} />;
}
