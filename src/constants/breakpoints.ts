export const BREAKPOINTS = {
  bp400: 400,
  bp560: 560,
  bp640: 640,
  bp720: 720,
  bp900: 900,
  bp1100: 1100,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
