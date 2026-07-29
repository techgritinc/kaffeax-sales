import type { Band, BandConfig } from '@/types/rubric.types';

/** Canonical band ordering — mirrors the prototype's BAND lookup used by scoring/normalization. */
export const BAND_ORDER: readonly Band[] = ['hot', 'warm', 'cold'];

/** Uppercase display label per band (badge / meta text). */
export const BAND_LABEL: Record<Band, string> = {
  hot: 'HOT',
  warm: 'WARM',
  cold: 'COLD',
};

/** Numeric scoring weight per band tier — drives percentage-based lead scoring. */
export const WEIGHT_NUMERIC_VALUE: Record<Band, number> = {
  hot: 3,
  warm: 2,
  cold: 1,
};

/** Rubric summary banding rule. */
export const RUBRIC_BANDING_RULE =
  '≥1 HOT signal AND a next step agreed → hot. ≥1 WARM signal and no cold-overriding signal → warm. Otherwise → cold.';

/** Deep accent text color per band — heard-grid titles, rubric config, dot hover glow. */
export const BAND_TEXT_COLOR: Record<Band, string> = {
  hot: 'text-green-deep',
  warm: 'text-mustard',
  cold: 'text-dark-teal',
};

/** Deep accent background color per band — rubric config bar. */
export const BAND_BG_COLOR: Record<Band, string> = {
  hot: 'bg-green-deep',
  warm: 'bg-mustard',
  cold: 'bg-dark-teal',
};

/** Deep accent top-border color per band — heard-grid column headers. */
export const BAND_BORDER_TOP_COLOR: Record<Band, string> = {
  hot: 'border-t-green-deep',
  warm: 'border-t-mustard',
  cold: 'border-t-dark-teal',
};

/** Active-segment classes per band — weight segmented control. */
export const BAND_ACTIVE_SEGMENT_CLASS: Record<Band, string> = {
  hot: 'bg-green-deep text-white',
  warm: 'bg-mustard text-white',
  cold: 'bg-dark-teal text-white',
};

/** Sidebar status-dot classes per band (uses the lighter accent, not the deep variant). */
export const BAND_SIDEBAR_DOT_CLASS: Record<Band, string> = {
  hot: 'bg-green text-green',
  warm: 'bg-mustard text-mustard',
  cold: 'bg-dark-teal text-dark-teal',
};

/** Rubric banding configuration used for scoring display and editor rules. */
export const RUBRIC_BANDS_CONFIG: BandConfig[] = [
  {
    weight: 'hot',
    label: 'Hot',
    bar: BAND_BG_COLOR.hot,
    text: BAND_TEXT_COLOR.hot,
    rule: '≥1 HOT signal AND a next step agreed',
  },
  {
    weight: 'warm',
    label: 'Warm',
    bar: BAND_BG_COLOR.warm,
    text: BAND_TEXT_COLOR.warm,
    rule: '≥1 WARM signal with no cold-overriding signal',
  },
  {
    weight: 'cold',
    label: 'Cold',
    bar: BAND_BG_COLOR.cold,
    text: BAND_TEXT_COLOR.cold,
    rule: 'Nothing else fires',
  },
];
