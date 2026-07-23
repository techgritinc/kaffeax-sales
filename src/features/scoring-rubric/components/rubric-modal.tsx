'use client';

import { useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils/cn';
import type { Rubric, RubricSignal, Weight } from '@/types/rubric.types';

import { SignalCard } from './signal-card';
import { SignalComposer } from './signal-composer';

export interface RubricModalProps {
  open: boolean;
  rubric: Rubric;
  onClose: () => void;
  onAddSignal: (label: string, weight: Weight) => void;
  onUpdateSignal: (id: string, patch: Partial<RubricSignal>) => void;
  onRemoveSignal: (id: string) => void;
}

const BANDS: { weight: Weight; label: string; bar: string; text: string; rule: string }[] = [
  {
    weight: 'hot',
    label: 'Hot',
    bar: 'bg-green-deep',
    text: 'text-green-deep',
    rule: '≥1 HOT signal AND a next step agreed',
  },
  {
    weight: 'warm',
    label: 'Warm',
    bar: 'bg-mustard',
    text: 'text-mustard',
    rule: '≥1 WARM signal with no cold-overriding signal',
  },
  {
    weight: 'cold',
    label: 'Cold',
    bar: 'bg-dark-teal',
    text: 'text-dark-teal',
    rule: 'Nothing else fires',
  },
];

const PANEL_CLASS =
  'relative flex max-h-[calc(100vh-64px)] w-full max-w-[1080px] flex-col overflow-hidden rounded-card bg-white shadow-overlay';

/** Scoring-rubric editor: banding rules on the left, editable signals on the right. */
export function RubricModal({
  open,
  rubric,
  onClose,
  onAddSignal,
  onUpdateSignal,
  onRemoveSignal,
}: RubricModalProps) {
  const [addingSignal, setAddingSignal] = useState(false);

  return (
    <Modal open={open} onClose={onClose} className={PANEL_CLASS} labelledBy="rubric-title">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close scoring rubric"
        className="text-midnight bg-midnight/[0.06] hover:bg-midnight/[0.12] absolute top-[14px] right-[14px] inline-flex h-7 w-7 items-center justify-center rounded-full"
      >
        <Icon name="X" size={16} />
      </button>

      <div className="border-border-warm from-cream-50 shrink-0 border-b bg-linear-to-b to-white p-[16px_18px_12px]">
        <div
          id="rubric-title"
          className="text-mustard mb-0.5 font-sans text-[11px] font-extrabold tracking-[0.14em] uppercase"
        >
          Scoring rubric
        </div>
      </div>

      <div className="max-bp900:grid-cols-1 grid grid-cols-[280px_1fr] overflow-hidden">
        <aside className="border-border-warm from-cream-50 to-cream-25 max-bp900:border-r-0 max-bp900:border-b flex flex-col overflow-y-auto border-r bg-linear-to-b p-[20px_22px]">
          <div className="text-muted mb-3 font-sans text-[10px] font-extrabold tracking-[0.12em] uppercase">
            Banding rule
          </div>
          <div className="flex flex-col gap-2.5">
            {BANDS.map((band) => (
              <div
                key={band.weight}
                className="border-border rounded-btn relative overflow-hidden border bg-white p-[12px_14px]"
              >
                <span className={cn('absolute top-0 bottom-0 left-0 w-[3px]', band.bar)} />
                <span
                  className={cn(
                    'mb-0.5 block text-[11px] font-extrabold tracking-[0.12em] uppercase',
                    band.text,
                  )}
                >
                  {band.label}
                </span>
                <span className="text-muted block text-[12px] leading-[1.35]">{band.rule}</span>
              </div>
            ))}
          </div>
          <div className="border-border-warm text-muted mt-4 border-t border-dashed pt-4 text-[11.5px] leading-[1.55]">
            <b className="text-midnight font-bold">How scoring works.</b> Every signal you list on
            the right is scanned in the transcript. Weights (
            <b className="text-midnight font-bold">HOT</b>,{' '}
            <b className="text-midnight font-bold">WARM</b>,{' '}
            <b className="text-midnight font-bold">COLD</b>) decide the band via the rule above.
            Changes are live — the next transcript uses the updated rubric with no deploy.
          </div>
        </aside>

        <div className="flex min-h-0 flex-col overflow-y-auto p-[20px_24px_22px]">
          <div className="mb-[10px] flex items-center justify-between gap-3">
            <div>
              <span className="text-midnight font-sans text-[10px] font-extrabold tracking-[0.12em] uppercase">
                Signals
              </span>
              <span className="text-muted font-sans text-[10px] font-semibold">
                {' · '}
                {rubric.signals.length} tracked
              </span>
            </div>
            {!addingSignal && (
              <button
                type="button"
                onClick={() => setAddingSignal(true)}
                className="rounded-btn-sm bg-green shadow-add-signal hover:shadow-add-signal-hover inline-flex shrink-0 items-center gap-1.5 px-3.5 py-[7px] font-sans text-[11.5px] font-bold tracking-[0.04em] text-white uppercase transition hover:brightness-[0.94]"
              >
                <Icon name="Plus" size={12} /> Add signal
              </button>
            )}
          </div>
          <div className="max-bp900:grid-cols-1 grid [grid-auto-flow:row_dense] grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2">
            {rubric.signals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onLabelChange={(label) => onUpdateSignal(signal.id, { label })}
                onWeightChange={(weight) => onUpdateSignal(signal.id, { weight })}
                onRemove={() => onRemoveSignal(signal.id)}
              />
            ))}
            {addingSignal && (
              <SignalComposer
                onAdd={(label, weight) => {
                  onAddSignal(label, weight);
                  setAddingSignal(false);
                }}
                onCancel={() => setAddingSignal(false)}
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
