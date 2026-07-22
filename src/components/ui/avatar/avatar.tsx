import Image from 'next/image';

import { cn } from '@/lib/utils/cn';

export type AvatarTone = 'green' | 'midnight' | 'green-deep';

export interface AvatarProps {
  variant: 'initials' | 'image';
  initials?: string;
  src?: string;
  alt?: string;
  tone?: AvatarTone;
  size?: number;
  className?: string;
}

/** Box dimensions for the prototype's fixed avatar sizes (36px / 32px). */
const SIZE_CLASS: Record<number, string> = {
  32: 'h-8 w-8',
  36: 'h-9 w-9',
};

/** Background + text scale per tone: green→header (13px), others→attendee (12px). */
const TONE_CLASS: Record<AvatarTone, string> = {
  green: 'bg-green text-[13px]',
  midnight: 'bg-midnight text-[12px]',
  'green-deep': 'bg-green-deep text-[12px]',
};

/**
 * Header (.kx-header-avatar 78–85), attendee (.kx-attendee-avatar 1798–1806)
 * and chat (.kx-chat-avatar 707–714) avatars.
 */
export function Avatar({
  variant,
  initials,
  src,
  alt = '',
  tone = 'green',
  size = 36,
  className,
}: AvatarProps) {
  const boxClass = SIZE_CLASS[size] ?? SIZE_CLASS[36];

  if (variant === 'image') {
    return (
      <span
        className={cn(
          'inline-block flex-shrink-0 overflow-hidden rounded-full bg-white',
          boxClass,
          className,
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            className="block h-full w-full object-cover"
          />
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center justify-center rounded-full font-sans font-extrabold text-white',
        boxClass,
        TONE_CLASS[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}
