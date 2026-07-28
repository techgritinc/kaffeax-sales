import { cn } from '@/lib/utils/cn';
import type { Confidence } from '@/types/meeting.types';

export interface ConfDotProps {
  level: Confidence;
  className?: string;
}

const LEVEL_CLASS: Record<Confidence, string> = {
  high: 'bg-green-deep',
  medium: 'bg-mustard',
  low: 'bg-rust',
};

/** 8px confidence dot — `.kx-conf-dot` + `.kx-conf-*` (prototype 1593–1599). */
export function ConfDot({ level, className }: ConfDotProps) {
  return (
    <span className={cn('inline-block h-2 w-2 rounded-full', LEVEL_CLASS[level], className)} />
  );
}
