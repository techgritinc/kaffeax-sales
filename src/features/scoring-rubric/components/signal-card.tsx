import { Icon } from '@/components/ui/icon';
import { WeightSegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils/cn';
import type { RubricSignal, Weight } from '@/types/rubric.types';

export interface SignalCardProps {
  signal: RubricSignal;
  onLabelChange: (label: string) => void;
  onWeightChange: (weight: Weight) => void;
  onRemove: () => void;
}

const LEFT_BORDER_BY_WEIGHT: Record<Weight, string> = {
  hot: 'border-l-green-deep',
  warm: 'border-l-mustard',
  cold: 'border-l-dark-teal',
};

const INPUT_CLASS =
  'w-full border-none bg-transparent px-0 py-[2px_0_4px] font-sans text-[12.5px] leading-[1.4] font-semibold text-midnight outline-none placeholder:text-muted placeholder:font-medium focus:shadow-[inset_0_-1px_0_var(--green)]';

/** A single editable rubric signal row: label, weight picker, and remove control. */
export function SignalCard({ signal, onLabelChange, onWeightChange, onRemove }: SignalCardProps) {
  return (
    <div
      className={cn(
        'group border-border rounded-btn hover:shadow-signal-hover relative border border-l-[3px] bg-white p-[10px_12px_8px] transition-shadow',
        LEFT_BORDER_BY_WEIGHT[signal.weight],
      )}
    >
      <input
        value={signal.label}
        onChange={(event) => onLabelChange(event.target.value)}
        className={INPUT_CLASS}
        placeholder="Signal description"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <WeightSegmentedControl value={signal.weight} onChange={onWeightChange} />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove signal"
          title="Remove signal"
          className="text-muted rounded-input-sm hover:bg-rust-tint hover:text-rust inline-flex shrink-0 p-1 opacity-0 transition group-hover:opacity-85 hover:!opacity-100"
        >
          <Icon name="Trash2" size={14} />
        </button>
      </div>
    </div>
  );
}
