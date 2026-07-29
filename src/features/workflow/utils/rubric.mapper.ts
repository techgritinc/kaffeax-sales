import { RUBRIC_BANDING_RULE, WEIGHT_NUMERIC_VALUE } from '@/constants/bands';
import type { RubricSignalFields, SimplifiedSignal } from '@/types/rubric-signal.types';
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
    numericWeight: WEIGHT_NUMERIC_VALUE[signal.weight],
    isActive: true,
  };
}

/** Decompose a full `Rubric` into persisted signals (banding rule is not persisted per-signal). */
export function toRubricSignals(rubric: Rubric): RubricSignalFields[] {
  return rubric.signals.map(toRubricSignalFields);
}

/** Project live view-model signals into the shape the AI summarizer expects. */
export function toSimplifiedSignals(signals: RubricSignal[]): SimplifiedSignal[] {
  return signals.map((s): SimplifiedSignal => {
    const simplified: SimplifiedSignal = {
      id: s.id,
      label: s.label,
      tier: s.weight,
      numericWeight: WEIGHT_NUMERIC_VALUE[s.weight],
    };
    if (s.hints.length > 0) {
      simplified.hints = s.hints;
    }
    return simplified;
  });
}
