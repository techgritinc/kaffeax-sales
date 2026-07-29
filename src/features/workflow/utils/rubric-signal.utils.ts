import { CUSTOM_SIGNAL_ID_PREFIX } from '@/constants/workflow';
import type { RubricSignal } from '@/types/rubric.types';

export interface NewSignalParams {
  label: string;
  weight: RubricSignal['weight'];
}

export function buildCustomSignal(params: NewSignalParams): RubricSignal {
  return {
    id: `${CUSTOM_SIGNAL_ID_PREFIX}${Date.now()}`,
    label: params.label,
    weight: params.weight,
    source: 'proposed',
    hints: [],
  };
}
