import type {
  RubricSignalFields,
  SignalWeight,
  SimplifiedSignal,
} from '@/types/rubric-signal.types';
import type { DetectedSignal, LeadScoreBand } from '@/types/transcript.types';

export function simplifySignals(signals: RubricSignalFields[]): SimplifiedSignal[] {
  return signals.map((signal) => {
    const simplified: SimplifiedSignal = {
      id: signal.signalId,
      label: signal.label,
      tier: signal.weight,
      numericWeight: signal.numericWeight,
    };
    if (signal.hints.length > 0) {
      simplified.hints = signal.hints;
    }
    return simplified;
  });
}

export function computeScorePercentage(
  detectedSignals: DetectedSignal[],
  inputSignals: SimplifiedSignal[],
): number {
  const weightMap = new Map<string, number>(inputSignals.map((s) => [s.id, s.numericWeight]));
  const totalPossible = inputSignals.reduce((sum, s) => sum + s.numericWeight, 0);
  if (totalPossible === 0) return 0;
  const detectedPoints = detectedSignals.reduce((sum, ds) => sum + (weightMap.get(ds.id) ?? 0), 0);
  return Math.min(100, Math.max(0, Math.round((detectedPoints / totalPossible) * 100)));
}

export function determineBand(
  detectedSignals: DetectedSignal[],
  inputSignals: SimplifiedSignal[],
): LeadScoreBand {
  const tierMap = new Map<string, SignalWeight>(inputSignals.map((s) => [s.id, s.tier]));

  let hasHot = false;
  let hasWarm = false;

  for (const signal of detectedSignals) {
    const tier = tierMap.get(signal.id);
    if (tier === 'hot') hasHot = true;
    else if (tier === 'warm') hasWarm = true;
  }

  if (hasHot) return 'hot';
  if (hasWarm) return 'warm';
  return 'cold';
}
