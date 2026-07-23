import type { Band } from '@/types/rubric.types';

/** Uppercase display label per band (badge / meta text). */
export const BAND_LABEL: Record<Band, string> = {
  hot: 'HOT',
  warm: 'WARM',
  cold: 'COLD',
};

/** Fixed demo score shown out of 100, keyed by band. */
export const SCORE_BY_BAND: Record<Band, number> = {
  hot: 93,
  warm: 68,
  cold: 34,
};

/** Total the score is presented against. */
export const SCORE_TOTAL = 100;

/** Rubric summary banding rule. */
export const RUBRIC_BANDING_RULE =
  '≥1 HOT signal AND a next step agreed → hot. ≥1 WARM signal and no cold-overriding signal → warm. Otherwise → cold.';

export interface BandConfig {
  weight: Band;
  label: string;
  bar: string;
  text: string;
  rule: string;
}

/** Rubric banding configuration used for scoring display and editor rules. */
export const RUBRIC_BANDS_CONFIG: BandConfig[] = [
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
