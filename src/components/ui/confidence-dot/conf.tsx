import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils/cn';
import type { Confidence } from '@/types/meeting.types';

import { ConfDot } from './confidence-dot';

export interface ConfProps {
  level: Confidence;
  className?: string;
}

const TEXT_CLASS: Record<Confidence, string> = {
  high: 'text-green-deep',
  medium: 'text-mustard',
  low: 'text-rust',
};

/** Confidence label with dot — `Conf` (prototype 2795–2808); low adds AlertTriangle. */
export function Conf({ level, className }: ConfProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[4px] font-sans text-[10px] font-bold tracking-[0.4px] uppercase',
        TEXT_CLASS[level],
        className,
      )}
    >
      <ConfDot level={level} />
      {level === 'low' && <Icon name="AlertTriangle" size={11} />}
      {level}
    </span>
  );
}
