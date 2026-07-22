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
