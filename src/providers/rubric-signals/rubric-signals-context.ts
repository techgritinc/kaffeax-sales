import { createContext, useContext } from 'react';

import type { BandConfig, RubricSignal, Weight } from '@/types/rubric.types';

/** Input for adding a new rubric signal — id/source are assigned by the provider. */
export interface NewSignalInput {
  label: string;
  weight: Weight;
}

/** The shared rubric-signals state and its mutators. */
export interface RubricSignalsContextValue {
  signals: RubricSignal[];
  banding: BandConfig[];
  addSignal: (input: NewSignalInput) => Promise<void>;
  updateSignal: (id: string, patch: Partial<RubricSignal>) => Promise<void>;
  removeSignal: (id: string) => Promise<void>;
}

/** The rubric-signals context — `null` until a `RubricSignalsProvider` supplies a value. */
export const RubricSignalsContext = createContext<RubricSignalsContextValue | null>(null);

/** Access the shared rubric-signals state; throws when used outside the provider. */
export function useRubricSignals(): RubricSignalsContextValue {
  const ctx = useContext(RubricSignalsContext);
  if (ctx === null) {
    throw new Error('useRubricSignals must be used within a RubricSignalsProvider');
  }
  return ctx;
}
