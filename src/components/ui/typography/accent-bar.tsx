import { cn } from '@/lib/utils/cn';

export interface AccentBarProps {
  variant?: 'h1' | 'h2';
  context?: 'default' | 'captureHero';
  className?: string;
}

const VARIANT_CLASS: Record<'h1' | 'h2', string> = {
  h1: 'bg-midnight mt-3 mb-4 h-[10px] w-[112px]',
  h2: 'bg-bright-blue mt-2 mb-4 h-[6px] w-[72px]',
};

/** Capture-screen hero variant — `.kx-capture-hero .kx-accent-bar` (prototype 776, 834, 847): stays midnight, only shrinks with the viewport. */
const CAPTURE_HERO_CLASS =
  'bg-midnight my-[10px] h-[10px] w-[112px] max-bp900:h-2 max-bp900:w-24 max-bp560:my-2 max-bp560:h-[6px] max-bp560:w-[72px]';

/**
 * Decorative accent bar — `.kx-accent-bar`/`.kx-bar-h1` (prototype 506–510 /
 * 1393–1397) and the smaller bright-blue `.kx-bar-h2` (1398–1402).
 */
export function AccentBar({ variant = 'h1', context = 'default', className }: AccentBarProps) {
  return (
    <div
      className={cn(
        'rounded-tight',
        context === 'captureHero' ? CAPTURE_HERO_CLASS : VARIANT_CLASS[variant],
        className,
      )}
    />
  );
}
