import type { JSX } from 'react';

import { ICON_PATHS, type IconName } from './icon-paths';

export type { IconName };

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Inline-SVG icon (24×24 viewBox, stroke = currentColor). Color via a `text-*` class. */
export function Icon({ name, size = 16, className }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
