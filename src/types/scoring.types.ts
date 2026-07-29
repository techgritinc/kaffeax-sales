import type { Band, Weight } from './rubric.types';

/** A signal detected in a transcript, with the snippet of evidence that fired it. */
export interface DetectedSignal {
  id: string;
  label: string;
  weight: Weight;
  evidence: string;
}

/** The computed lead score attached to a meeting record. */
export interface LeadScore {
  band: Band;
  detectedSignals: DetectedSignal[];
  rationale: string;
  scorePercentage: number;
}
