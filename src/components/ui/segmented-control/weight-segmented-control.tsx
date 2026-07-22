import type { JSX } from 'react';

import { cn } from '@/lib/utils/cn';
import type { Weight } from '@/types/rubric.types';

export interface WeightSegmentedControlProps {
  value: Weight;
  onChange: (weight: Weight) => void;
  className?: string;
}

const SEGMENTS: { weight: Weight; label: string; active: string }[] = [
  { weight: 'hot', label: 'HOT', active: 'bg-green-deep text-white' },
  { weight: 'warm', label: 'WARM', active: 'bg-mustard text-white' },
  { weight: 'cold', label: 'COLD', active: 'bg-dark-teal text-white' },
];

const BTN_BASE =
  'border-r border-border px-[10px] py-[4px] font-sans text-[10px] font-extrabold tracking-[0.08em] transition-colors last:border-r-0';
const BTN_INACTIVE = 'bg-transparent text-muted hover:bg-cream-25 hover:text-midnight';

export function WeightSegmentedControl({
  value,
  onChange,
  className,
}: WeightSegmentedControlProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-input border-border inline-flex overflow-hidden border bg-white',
        className,
      )}
    >
      {SEGMENTS.map((segment) => {
        const isActive = segment.weight === value;
        return (
          <button
            key={segment.weight}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(segment.weight)}
            className={cn(BTN_BASE, isActive ? segment.active : BTN_INACTIVE)}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
