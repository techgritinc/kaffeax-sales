'use client';

import { useState } from 'react';

import { WeightSegmentedControl } from '@/components/ui/segmented-control/weight-segmented-control';
import { NEW_SIGNAL_DEFAULT_WEIGHT } from '@/constants/workflow';
import { cn } from '@/lib/utils/cn';
import type { Weight } from '@/types/rubric.types';

export interface SignalComposerProps {
  onAdd: (label: string, weight: Weight) => void;
  onCancel: () => void;
}

const LEFT_BORDER_BY_WEIGHT: Record<Weight, string> = {
  hot: 'border-l-green-deep',
  warm: 'border-l-mustard',
  cold: 'border-l-dark-teal',
};

const INPUT_CLASS =
  'w-full border-none bg-transparent px-0 pt-0.5 pb-1 font-sans text-[12.5px] leading-[1.4] font-semibold text-midnight outline-none placeholder:text-muted placeholder:font-medium focus:shadow-[inset_0_-1px_0_var(--green)]';

const MINI_BASE =
  'rounded-btn-sm px-2.5 py-[5px] text-[10.5px] font-bold uppercase tracking-[0.06em] transition';
const MINI_GHOST =
  'text-muted border border-transparent hover:border-border hover:bg-white hover:text-midnight';
const MINI_PRIMARY =
  'border-none bg-green text-white disabled:opacity-50 hover:brightness-[0.92] disabled:hover:filter-none';

/** Inline card for composing a brand-new rubric signal. */
export function SignalComposer({ onAdd, onCancel }: SignalComposerProps) {
  const [label, setLabel] = useState('');
  const [weight, setWeight] = useState<Weight>(NEW_SIGNAL_DEFAULT_WEIGHT);

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd(trimmed, weight);
    setLabel('');
    setWeight(NEW_SIGNAL_DEFAULT_WEIGHT);
  };

  return (
    <div
      className={cn(
        'border-green rounded-btn bg-compose-bg shadow-compose border border-l-[3px] p-[10px_12px_8px]',
        LEFT_BORDER_BY_WEIGHT[weight],
      )}
    >
      <input
        autoFocus
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
          if (event.key === 'Escape') onCancel();
        }}
        className={INPUT_CLASS}
        placeholder="Describe the signal — e.g., 'Mentioned a competitor by name'"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <WeightSegmentedControl value={weight} onChange={setWeight} />
        <div className="inline-flex items-center gap-1.5">
          <button type="button" onClick={onCancel} className={cn(MINI_BASE, MINI_GHOST)}>
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!label.trim()}
            className={cn(MINI_BASE, MINI_PRIMARY)}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
