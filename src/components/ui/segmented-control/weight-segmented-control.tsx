import type { JSX } from 'react';

import { BAND_ACTIVE_SEGMENT_CLASS } from '@/constants/bands';
import { cn } from '@/lib/utils/cn';
import type { Weight } from '@/types/rubric.types';

export interface WeightSegmentedControlProps {
  value: Weight;
  onChange: (weight: Weight) => void;
  className?: string;
}

const SEGMENTS: { weight: Weight; label: string; active: string }[] = [
  { weight: 'hot', label: 'HOT', active: BAND_ACTIVE_SEGMENT_CLASS.hot },
  { weight: 'warm', label: 'WARM', active: BAND_ACTIVE_SEGMENT_CLASS.warm },
  { weight: 'cold', label: 'COLD', active: BAND_ACTIVE_SEGMENT_CLASS.cold },
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
