'use client';

import { type ReactNode, useCallback, useState } from 'react';

import { RUBRIC_BANDS_CONFIG } from '@/constants/bands';
import {
  createRubricSignal,
  deleteRubricSignal,
  updateRubricSignal,
} from '@/features/workflow/actions/rubric.actions';
import { buildCustomSignal } from '@/features/workflow/utils/rubric-signal.utils';
import type { Rubric, RubricSignal } from '@/types/rubric.types';

import { type NewSignalInput, RubricSignalsContext } from './rubric-signals-context';

export interface RubricSignalsProviderProps {
  children: ReactNode;
  initialRubric: Rubric;
}

/** Owns the shared rubric-signal list and exposes it via {@link RubricSignalsContext}. */
export function RubricSignalsProvider({ children, initialRubric }: RubricSignalsProviderProps) {
  const [signals, setSignals] = useState<RubricSignal[]>(initialRubric.signals);

  const addSignal = useCallback(async (input: NewSignalInput) => {
    const signal: RubricSignal = buildCustomSignal(input);
    const rubric = await createRubricSignal(signal);
    setSignals(rubric.signals);
  }, []);

  const updateSignal = useCallback(async (id: string, patch: Partial<RubricSignal>) => {
    const rubric = await updateRubricSignal(id, patch);
    setSignals(rubric.signals);
  }, []);

  const removeSignal = useCallback(async (id: string) => {
    const rubric = await deleteRubricSignal(id);
    setSignals(rubric.signals);
  }, []);

  return (
    <RubricSignalsContext.Provider
      value={{ signals, banding: RUBRIC_BANDS_CONFIG, addSignal, updateSignal, removeSignal }}
    >
      {children}
    </RubricSignalsContext.Provider>
  );
}
