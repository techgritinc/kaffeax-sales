/** Lead band — the three-tier scoring outcome, also used as a signal weight. */
export type Band = 'hot' | 'warm' | 'cold';

/** A rubric signal's weight uses the same three tiers as the band. */
export type Weight = Band;

/** Where a signal originates: confirmed by the client, or proposed by Kaffea-X. */
export type SignalSource = 'client' | 'proposed';

/** A single scoring signal the rubric looks for in a transcript. */
export interface RubricSignal {
  id: string;
  label: string;
  weight: Weight;
  source: SignalSource;
  hints: string[];
}

/** The full scoring rubric: an ordered list of signals plus the banding rule. */
export interface Rubric {
  signals: RubricSignal[];
  banding: string;
}

/** Rubric banding configuration entry used for scoring display and editor rules. */
export interface BandConfig {
  weight: Band;
  label: string;
  bar: string;
  text: string;
  rule: string;
}
