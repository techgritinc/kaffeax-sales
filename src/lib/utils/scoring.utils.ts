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
    };
    if (signal.hints.length > 0) {
      simplified.hints = signal.hints;
    }
    return simplified;
  });
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
