/**
 * Prototype responsive breakpoints (max-width stops), mirrored as the
 * `--breakpoint-bp*` tokens in globals.css so Tailwind `max-bp*:` variants
 * line up with these values. Exported for any JS-side width checks.
 */
export const BREAKPOINTS = {
  bp400: 400,
  bp560: 560,
  bp640: 640,
  bp720: 720,
  bp900: 900,
  bp1100: 1100,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
