import { RUBRIC_BANDING_RULE } from '@/constants/bands';
import type { RubricSignalFields } from '@/types/rubric-signal.types';
import type { Rubric, RubricSignal } from '@/types/rubric.types';

/** Compose the view-model `Rubric` from persisted signals + the constant banding rule. */
export function toRubric(signals: RubricSignalFields[]): Rubric {
  return {
    signals: signals.map((s): RubricSignal => ({
      id: s.signalId,
      label: s.label,
      weight: s.weight,
      source: s.source,
      hints: s.hints,
    })),
    banding: RUBRIC_BANDING_RULE,
  };
}

/** Decompose a single view-model signal into a persisted `RubricSignalFields`. */
export function toRubricSignalFields(signal: RubricSignal): RubricSignalFields {
  return {
    signalId: signal.id,
    label: signal.label,
    weight: signal.weight,
    source: signal.source,
    hints: signal.hints,
    isActive: true,
  };
}

/** Decompose a full `Rubric` into persisted signals (banding rule is not persisted per-signal). */
export function toRubricSignals(rubric: Rubric): RubricSignalFields[] {
  return rubric.signals.map(toRubricSignalFields);
}
